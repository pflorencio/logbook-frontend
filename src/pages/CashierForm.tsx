import React, { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import { fetchUniqueClosing, saveClosing } from "@/lib/api";
import { BACKEND_URL } from "@/lib/api";

console.log("🟢 Using backend URL:", BACKEND_URL);

interface FormState {
  date: string;
  totalSales: string | number;
  netSales: string | number;
  cashPayments: string | number;
  cardPayments: string | number;
  digitalPayments: string | number;
  grabPayments: string | number;
  voucherPayments: string | number;
  bankTransferPayments: string | number;
  marketingExpenses: string | number;
  kitchenBudget: string | number;
  barBudget: string | number;
  nonFoodBudget: string | number;
  staffMealBudget: string | number;
  actualCashCounted: string | number;
  cashFloat: string | number;
}

const numericFields: (keyof FormState)[] = [
  "totalSales",
  "netSales",
  "cashPayments",
  "cardPayments",
  "digitalPayments",
  "grabPayments",
  "voucherPayments",
  "bankTransferPayments",
  "marketingExpenses",
  "kitchenBudget",
  "barBudget",
  "nonFoodBudget",
  "staffMealBudget",
  "actualCashCounted",
  "cashFloat",
];

const CashierForm: React.FC = () => {
  console.log("🧾 CashierForm v9 (store_id stable) loaded");

  // ----------------------------------------------------
  // ⭐ SESSION — NEW SYSTEM
  // ----------------------------------------------------
  const session = JSON.parse(localStorage.getItem("session") || "{}");

  const userName: string = session.name || "Cashier";
  const storeId: string = session.storeId || null;
  const storeName: string = session.storeName || "Unknown Store";
  const submittedBy: string = userName;

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    date: "",
    totalSales: "",
    netSales: "",
    cashPayments: "",
    cardPayments: "",
    digitalPayments: "",
    grabPayments: "",
    voucherPayments: "",
    bankTransferPayments: "",
    marketingExpenses: "",
    kitchenBudget: "",
    barBudget: "",
    nonFoodBudget: "",
    staffMealBudget: "",
    actualCashCounted: "",
    cashFloat: "",
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [recordId, setRecordId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Manager unlock modal
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");

  const lastFetchAbort = useRef<AbortController | null>(null);

  const peso = (n: number | string): string =>
    isNaN(Number(n)) || n === "" ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;

  // ----------------------------------------------------
  // Computed fields
  // ----------------------------------------------------
  const variance = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const cash = Number(form.cashPayments) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - cash - floatAmt;
  }, [form]);

  const totalBudgets = useMemo(() => {
    const k = Number(form.kitchenBudget) || 0;
    const b = Number(form.barBudget) || 0;
    const n = Number(form.nonFoodBudget) || 0;
    const s = Number(form.staffMealBudget) || 0;
    return k + b + n + s;
  }, [form]);

  const rawCashForDeposit = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - floatAmt - totalBudgets;
  }, [form, totalBudgets]);

  const cashForDeposit = Math.max(0, rawCashForDeposit);
  const transferNeeded = rawCashForDeposit < 0 ? Math.abs(rawCashForDeposit) : 0;

  const isFormValid = numericFields.every((field) => {
    const v = form[field];
    return v !== "" && v !== null && v !== undefined;
  });

  // ----------------------------------------------------
  // Handle Input
  // ----------------------------------------------------
  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (formErrors[field]) {
      const next = { ...formErrors };
      delete next[field];
      setFormErrors(next);
    }
  };

  // ----------------------------------------------------
  // Map Airtable → Form fields
  // ----------------------------------------------------
  function mapFields(f: Record<string, any>): FormState {
    const safe = (key: string): any =>
      key in f ? f[key] : f[key?.trim?.()] || f[key?.replace?.(/_/g, " ")];

    return {
      date: safe("Date"),
      totalSales: safe("Total Sales") ?? "",
      netSales: safe("Net Sales") ?? "",
      cashPayments: safe("Cash Payments") ?? "",
      cardPayments: safe("Card Payments") ?? "",
      digitalPayments: safe("Digital Payments") ?? "",
      grabPayments: safe("Grab Payments") ?? "",
      voucherPayments: safe("Voucher Payments") ?? "",
      bankTransferPayments: safe("Bank Transfer Payments") ?? "",
      marketingExpenses:
        safe("Marketing Expenses") ||
        safe("Marketing Expense (recorded as sale)") ||
        "",
      kitchenBudget: safe("Kitchen Budget") ?? "",
      barBudget: safe("Bar Budget") ?? "",
      nonFoodBudget: safe("Non Food Budget") ?? "",
      staffMealBudget: safe("Staff Meal Budget") ?? "",
      actualCashCounted: safe("Actual Cash Counted") ?? "",
      cashFloat: safe("Cash Float") ?? "",
    };
  }

  // ----------------------------------------------------
  // FETCH EXISTING — now uses storeName (not storeId)
  // ----------------------------------------------------
  async function fetchExisting(showToast = false): Promise<void> {
    if (!selectedDate || !storeName) return;

    // Abort previous request if still running
    if (lastFetchAbort.current) lastFetchAbort.current.abort();
    const controller = new AbortController();
    lastFetchAbort.current = controller;

    setLoading(true);

    try {
      // ⭐ Corrected: Backend requires (date, storeName)
      const data = await fetchUniqueClosing(selectedDate, storeName);

      if (data.status === "empty") {
        setRecordId(null);
        setIsLocked(false);

        // Reset form for new entry
        setForm({
          ...form,
          date: selectedDate,
          totalSales: "",
          netSales: "",
          cashPayments: "",
          cardPayments: "",
          digitalPayments: "",
          grabPayments: "",
          voucherPayments: "",
          bankTransferPayments: "",
          marketingExpenses: "",
          kitchenBudget: "",
          barBudget: "",
          nonFoodBudget: "",
          staffMealBudget: "",
          actualCashCounted: "",
          cashFloat: "",
        });

        if (showToast) toast("No record found — starting fresh.");
        return;
      }

      // Existing record found
      setRecordId(data.id);

      const f = data.fields || {};
      const lockStatus = (f["Lock Status"] || "").trim();

      setIsLocked(lockStatus.toLowerCase() === "locked");

      // Map Airtable fields → form state
      setForm(mapFields(f));

      if (showToast) toast.success(`Record loaded (${lockStatus || "Unlocked"})`);

    } catch (err) {
      console.error("❌ fetchExisting error:", err);
      toast.error("Error fetching record.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-load whenever date or store changes
  useEffect(() => {
    if (selectedDate && storeName) {
      fetchExisting(true);
    }
  }, [selectedDate, storeName]);


  // ----------------------------------------------------
  // SAVE
  // ----------------------------------------------------
  const handleSave = async () => {
    if (!storeId) {
      toast.error("Missing store ID — please log in again.");
      return;
    }

    if (isLocked) {
      toast.error("This record is locked.");
      return;
    }

    const newErrors: Partial<Record<keyof FormState, string>> = {};
    numericFields.forEach((f) => {
      if (form[f] === "" || form[f] === null) newErrors[f] = "Required";
    });

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

    const isCreate = !recordId;

    if (isCreate) {
      const ok = window.confirm(
        "This will CREATE a new record and LOCK it. Continue?"
      );
      if (!ok) return;
    }

    try {
      setIsSaving(true);

      const payload = {
        business_date: selectedDate,
        store_id: storeId,
        store_name: storeName,

        total_sales: Number(form.totalSales),
        net_sales: Number(form.netSales),
        cash_payments: Number(form.cashPayments),
        card_payments: Number(form.cardPayments),
        digital_payments: Number(form.digitalPayments),
        grab_payments: Number(form.grabPayments),
        voucher_payments: Number(form.voucherPayments),
        bank_transfer_payments: Number(form.bankTransferPayments),
        marketing_expenses: Number(form.marketingExpenses),

        kitchen_budget: Number(form.kitchenBudget),
        bar_budget: Number(form.barBudget),
        non_food_budget: Number(form.nonFoodBudget),
        staff_meal_budget: Number(form.staffMealBudget),

        actual_cash_counted: Number(form.actualCashCounted),
        cash_float: Number(form.cashFloat),
        variance_cash: Number(variance),
        total_budgets: Number(totalBudgets),
        cash_for_deposit: Number(cashForDeposit),
        transfer_needed: Number(transferNeeded),

        submitted_by: submittedBy,
      };

      const data = await saveClosing(payload);

      toast.success(data.action === "created" ? "Record created!" : "Updated!");

      setIsLocked(String(data.lock_status).toLowerCase() === "locked");

      fetchExisting(false);
    } catch (err) {
      console.error(err);
      toast.error("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // ⭐ MANAGER UNLOCK ACTIONS (restored)
  // ----------------------------------------------------
  const openUnlockModal = () => {
    if (!recordId) {
      toast.error("No record to unlock.");
      return;
    }
    setManagerPin("");
    setShowUnlockModal(true);
  };

  const handleCancelUnlock = () => {
    setManagerPin("");
    setShowUnlockModal(false);
  };

  const handleConfirmUnlock = async () => {
    if (!recordId) return;
    if (!managerPin || managerPin.length !== 4) {
      toast.error("Enter 4-digit PIN");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/closings/${recordId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: managerPin }),
      });

      if (!res.ok) throw new Error("Unlock failed");

      toast.success("Unlocked!");
      setIsLocked(false);
      setShowUnlockModal(false);

      fetchExisting(true);
    } catch (err) {
      console.error(err);
      toast.error("Invalid PIN");
    }
  };

  // ----------------------------------------------------
  // UI helpers
  // ----------------------------------------------------
  const inputBase =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm";

  const inputDisabled =
    "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200";

  const sectionCard =
    "rounded-2xl bg-white shadow-md p-5 md:p-6 space-y-4 border border-gray-100";

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <Layout cashierName={userName} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#F5F5F7] px-3 py-4 md:px-6 md:py-8 flex justify-center">
        <Toaster position="top-center" />

        <div className="w-full max-w-3xl flex flex-col">
          {/* Header */}
          <header className="mb-4 md:mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-[20px] md:text-[24px] font-semibold text-gray-900">
                  Daily Closing Form — {storeName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Complete the end-of-day report for the selected business date.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm text-gray-500">
                    Business Date:
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      const d = e.target.value;
                      setSelectedDate(d);
                      setForm((p) => ({ ...p, date: d }));
                      setFormErrors({});
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedDate && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      isLocked
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {isLocked ? "Locked" : "Unlocked"}
                  </span>
                )}
              </div>
            </div>

            {selectedDate && isLocked && (
              <div className="mt-3 px-4 py-2 rounded-2xl bg-yellow-50 text-yellow-800 text-sm flex items-center gap-2 border border-yellow-100">
                <span>🔒</span>
                <span>This record is locked. Unlock to edit.</span>
              </div>
            )}
          </header>

          {/* No date */}
          {!selectedDate && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-center text-gray-500 italic text-sm md:text-base">
                Please choose a business date to start today's closing.
              </p>
            </div>
          )}

          {/* Loading */}
          {selectedDate && loading && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-center text-gray-500 text-sm md:text-base">
                Loading record…
              </p>
            </div>
          )}

          {/* Form */}
          {selectedDate && !loading && (
            <div className="flex-1 pb-28 space-y-5 md:space-y-6">
              {/* SALES */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
                  Sales Inputs
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {([
                    ["Total Sales", "totalSales"],
                    ["Net Sales", "netSales"],
                    ["Cash Payments", "cashPayments"],
                    ["Card Payments", "cardPayments"],
                    ["Digital Payments", "digitalPayments"],
                    ["Grab Payments", "grabPayments"],
                    ["Voucher Payments", "voucherPayments"],
                    ["Bank Transfer Payments", "bankTransferPayments"],
                    ["Marketing Expense (recorded as sale)", "marketingExpenses"],
                  ] as const).map(([label, field]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        {label}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        disabled={isLocked}
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className={`${inputBase} ${isLocked ? inputDisabled : ""}`}
                      />
                      {formErrors[field] && (
                        <p className="text-xs text-red-500">{formErrors[field]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* BUDGETS */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
                  Requested Budgets
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {([
                    ["Kitchen Budget", "kitchenBudget"],
                    ["Bar Budget", "barBudget"],
                    ["Non-Food Budget", "nonFoodBudget"],
                    ["Staff Meal Budget", "staffMealBudget"],
                  ] as const).map(([label, field]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        {label}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        disabled={isLocked}
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className={`${inputBase} ${isLocked ? inputDisabled : ""}`}
                      />
                      {formErrors[field] && (
                        <p className="text-xs text-red-500">{formErrors[field]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* CASH COUNT */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
                  Cash Count Inputs
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {([
                    ["Actual Cash Counted", "actualCashCounted"],
                    ["Cash Float", "cashFloat"],
                  ] as const).map(([label, field]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        {label}
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        disabled={isLocked}
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className={`${inputBase} ${isLocked ? inputDisabled : ""}`}
                      />
                      {formErrors[field] && (
                        <p className="text-xs text-red-500">{formErrors[field]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* SUMMARY */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase tracking-wide">
                  Summary
                </h2>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">Variance:</div>
                  <div className="text-right font-medium">{peso(variance)}</div>

                  <div className="text-gray-500">Total Budgets:</div>
                  <div className="text-right font-medium">{peso(totalBudgets)}</div>

                  <div className="text-gray-500">Cash for Deposit:</div>
                  <div className="text-right font-medium">{peso(cashForDeposit)}</div>

                  <div className="text-gray-500">Transfer Needed:</div>
                  <div className="text-right font-medium text-red-600">
                    {transferNeeded > 0 ? peso(transferNeeded) : "₱0"}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* FOOTER */}
          {selectedDate && !loading && (
            <div className="fixed inset-x-0 bottom-0 bg-white/95 border-t border-gray-200 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
                <p className="text-xs md:text-sm text-gray-500">
                  Submitted by: <span className="font-medium">{submittedBy}</span>
                </p>

                <div className="flex items-center gap-3">
                  {isLocked && (
                    <button
                      type="button"
                      onClick={openUnlockModal}
                      className="px-3 py-2 rounded-full border border-gray-300 text-xs md:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
                    >
                      Unlock (Manager)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !isFormValid || isLocked}
                    className={`w-full md:w-auto px-6 py-3 rounded-full text-sm font-semibold text-white shadow-md ${
                      isLocked || !isFormValid || isSaving
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isLocked ? "Locked" : isSaving ? "Saving…" : "Save Daily Closing"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MANAGER UNLOCK MODAL */}
          {showUnlockModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Manager Unlock</h3>
                <p className="text-sm text-gray-500">
                  Enter the 4-digit manager PIN to unlock this record for editing.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Manager PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-gray-50 text-center tracking-[0.4em] text-lg font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelUnlock}
                    className="px-4 py-2 rounded-full text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmUnlock}
                    className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CashierForm;
