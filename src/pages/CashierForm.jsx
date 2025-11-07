import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// ✅ Works with Vite and Replit
const BACKEND_URL = "https://restaurant-ops-backend.onrender.com";

console.log("🟢 Using backend URL:", BACKEND_URL);


export default function CashierForm() {
  const store = localStorage.getItem("store") || "Unknown Store";
  const submittedBy = localStorage.getItem("submittedBy") || `${store} Cashier`;

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
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

  // --- Currency formatting ---
  const peso = (n) => (isNaN(n) || n === "" ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`);

  // --- Computed fields ---
  const variance =
    (parseFloat(form.actualCashCounted) || 0) -
    (parseFloat(form.cashPayments) || 0) -
    (parseFloat(form.cashFloat) || 0);

  const totalBudgets =
    (parseFloat(form.kitchenBudget) || 0) +
    (parseFloat(form.barBudget) || 0) +
    (parseFloat(form.nonFoodBudget) || 0) +
    (parseFloat(form.staffMealBudget) || 0);

  const rawCashForDeposit =
    (parseFloat(form.actualCashCounted) || 0) -
    (parseFloat(form.cashFloat) || 0) -
    totalBudgets;

  const cashForDeposit = rawCashForDeposit < 0 ? 0 : rawCashForDeposit;
  const transferNeeded = rawCashForDeposit < 0 ? Math.abs(rawCashForDeposit) : 0;

  // --- Form handler ---
  const handleChange = (field, value) => {
    const v = value === "" ? "" : parseFloat(value) || 0;
    setForm((prev) => ({ ...prev, [field]: v }));
  };

  // --- Helper: map Airtable fields safely ---
  function mapFields(f) {
    if (!f) return {};
    const safe = (key) =>
      key in f ? f[key] : f[key.trim()] || f[key.replace(/_/g, " ")] || "";
    return {
      date: safe("Date") || form.date,
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
      nonFoodBudget: safe("Non Food Budget") ?? safe("Non-Food Budget") ?? "",
      staffMealBudget: safe("Staff Meal Budget") ?? "",
      actualCashCounted: safe("Actual Cash Counted") ?? "",
      cashFloat: safe("Cash Float") ?? "",
    };
  }

  // --- Fetch with retry (fixes transient Replit 503s) ---
  async function fetchWithRetry(url, options = {}, retries = 2) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(await res.text());
      return res;
    } catch (err) {
      if (retries > 0) {
        console.warn("Retrying fetch:", retries, url);
        return await fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  }

  // --- Fetch existing record (on mount, date change, unlock) ---
  async function fetchExisting(showToast = false) {
    try {
      const url = new URL(`${BACKEND_URL}/closings/unique`);
      url.searchParams.set("business_date", form.date);
      url.searchParams.set("store", store);

      const res = await fetchWithRetry(url);
      if (!res.ok) {
        if (showToast) toast("No existing record found for this date.");
        setRecordId(null);
        setIsLocked(false);
        setForm((p) => ({ ...p }));
        return;
      }

      const data = await res.json();
      const f = data.fields || {};
      const lockStatus = (f["Lock Status"] || "").trim();

      setRecordId(data.id || null);
      setIsLocked(lockStatus.toLowerCase() === "locked");
      setLastFetchedLock(lockStatus || "Unknown");
      setForm((prev) => ({ ...prev, ...mapFields(f) }));

      if (showToast) toast.success(`Record loaded (${lockStatus || "Unlocked"})`);
      console.log("✅ Prefilled from Airtable:", data.id, lockStatus);
    } catch (e) {
      console.warn("fetchExisting failed:", e);
      toast.error("Error fetching existing record.");
    }
  }

  // --- Initial + reactive fetch ---
  useEffect(() => {
    fetchExisting();
  }, [form.date, store]);

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
          console.log(`🔄 Lock status changed: ${lastFetchedLock} → ${newLock}`);
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

    try {
      setIsSaving(true);
      const payload = {
        business_date: form.date,
        store,
        total_sales: form.totalSales,
        net_sales: form.netSales,
        cash_payments: form.cashPayments,
        card_payments: form.cardPayments,
        digital_payments: form.digitalPayments,
        grab_payments: form.grabPayments,
        voucher_payments: form.voucherPayments,
        bank_transfer_payments: form.bankTransferPayments,
        marketing_expenses: form.marketingExpenses,
        kitchen_budget: form.kitchenBudget,
        bar_budget: form.barBudget,
        non_food_budget: form.nonFoodBudget,
        staff_meal_budget: form.staffMealBudget,
        actual_cash_counted: form.actualCashCounted,
        cash_float: form.cashFloat,
        variance_cash: variance,
        total_budgets: totalBudgets,
        cash_for_deposit: cashForDeposit,
        transfer_needed: transferNeeded,
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

      const res = await fetchWithRetry(`${BACKEND_URL}/closings/${recordId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

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

  // --- Input class generator ---
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
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Business Date:</span>
              <input
                type="date"
                value={form.date}
                disabled={isLocked}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                className={
                  "border border-gray-300 rounded-md px-2 py-1 text-gray-700 " +
                  (isLocked ? "bg-gray-100 text-gray-500" : "")
                }
              />
            </div>
          </div>

          {isLocked && (
            <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-700 text-sm">
              🔒 This record is locked and cannot be edited.
            </div>
          )}
        </header>

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
                <label className="block text-sm text-gray-700">{label}</label>
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
                <label className="block text-sm text-gray-700">{label}</label>
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
                <label className="block text-sm text-gray-700">{label}</label>
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
          <p className="text-sm text-gray-500">Submitted by: {submittedBy}</p>

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
                  isSaving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
