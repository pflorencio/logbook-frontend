import React, { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import { fetchUniqueClosing, saveClosing, unlockRecord } from "@/lib/api";
import { BACKEND_URL } from "@/lib/api";

console.log("🟢 Using backend URL:", BACKEND_URL);

// ----------------------------------------------
// FORM STATE
// ----------------------------------------------
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
  console.log("🧾 CashierForm v11 — with fetch debugging enabled");

  // ----------------------------------------------
  // SESSION
  // ----------------------------------------------
  const session = JSON.parse(localStorage.getItem("session") || "{}");

  const userName: string = session.name || "Cashier";
  const storeId: string = session.storeId || null;
  const storeName: string = session.storeName || null; // 🔥 IMPORTANT: used by fetchUniqueClosing
  const submittedBy: string = userName;

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ----------------------------------------------
  // STATE
  // ----------------------------------------------
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

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  const [recordId, setRecordId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");

  const lastFetchAbort = useRef<AbortController | null>(null);

  // ----------------------------------------------
  // COMPUTED FIELD HELPERS
  // ----------------------------------------------
  const variance = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const cash = Number(form.cashPayments) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - cash - floatAmt;
  }, [form]);

  const totalBudgets = useMemo(() => {
    return (
      (Number(form.kitchenBudget) || 0) +
      (Number(form.barBudget) || 0) +
      (Number(form.nonFoodBudget) || 0) +
      (Number(form.staffMealBudget) || 0)
    );
  }, [form]);

  const rawCashForDeposit = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - floatAmt - totalBudgets;
  }, [form, totalBudgets]);

  const cashForDeposit = Math.max(0, rawCashForDeposit);
  const transferNeeded =
    rawCashForDeposit < 0 ? Math.abs(rawCashForDeposit) : 0;

  const peso = (n: number | string): string =>
    isNaN(Number(n)) || n === "" ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;

  // ----------------------------------------------
  // HANDLE CHANGE
  // ----------------------------------------------
  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (formErrors[field]) {
      const next = { ...formErrors };
      delete next[field];
      setFormErrors(next);
    }
  };

  // ----------------------------------------------
  // MAP AIRTABLE → FORM
  // ----------------------------------------------
  function mapFields(f: Record<string, any>): FormState {
    return {
      date: f["Date"] || "",
      totalSales: f["Total Sales"] ?? "",
      netSales: f["Net Sales"] ?? "",
      cashPayments: f["Cash Payments"] ?? "",
      cardPayments: f["Card Payments"] ?? "",
      digitalPayments: f["Digital Payments"] ?? "",
      grabPayments: f["Grab Payments"] ?? "",
      voucherPayments: f["Voucher Payments"] ?? "",
      bankTransferPayments: f["Bank Transfer Payments"] ?? "",
      marketingExpenses:
        f["Marketing Expenses"] ||
        f["Marketing Expense (recorded as sale)"] ||
        "",
      kitchenBudget: f["Kitchen Budget"] ?? "",
      barBudget: f["Bar Budget"] ?? "",
      nonFoodBudget: f["Non Food Budget"] ?? "",
      staffMealBudget: f["Staff Meal Budget"] ?? "",
      actualCashCounted: f["Actual Cash Counted"] ?? "",
      cashFloat: f["Cash Float"] ?? "",
    };
  }

  // ----------------------------------------------
  // FETCH EXISTING — Option B IMPLEMENTED
  // ----------------------------------------------
  async function fetchExisting(showToast = false): Promise<void> {
    if (!selectedDate || !storeName) {
      console.log("⚠️ fetchExisting skipped — missing:", {
        selectedDate,
        storeName,
      });
      return;
    }

    console.log("🚀 fetchExisting → calling backend with:", {
      selectedDate,
      storeName,
      url: `${BACKEND_URL}/closings/unique?business_date=${selectedDate}&store=${storeName}`,
    });

    // Cancel previous request
    if (lastFetchAbort.current) lastFetchAbort.current.abort();
    const controller = new AbortController();
    lastFetchAbort.current = controller;

    setLoading(true);

    try {
      const data = await fetchUniqueClosing(selectedDate, storeId);
      console.log("📥 fetchExisting response:", data);

      // NO RECORD FOUND
      if (data.status === "empty") {
        console.log("ℹ️ No record found for this date+store");

        setRecordId(null);
        setIsLocked(false);
        setForm({
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

      // EXISTING RECORD FOUND
      console.log("✅ Existing record found:", data.id);

      setRecordId(data.id);

      const f = data.fields || {};
      const lockStatus = (f["Lock Status"] || "").trim().toLowerCase();
      setIsLocked(lockStatus === "locked");

      // Map fields
      setForm({
        ...mapFields(f),
        date: selectedDate,
      });

      if (showToast) {
        toast.success(`Record loaded (${lockStatus || "unlocked"})`);
      }
    } catch (err) {
      console.error("❌ fetchExisting error:", err);
      toast.error("Error fetching record.");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------
  // TRIGGER FETCH WHEN DATE CHANGES
  // ----------------------------------------------
  useEffect(() => {
    if (selectedDate) {
      fetchExisting(true);
    }
  }, [selectedDate]);

  // ----------------------------------------------
  // SAVE RECORD
  // ----------------------------------------------
  const handleSave = async () => {
    if (!storeId) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    if (isLocked) {
      toast.error("Record is locked.");
      return;
    }

    const missing: Partial<Record<keyof FormState, string>> = {};
    numericFields.forEach((f) => {
      if (form[f] === "" || form[f] === null) missing[f] = "Required";
    });

    if (Object.keys(missing).length > 0) {
      setFormErrors(missing);
      toast.error("Please fill in all required fields.");
      return;
    }

    const isCreate = !recordId;

    if (isCreate) {
      const ok = window.confirm(
        "This will CREATE a new closing record and LOCK it. Continue?"
      );
      if (!ok) return;
    }

    try {
      setIsSaving(true);

      console.log("📤 Saving payload:", {
        business_date: selectedDate,
        store_id: storeId,
        store_name: storeName,
      });

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

        submitted_by: submittedBy,
      };

      const res = await saveClosing(payload);

      console.log("✅ Save successful:", res);

      toast.success(isCreate ? "Record created!" : "Record updated!");
      setIsLocked(true);

      fetchExisting(false);
    } catch (err: any) {
      console.error("❌ Save error:", err);

      try {
        const parsed = JSON.parse(err.message);
        toast.error(parsed.detail || "Save failed.");
      } catch {
        toast.error("Save failed.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------
  // UNLOCK LOGIC
  // ----------------------------------------------
  const openUnlockModal = () => {
    if (!recordId) {
      toast.error("No record loaded.");
      return;
    }
    setManagerPin("");
    setShowUnlockModal(true);
  };

  const handleConfirmUnlock = async () => {
    if (!recordId) return;

    if (!managerPin || managerPin.length !== 4) {
      toast.error("Enter a valid 4-digit PIN.");
      return;
    }

    try {
      console.log("🔓 Attempting unlock:", { recordId, managerPin });

      await unlockRecord(recordId, managerPin);

      toast.success("Record unlocked!");
      setIsLocked(false);
      setShowUnlockModal(false);

      fetchExisting(true);
    } catch (err) {
      console.error("❌ Unlock error:", err);
      toast.error("Invalid PIN.");
    }
  };

  // ----------------------------------------------
  // UI RENDER BELOW (unchanged)
  // ----------------------------------------------
  const inputBase =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500";

  const inputDisabled = "bg-gray-100 text-gray-500 cursor-not-allowed";

  const sectionCard =
    "rounded-2xl bg-white shadow-md p-5 md:p-6 space-y-4 border border-gray-100";

  return (
    <Layout cashierName={userName} onLogout={handleLogout}>
      <div className="min-h-screen bg-[#F5F5F7] px-3 py-4 flex justify-center">
        <Toaster position="top-center" />

        <div className="w-full max-w-3xl flex flex-col">
          {/* HEADER */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Daily Closing Form — {storeName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Complete the end-of-day report.
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const d = e.target.value;
                    setSelectedDate(d);
                    setForm((p) => ({ ...p, date: d }));
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                />

                {selectedDate && (
                  <span
                    className={`mt-1 px-2 py-1 rounded-full text-xs ${
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
              <div className="mt-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-center gap-2">
                🔒 This record is locked. Unlock to edit.
              </div>
            )}
          </header>

          {/* NO DATE SELECTED */}
          {!selectedDate && (
            <p className="text-center text-gray-500 mt-10">
              Please choose a business date to begin.
            </p>
          )}

          {/* LOADING */}
          {selectedDate && loading && (
            <p className="text-center text-gray-500 mt-10">Loading…</p>
          )}

          {/* MAIN FORM */}
          {selectedDate && !loading && (
            <div className="pb-28 space-y-6">
              {/* SALES */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Sales Inputs
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
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
                    <div key={field}>
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        type="number"
                        disabled={isLocked}
                        inputMode="numeric"
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className={`${inputBase} ${
                          isLocked ? inputDisabled : ""
                        }`}
                      />
                      {formErrors[field] && (
                        <p className="text-xs text-red-500">
                          {formErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* BUDGETS */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Requested Budgets
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {([
                    ["Kitchen Budget", "kitchenBudget"],
                    ["Bar Budget", "barBudget"],
                    ["Non-Food Budget", "nonFoodBudget"],
                    ["Staff Meal Budget", "staffMealBudget"],
                  ] as const).map(([label, field]) => (
                    <div key={field}>
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        type="number"
                        disabled={isLocked}
                        inputMode="numeric"
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className={`${inputBase} ${
                          isLocked ? inputDisabled : ""
                        }`}
                      />
                      {formErrors[field] && (
                        <p className="text-xs text-red-500">
                          {formErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* CASH COUNT */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Cash Count Inputs
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {([
                    ["Actual Cash Counted", "actualCashCounted"],
                    ["Cash Float", "cashFloat"],
                  ] as const).map(([label, field]) => (
                    <div key={field}>
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        type="number"
                        disabled={isLocked}
                        inputMode="numeric"
                        value={form[field]}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className={`${inputBase} ${
                          isLocked ? inputDisabled : ""
                        }`}
                      />
                      {formErrors[field] && (
                        <p className="text-xs text-red-500">
                          {formErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* SUMMARY */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Summary (Preview)
                </h2>

                <div className="grid grid-cols-2 text-sm gap-y-2">
                  <div className="text-gray-600">Variance:</div>
                  <div className="text-right font-medium">{peso(variance)}</div>

                  <div className="text-gray-600">Total Budgets:</div>
                  <div className="text-right font-medium">
                    {peso(totalBudgets)}
                  </div>

                  <div className="text-gray-600">Cash for Deposit:</div>
                  <div className="text-right font-medium">
                    {peso(cashForDeposit)}
                  </div>

                  <div className="text-gray-600">Transfer Needed:</div>
                  <div className="text-right font-medium text-red-600">
                    {transferNeeded > 0 ? peso(transferNeeded) : "₱0"}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          {selectedDate && !loading && (
            <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 py-3">
              <div className="max-w-3xl mx-auto px-4 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Submitted by: <b>{submittedBy}</b>
                </p>

                <div className="flex gap-3">
                  {isLocked && (
                    <button
                      onClick={openUnlockModal}
                      className="px-3 py-2 text-xs border rounded-full bg-gray-50 hover:bg-gray-100"
                    >
                      Unlock (Manager)
                    </button>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isLocked || isSaving || !selectedDate}
                    className={`px-6 py-2 rounded-full text-sm font-semibold text-white shadow ${
                      isLocked
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isSaving ? "Saving…" : "Save Daily Closing"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MANAGER PIN MODAL */}
          {showUnlockModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
                <h3 className="text-lg font-semibold">Manager Unlock</h3>
                <p className="text-sm text-gray-500">
                  Enter the 4-digit manager PIN.
                </p>

                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={managerPin}
                  onChange={(e) =>
                    setManagerPin(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full px-4 py-3 rounded-xl border text-center tracking-[0.4em] text-lg bg-gray-50"
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowUnlockModal(false)}
                    className="px-4 py-2 rounded-full border text-sm bg-white"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmUnlock}
                    className="px-5 py-2 rounded-full text-sm text-white bg-blue-600 hover:bg-blue-700"
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