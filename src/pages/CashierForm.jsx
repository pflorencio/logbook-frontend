import React, { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// ✅ Works with Vite / Replit / Render
const BACKEND_URL = "https://restaurant-ops-backend.onrender.com";
console.log("🟢 Using backend URL:", BACKEND_URL);

export default function CashierForm() {
  const store = localStorage.getItem("store") || "Unknown Store";
  const submittedBy =
    localStorage.getItem("submittedBy") || `${store} Cashier`;

  // --- Default state (no date selected initially) ---
  const [selectedDate, setSelectedDate] = useState(""); // empty until user picks
  const [form, setForm] = useState({
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

  const [recordId, setRecordId] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastFetchedLock, setLastFetchedLock] = useState("");
  const [loading, setLoading] = useState(false);
  const lastFetchAbort = useRef(null);

  // --- Currency formatting ---
  const peso = (n) =>
    isNaN(n) || n === "" ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;

  // --- Numeric helper (preserve blank inputs) ---
  const toNumberOrBlank = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  // --- Computed fields ---
  const variance = useMemo(() => {
    const actual = parseFloat(form.actualCashCounted) || 0;
    const cash = parseFloat(form.cashPayments) || 0;
    const floatAmt = parseFloat(form.cashFloat) || 0;
    return actual - cash - floatAmt;
  }, [form.actualCashCounted, form.cashPayments, form.cashFloat]);

  const totalBudgets = useMemo(() => {
    const k = parseFloat(form.kitchenBudget) || 0;
    const b = parseFloat(form.barBudget) || 0;
    const n = parseFloat(form.nonFoodBudget) || 0;
    const s = parseFloat(form.staffMealBudget) || 0;
    return k + b + n + s;
  }, [form.kitchenBudget, form.barBudget, form.nonFoodBudget, form.staffMealBudget]);

  const rawCashForDeposit = useMemo(() => {
    const actual = parseFloat(form.actualCashCounted) || 0;
    const floatAmt = parseFloat(form.cashFloat) || 0;
    return actual - floatAmt - totalBudgets;
  }, [form.actualCashCounted, form.cashFloat, totalBudgets]);

  const cashForDeposit = rawCashForDeposit < 0 ? 0 : rawCashForDeposit;
  const transferNeeded = rawCashForDeposit < 0 ? Math.abs(rawCashForDeposit) : 0;

  // --- Form handler ---
  const handleChange = (field, value) => {
    // Keep empty string if user cleared the field; otherwise coerce to number
    const v = value === "" ? "" : toNumberOrBlank(value);
    setForm((prev) => ({ ...prev, [field]: v }));
  };

  // --- Map Airtable fields safely ---
  function mapFields(f) {
    if (!f) return {};
    const safe = (key) =>
      key in f ? f[key] : f[key?.trim?.()] || f[key?.replace?.(/_/g, " ")] || "";

    return {
      date: safe("Date") || selectedDate,
      totalSales: toNumberOrBlank(safe("Total Sales")),
      netSales: toNumberOrBlank(safe("Net Sales")),
      cashPayments: toNumberOrBlank(safe("Cash Payments")),
      cardPayments: toNumberOrBlank(safe("Card Payments")),
      digitalPayments: toNumberOrBlank(safe("Digital Payments")),
      grabPayments: toNumberOrBlank(safe("Grab Payments")),
      voucherPayments: toNumberOrBlank(safe("Voucher Payments")),
      bankTransferPayments: toNumberOrBlank(safe("Bank Transfer Payments")),
      marketingExpenses:
        toNumberOrBlank(
          safe("Marketing Expenses") ||
            safe("Marketing Expense (recorded as sale)") ||
            ""
        ),
      kitchenBudget: toNumberOrBlank(safe("Kitchen Budget")),
      barBudget: toNumberOrBlank(safe("Bar Budget")),
      nonFoodBudget: toNumberOrBlank(
        safe("Non Food Budget") ?? safe("Non-Food Budget")
      ),
      staffMealBudget: toNumberOrBlank(safe("Staff Meal Budget")),
      actualCashCounted: toNumberOrBlank(safe("Actual Cash Counted")),
      cashFloat: toNumberOrBlank(safe("Cash Float")),
    };
  }

  // --- Retry helper ---
  async function fetchWithRetry(url, options = {}, retries = 2, abortSignal) {
    try {
      const res = await fetch(url, { ...options, signal: abortSignal });
      if (!res.ok) throw new Error(await res.text());
      return res;
    } catch (err) {
      // If aborted, bubble up immediately
      if (abortSignal?.aborted) throw err;
      if (retries > 0) {
        console.warn("Retrying fetch:", retries, url);
        return await fetchWithRetry(url, options, retries - 1, abortSignal);
      }
      throw err;
    }
  }

  // --- Fetch record (only when a date is selected) ---
  async function fetchExisting(showToast = false) {
    if (!selectedDate) return; // don't fetch until date selected

    // Abort any in-flight fetch for old date
    if (lastFetchAbort.current) lastFetchAbort.current.abort();
    const controller = new AbortController();
    lastFetchAbort.current = controller;

    setLoading(true);
    try {
      const url = new URL(`${BACKEND_URL}/closings/unique`);
      url.searchParams.set("business_date", selectedDate);
      url.searchParams.set("store", store);

      const res = await fetchWithRetry(url, {}, 2, controller.signal);
      const data = await res.json();

      // ✅ Handle new backend statuses
      if (data.status === "empty") {
        console.log("🟡 No record found for this date");
        setRecordId(null);
        setIsLocked(false);
        setLastFetchedLock("Unlocked");
        setForm((p) => ({
          ...p,
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
        }));
        if (showToast) toast("No record found — starting fresh.");
        return;
      }

      if (data.status === "error") {
        console.warn("⚠️ Backend returned error:", data.message);
        toast.error("Error fetching record from backend.");
        return;
      }

      // ✅ If record was found
      const f = data.fields || {};
      const lockStatus = (f["Lock Status"] || "").trim();

      setRecordId(data.id || null);
      setIsLocked(lockStatus.toLowerCase() === "locked");
      setLastFetchedLock(lockStatus || "Unknown");
      setForm((prev) => ({ ...prev, ...mapFields(f), date: selectedDate }));

      if (showToast)
        toast.success(`Record loaded (${lockStatus || "Unlocked"})`);
      console.log("✅ Prefilled from Airtable:", data.id, lockStatus);
    } catch (e) {
      if (e.name === "AbortError") {
        // silent on date-change aborts
      } else {
        console.warn("fetchExisting failed:", e);
        toast.error("Error fetching existing record.");
      }
    } finally {
      setLoading(false);
    }
  }

  // --- React to date selection (single source of truth for fetching) ---
  useEffect(() => {
    if (!selectedDate) return;
    fetchExisting(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, store]);

  // --- Periodic lock status refresh (every 15s) ---
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!recordId) return;
      try {
        const res = await fetch(`${BACKEND_URL}/closings/${recordId}`);
        if (!res.ok) return;
        const record = await res.json();
        const newLock = (record.fields?.["Lock Status"] || "").trim();

        if (newLock !== lastFetchedLock) {
          console.log(
            `🔄 Lock status changed: ${lastFetchedLock} → ${newLock}`
          );
          setIsLocked(newLock.toLowerCase() === "locked");
          setLastFetchedLock(newLock);
          toast(`Lock status changed to: ${newLock}`);
        }
      } catch (err) {
        console.warn("Auto-refresh lock check failed:", err);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [recordId, lastFetchedLock]);

  // --- Save / Upsert ---
  const handleSave = async () => {
    if (isLocked) {
      toast.error("This record is locked. Unlock it first.");
      return;
    }
    if (!selectedDate) {
      toast.error("Please select a business date before saving.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        business_date: selectedDate,
        store,
        total_sales: form.totalSales === "" ? null : Number(form.totalSales),
        net_sales: form.netSales === "" ? null : Number(form.netSales),
        cash_payments:
          form.cashPayments === "" ? null : Number(form.cashPayments),
        card_payments:
          form.cardPayments === "" ? null : Number(form.cardPayments),
        digital_payments:
          form.digitalPayments === "" ? null : Number(form.digitalPayments),
        grab_payments: form.grabPayments === "" ? null : Number(form.grabPayments),
        voucher_payments:
          form.voucherPayments === "" ? null : Number(form.voucherPayments),
        bank_transfer_payments:
          form.bankTransferPayments === ""
            ? null
            : Number(form.bankTransferPayments),
        marketing_expenses:
          form.marketingExpenses === "" ? null : Number(form.marketingExpenses),
        kitchen_budget:
          form.kitchenBudget === "" ? null : Number(form.kitchenBudget),
        bar_budget: form.barBudget === "" ? null : Number(form.barBudget),
        non_food_budget:
          form.nonFoodBudget === "" ? null : Number(form.nonFoodBudget),
        staff_meal_budget:
          form.staffMealBudget === "" ? null : Number(form.staffMealBudget),
        actual_cash_counted:
          form.actualCashCounted === "" ? null : Number(form.actualCashCounted),
        cash_float: form.cashFloat === "" ? null : Number(form.cashFloat),
        variance_cash: Number(variance) || 0,
        total_budgets: Number(totalBudgets) || 0,
        cash_for_deposit: Number(cashForDeposit) || 0,
        transfer_needed: Number(transferNeeded) || 0,
        submitted_by: submittedBy,
      };

      console.log("📤 Submitting payload:", payload);
      const res = await fetchWithRetry(`${BACKEND_URL}/closings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      toast.success("Saved and locked!");
      await fetchExisting(true);
      setIsLocked(true);
    } catch (err) {
      console.error("❌ Save failed:", err);
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Unlock flow ---
  async function handleUnlock() {
    const pin = prompt("Manager PIN to unlock:");
    if (!pin) return;

    try {
      if (!recordId) {
        toast.error("No existing record found to unlock.");
        return;
      }

      const res = await fetchWithRetry(
        `${BACKEND_URL}/closings/${recordId}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Unlock failed");
      }

      toast.success("Record unlocked successfully!");
      setIsLocked(false);
      await fetchExisting(true);
    } catch (e) {
      console.error("Unlock failed:", e);
      toast.error(e.message || "Invalid PIN or unlock failed.");
    }
  }

  // --- Input style helper ---
  const inputCls =
    "w-full border border-gray-300 rounded-md px-3 py-2 " +
    (isLocked ? "bg-gray-100 text-gray-500" : "");

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center">
      <Toaster position="top-center" />
      <div className="w-full max-w-2xl bg-white shadow-md rounded-xl p-6">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              🧾 Daily Closing Form — {store}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>Business Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSelectedDate(newDate);
                    setForm((prev) => ({ ...prev, date: newDate }));
                  }}
                  disabled={isLocked}
                  className={
                    "border border-gray-300 rounded-md px-2 py-1 text-gray-700 " +
                    (isLocked ? "bg-gray-100 text-gray-500" : "")
                  }
                />
              </div>

              {/* Live lock indicator */}
              {selectedDate && (
                <span
                  className={
                    "px-2 py-0.5 rounded text-xs " +
                    (isLocked
                      ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                      : "bg-green-100 text-green-800 border border-green-300")
                  }
                >
                  {isLocked ? "Locked" : "Unlocked"}
                </span>
              )}
            </div>
          </div>

          {/* Locked banner */}
          {isLocked && (
            <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-700 text-sm">
              🔒 This record is locked and cannot be edited.
            </div>
          )}
        </header>

        {/* Guide when no date chosen */}
        {!selectedDate && (
          <div className="text-center text-gray-500 py-10 italic">
            Please choose a business date to begin.
          </div>
        )}

        {/* Loading state */}
        {selectedDate && loading && (
          <div className="text-center text-gray-500 py-6">Loading…</div>
        )}

        {/* Form sections */}
        {selectedDate && !loading && (
          <>
            {/* Sales Section */}
            <section className="mb-6">
              <h2 className="font-medium text-center mb-2">Sales Inputs</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Total Sales", "totalSales"],
                  ["Net Sales", "netSales"],
                  ["Cash Payments", "cashPayments"],
                  ["Card Payments", "cardPayments"],
                  ["Digital Payments", "digitalPayments"],
                  ["Grab Payments", "grabPayments"],
                  ["Voucher Payments", "voucherPayments"],
                  ["Bank Transfer Payments", "bankTransferPayments"],
                  ["Marketing Expense (recorded as sale)", "marketingExpenses"],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label className="block text-sm text-gray-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={form[field]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Budgets */}
            <section className="mb-6">
              <h2 className="font-medium text-center mb-2">Requested Budgets</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Kitchen Budget", "kitchenBudget"],
                  ["Bar Budget", "barBudget"],
                  ["Non-Food Budget", "nonFoodBudget"],
                  ["Staff Meal Budget", "staffMealBudget"],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label className="block text-sm text-gray-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={form[field]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Cash Count */}
            <section className="mb-6">
              <h2 className="font-medium text-center mb-2">Cash Count Inputs</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Actual Cash Counted", "actualCashCounted"],
                  ["Cash Float", "cashFloat"],
                ].map(([label, field]) => (
                  <div key={field}>
                    <label className="block text-sm text-gray-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      disabled={isLocked}
                      value={form[field]}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Summary */}
            <section className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-center mb-2">Summary</h2>
              <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-800">
                <div>Variance (Cash Payments vs Actual):</div>
                <div className="text-right">{peso(variance)}</div>
                <div>Total Budgets:</div>
                <div className="text-right">{peso(totalBudgets)}</div>
                <div>Cash for Deposit:</div>
                <div className="text-right">{peso(cashForDeposit)}</div>
                <div>Transfer Needed:</div>
                <div className="text-right text-red-600">
                  {transferNeeded > 0 ? peso(transferNeeded) : "₱0"}
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Submitted by: {submittedBy}
              </p>

              <div className="flex gap-2">
                {isLocked ? (
                  <>
                    <button
                      onClick={handleUnlock}
                      className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Unlock (Manager)
                    </button>
                    <button
                      disabled
                      className="px-6 py-2 rounded-md bg-gray-300 text-white cursor-not-allowed"
                    >
                      Locked
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-6 py-2 rounded-md text-white font-medium ${
                      isSaving
                        ? "bg-gray-400"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
