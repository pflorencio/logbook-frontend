import React, { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import Layout from "../components/Layout";
import {
  BACKEND_URL,
  fetchUniqueClosing,
  saveClosing,
  unlockRecord,
  checkNeedsUpdate,
  fetchNeedsUpdateList, // ✅ FIX: missing import
} from "@/lib/api";

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

  closingNotes: string; // ✅ NEW (Cashier-entered notes)
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

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPeso = (value?: string | number) =>
  pesoFormatter.format(Number(value) || 0);

const CashierForm: React.FC = () => {
  console.log("🧾 CashierForm v11 — with fetch debugging enabled");

  // ----------------------------------------------
  // ACTIVE STORE (from login store picker)
  // ----------------------------------------------
  const session = JSON.parse(localStorage.getItem("session") || "{}");

  const activeStoreId = session.activeStoreId || null;
  const activeStoreName = session.activeStoreName || null;

  // ----------------------------------------------
  // SESSION
  // ----------------------------------------------
  const session = JSON.parse(localStorage.getItem("session") || "{}");

  const userName: string = session.name || "Cashier";
  const storeId: string = session.storeId || null;
  const storeName: string = session.storeName || null;
  const submittedBy: string = userName;

  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ----------------------------------------------
  // 🚨 STORE GUARD (Phase 1)
  // ----------------------------------------------
  useEffect(() => {
    if (!storeId) {
      toast.error("No store selected. Please log in again.");
      navigate("/login");
    }
  }, [storeId, navigate]);


  // ----------------------------------------------
  // NEEDS UPDATE STATE (separated concerns)
  // ----------------------------------------------

  // Pre-date check (single latest)
  const [needsUpdateCheck, setNeedsUpdateCheck] = useState<{
    exists: boolean;
    business_date?: string;
    store_name?: string;
    notes?: string;
  } | null>(null);

  // List of all Needs Update records
  const [needsUpdateList, setNeedsUpdateList] = useState<
    { record_id: string; business_date: string; notes?: string }[]
  >([]);

  // Active record (selected date)
  const [needsUpdateActive, setNeedsUpdateActive] = useState<boolean>(false);
  const [needsUpdateNotes, setNeedsUpdateNotes] = useState<string | null>(null);

  const [checkingNeedsUpdate, setCheckingNeedsUpdate] = useState(false);

  // ----------------------------------------------
  // LOAD NEEDS UPDATE (ON LOGIN)
  // ----------------------------------------------
  useEffect(() => {
    if (!storeId) return;

    async function runCheck() {
      try {
        setCheckingNeedsUpdate(true);
        const result = await checkNeedsUpdate(storeId);
        setNeedsUpdateCheck(result);
      } catch (err) {
        console.error("Needs-update check failed", err);
      } finally {
        setCheckingNeedsUpdate(false);
      }
    }

    runCheck();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    async function loadNeedsUpdateList() {
      try {
        const res = await fetchNeedsUpdateList(storeId);
        setNeedsUpdateList(res.records || []);
      } catch (err) {
        console.error("❌ Failed to load needs update list", err);
      }
    }

    loadNeedsUpdateList();
  }, [storeId]);

  // ----------------------------------------------
  // STATE (FORM + UI)
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
    closingNotes: "",
  });

  const [originalForm, setOriginalForm] = useState<FormState | null>(null);

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
  // WEEKLY BUDGET CONTEXT (from backend)
  // ----------------------------------------------
  type WeeklyBudgetRecord = {
    store_id: string;
    week_start: string;
    week_end: string;
    weekly_budget?: number;
    kitchen_budget?: number;
    bar_budget?: number;
    remaining_budget?: number;
    food_cost_deducted?: number;
    status?: "draft" | "locked";
    locked_by?: string;
    last_saved_at?: string; // if your backend returns this
    updated_at?: string;    // or this
  };

  const [weeklyBudgetRecord, setWeeklyBudgetRecord] =
    useState<WeeklyBudgetRecord | null>(null);

  const [weeklyBudgetLoading, setWeeklyBudgetLoading] = useState(false);
  const [weeklyBudgetError, setWeeklyBudgetError] = useState<string | null>(null);

  // ----------------------------------------------
  // COMPUTED FIELD HELPERS
  // ----------------------------------------------
  const variance = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const cash = Number(form.cashPayments) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - cash - floatAmt;
  }, [form]);

  const totalEstimatedSpend = useMemo(() => {
    return (
      (Number(form.kitchenBudget) || 0) +
      (Number(form.barBudget) || 0) +
      (Number(form.nonFoodBudget) || 0) +
      (Number(form.staffMealBudget) || 0)
    );
  }, [form]);

  const foodAndBeverageEstimatedSpend = useMemo(() => {
    return (
      (Number(form.kitchenBudget) || 0) +
      (Number(form.barBudget) || 0)
    );
  }, [form]);

  const rawCashForDeposit = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - floatAmt - totalEstimatedSpend;
  }, [form, totalEstimatedSpend]);

  const isDirty = useMemo(() => {
    if (!originalForm) return false;

    const { date: _d1, ...current } = form;
    const { date: _d2, ...original } = originalForm;

    return JSON.stringify(current) !== JSON.stringify(original);
  }, [form, originalForm]);

  const isComplete = useMemo(() => {
    if (!selectedDate) return false;

    return numericFields.every((field) => {
      const value = form[field];
      return value !== "" && value !== null && !isNaN(Number(value));
    });
  }, [form, selectedDate]);

  // ----------------------------------------------
  // WEEK HELPERS (for weekly budget lookup)
  // ----------------------------------------------
  function getMondayISO(dateStr: string): string {
    // dateStr = "YYYY-MM-DD"
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    const day = date.getUTCDay(); // 0=Sun, 1=Mon
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);

    date.setUTCDate(diff);

    return date.toISOString().slice(0, 10);
  }

  // ----------------------------------------------
  // BUDGET CONTEXT (from backend)
  // ----------------------------------------------
  const daysInWeek = 7;

  const weeklyBudget = useMemo(() => {
    if (!weeklyBudgetRecord) return 0;

    // Prefer explicit weekly_budget, else sum kitchen+bar
    const wb =
      Number(weeklyBudgetRecord.weekly_budget) ||
      (Number(weeklyBudgetRecord.kitchen_budget) || 0) +
        (Number(weeklyBudgetRecord.bar_budget) || 0);

    return isNaN(wb) ? 0 : wb;
  }, [weeklyBudgetRecord]);

  const baseRemainingThisWeek = useMemo(() => {
    if (!weeklyBudgetRecord) return weeklyBudget;
    const rb = Number(weeklyBudgetRecord.remaining_budget);
    return isNaN(rb) ? weeklyBudget : rb;
  }, [weeklyBudgetRecord, weeklyBudget]);

  const dailyEnvelope = useMemo(() => {
    return weeklyBudget > 0 ? weeklyBudget / daysInWeek : 0;
  }, [weeklyBudget, daysInWeek]);

  // Remaining after planned spend (tomorrow’s planned F&B)
  const remainingWeeklyBudget = useMemo(() => {
    return baseRemainingThisWeek - foodAndBeverageEstimatedSpend;
  }, [baseRemainingThisWeek, foodAndBeverageEstimatedSpend]);

  const aboveEnvelope = useMemo(() => {
    return Math.max(0, foodAndBeverageEstimatedSpend - dailyEnvelope);
  }, [foodAndBeverageEstimatedSpend, dailyEnvelope]);

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
      closingNotes: f["Closing Notes"] ?? "",
    };
  }

  // ----------------------------------------------
  // FETCH EXISTING
  // ----------------------------------------------
  async function fetchExisting(showToast = false): Promise<void> {
    if (!selectedDate || !storeName) return;

    if (lastFetchAbort.current) lastFetchAbort.current.abort();
    const controller = new AbortController();
    lastFetchAbort.current = controller;

    setLoading(true);

    try {
      const data = await fetchUniqueClosing(selectedDate, storeId);
      console.log("📥 fetchExisting response:", data);

      // NO RECORD
      if (data.status === "empty") {
        setRecordId(null);
        setIsLocked(false);
        setNeedsUpdateActive(false);
        setNeedsUpdateNotes(null);

        const freshForm = {
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
        };

        setForm(freshForm);
        setOriginalForm(freshForm);

        if (showToast) toast("No record found — starting fresh.");
        return;
      }

      // EXISTING RECORD
      setRecordId(data.id);

      const fields = data.fields || {};
      const verifiedStatus = (fields["Verified Status"] || "").trim();
      const lockStatus = (fields["Lock Status"] || "").trim();

      const isNeedsUpdate = verifiedStatus === "Needs Update";

      setNeedsUpdateActive(isNeedsUpdate);
      setNeedsUpdateNotes(fields["Verification Notes"] || null);

      // 🔓 Needs Update overrides lock
      setIsLocked(lockStatus === "Locked" && !isNeedsUpdate);

      const mappedForm = {
        ...mapFields(fields),
        date: selectedDate,
      };

      setForm(mappedForm);
      setOriginalForm(mappedForm);

      if (showToast) {
        toast.success(
          isNeedsUpdate
            ? "This record needs updating — please revise and resubmit."
            : `Record loaded (${lockStatus || "unlocked"})`
        );
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
  // FETCH WEEKLY BUDGET (when date/store changes)
  // ----------------------------------------------
  useEffect(() => {
    if (!storeId || !selectedDate) return;

    const weekStart = getMondayISO(selectedDate);
    if (!weekStart) {
      console.warn("⚠️ Invalid weekStart from selectedDate:", selectedDate);
      setWeeklyBudgetRecord(null);
      return;
    }

    async function fetchWeeklyBudget() {
      setWeeklyBudgetLoading(true);
      setWeeklyBudgetError(null);

      try {
        const url = `${BACKEND_URL}/weekly-budgets?store_id=${encodeURIComponent(
          storeId
        )}&business_date=${encodeURIComponent(weekStart)}`;

        console.log("📅 Fetching weekly budget:", url);

        const res = await fetch(url);

        if (!res.ok) {
          setWeeklyBudgetRecord(null);
          return;
        }

        const data = await res.json();

        if (!data || !data.week_start) {
          setWeeklyBudgetRecord(null);
          return;
        }

        setWeeklyBudgetRecord(data);
      } catch (err) {
        console.error("❌ Failed to fetch weekly budget:", err);
        setWeeklyBudgetRecord(null);
        setWeeklyBudgetError("Unable to load weekly budget context.");
      } finally {
        setWeeklyBudgetLoading(false);
      }
    }

    fetchWeeklyBudget();
  }, [storeId, selectedDate]);

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

        closing_notes: form.closingNotes,

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
  // UI RENDER BELOW (unchanged except Step 4)
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
          <header className="mb-6 space-y-3">
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
                  onChange={(e) => setSelectedDate(e.target.value)}
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

            {/* 🔴 NEEDS UPDATE BANNER — ALWAYS SHOWN */}
            {!selectedDate && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 space-y-2">
                <div className="font-semibold flex items-center gap-2">
                  ⚠️ Previous Closings Review
                </div>

                {needsUpdateList.length > 0 ? (
                  <ul className="space-y-1">
                    {needsUpdateList.map((item) => (
                      <li key={item.record_id}>
                        <button
                          onClick={() => setSelectedDate(item.business_date)}
                          className="text-left w-full px-3 py-2 rounded-lg bg-white border border-red-200 hover:bg-red-100 transition"
                        >
                          <div className="font-medium">
                            {item.business_date}
                          </div>
                          {item.notes && (
                            <div className="text-xs italic text-red-600">
                              “{item.notes}”
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-red-600">
                    ✅ No previous closings require updates.
                  </div>
                )}

                <div className="text-xs text-red-600">
                  Select a date above to review or submit a closing.
                </div>
              </div>
            )}

            {/* IN-FORM NEEDS UPDATE BANNER */}
            {selectedDate && needsUpdateActive && (
              <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <div className="font-semibold">⚠️ Needs Update</div>
                {needsUpdateNotes && (
                  <div className="mt-1 italic text-red-600">
                    “{needsUpdateNotes}”
                  </div>
                )}
                <div className="mt-1 text-xs">
                  Please update the form and resubmit.
                </div>
              </div>
            )}

            {selectedDate && isLocked && !needsUpdateActive && (
              <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-center gap-2">
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
              
              {/* BUDGET CONTEXT — Read-Only */}
              <section className="rounded-2xl bg-blue-50 border border-blue-100 p-4 md:p-5 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 text-center uppercase mb-3">
                  Weekly Budget Context
                </h3>

                {weeklyBudgetLoading ? (
                  <p className="text-center text-sm text-blue-700">Loading weekly budget…</p>
                ) : !weeklyBudgetRecord ? (
                  <div className="text-center text-sm text-blue-800">
                    <div className="font-medium">No weekly budget found for this week.</div>
                    <div className="text-xs text-blue-700 mt-1">
                      Please ask Admin to set a weekly budget for this store/week.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-blue-700">Weekly Budget</div>
                        <div className="font-semibold text-blue-900">{formatPeso(weeklyBudget)}</div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-blue-700">Remaining This Week</div>
                        <div className="font-semibold text-blue-900">
                          {formatPeso(remainingWeeklyBudget)}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-xs text-blue-700">Daily Envelope (Guide)</div>
                        <div className="font-semibold text-blue-900">{formatPeso(dailyEnvelope)}</div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-blue-700 text-center">
                      Weekly budget is reduced based on planned daily spend. Daily envelope is a pacing guide, not free spend.
                    </p>

                    {weeklyBudgetError && (
                      <p className="mt-2 text-xs text-red-600 text-center">{weeklyBudgetError}</p>
                    )}
                  </>
                )}
              </section>
              
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

              {/* ESTIMATED SPEND */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Estimated Spend for Tomorrow
                </h2>

                <p className="text-xs text-gray-500 text-center">
                  Enter the estimated total operational spend for tomorrow. This is used for
                  planning and weekly budget pacing.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {([
                    ["Kitchen – Estimated Spend", "kitchenBudget"],
                    ["Bar – Estimated Spend", "barBudget"],
                    ["Non-Food – Estimated Spend", "nonFoodBudget"],
                    ["Staff Meals – Estimated Spend", "staffMealBudget"],
                  ] as const).map(([label, field]) => (
                    <div key={field}>
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        type="number"
                        disabled={isLocked}
                        inputMode="numeric"
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

              {/* CLOSING NOTES */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Closing Notes
                </h2>

                <p className="text-xs text-gray-500 text-center">
                  Add any important context (e.g. marketing expenses, unusual variance,
                  operational issues).
                </p>

                <textarea
                  disabled={isLocked}
                  value={form.closingNotes}
                  onChange={(e) => handleChange("closingNotes", e.target.value)}
                  rows={4}
                  className={`${inputBase} ${isLocked ? inputDisabled : ""}`}
                  placeholder="Example: Marketing expense was for influencer promo. Variance due to delayed Grab payout."
                />
              </section>

              {/* SUMMARY */}
              <section className={sectionCard}>
                <h2 className="text-sm font-semibold text-gray-700 text-center uppercase">
                  Summary (Preview)
                </h2>

                {/* FOOD COST CONTROL */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Food Cost Control
                  </div>

                  <div className="grid grid-cols-2 text-sm gap-y-2">
                    <div className="text-gray-600">
                      Food & Beverage Spend (Tomorrow):
                    </div>
                    <div className="text-right font-medium">
                      {formatPeso(foodAndBeverageEstimatedSpend)}
                    </div>

                    <div className="text-gray-600">Daily Envelope (Guide):</div>
                    <div className="text-right font-medium">
                      {formatPeso(dailyEnvelope)}
                    </div>

                    <div className="text-gray-600">Remaining Weekly Budget:</div>
                    <div
                      className={`text-right font-medium ${
                        remainingWeeklyBudget < 0 ? "text-red-600" : ""
                      }`}
                    >
                      {formatPeso(remainingWeeklyBudget)}
                    </div>

                    <div className="text-gray-600">Additional Transfer Needed:</div>
                    <div className="text-right font-medium text-red-600">
                      {aboveEnvelope > 0 ? formatPeso(aboveEnvelope) : "₱0"}
                    </div>
                  </div>
                </div>

                {/* CASH IMPACT */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Cash Impact
                  </div>

                  <div className="grid grid-cols-2 text-sm gap-y-2">
                    <div className="text-gray-600">
                      Total Estimated Spend (All Categories):
                    </div>
                    <div className="text-right font-medium">
                      {formatPeso(totalEstimatedSpend)}
                    </div>

                    <div className="text-gray-600">Variance:</div>
                    <div className="text-right font-medium">
                      {formatPeso(variance)}
                    </div>

                    {!isLocked && (
                      <>
                        <div className="text-gray-600">
                          Estimated Cash for Deposit
                          <span className="block text-[11px] text-gray-400">
                            Before admin adjustments (tips, returned change)
                          </span>
                        </div>
                        <div className="text-right font-medium">
                          {formatPeso(rawCashForDeposit)}
                        </div>
                      </>
                    )}
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
                    disabled={
                      isLocked ||
                      isSaving ||
                      !selectedDate ||
                      !isDirty ||
                      !isComplete
                    }
                    className={`px-6 py-2 rounded-full text-sm font-semibold text-white shadow ${
                      isLocked || !isDirty || !isComplete
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