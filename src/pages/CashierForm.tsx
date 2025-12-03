import React, { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

const BACKEND_URL = "https://restaurant-ops-backend.onrender.com";
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
  console.log("🧾 CashierForm v6 loaded");

  const store =
    (typeof window !== "undefined" && localStorage.getItem("store")) ||
    "Unknown Store";

  const submittedBy =
    (typeof window !== "undefined" && localStorage.getItem("submittedBy")) ||
    `${store} Cashier`;

  // form + state
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
  const [lastFetchedLock, setLastFetchedLock] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
  }, [form.actualCashCounted, form.cashPayments, form.cashFloat]);

  const totalBudgets = useMemo(() => {
    const k = Number(form.kitchenBudget) || 0;
    const b = Number(form.barBudget) || 0;
    const n = Number(form.nonFoodBudget) || 0;
    const s = Number(form.staffMealBudget) || 0;
    return k + b + n + s;
  }, [
    form.kitchenBudget,
    form.barBudget,
    form.nonFoodBudget,
    form.staffMealBudget,
  ]);

  const rawCashForDeposit = useMemo(() => {
    const actual = Number(form.actualCashCounted) || 0;
    const floatAmt = Number(form.cashFloat) || 0;
    return actual - floatAmt - totalBudgets;
  }, [form.actualCashCounted, form.cashFloat, totalBudgets]);

  const cashForDeposit = rawCashForDeposit < 0 ? 0 : rawCashForDeposit;
  const transferNeeded = rawCashForDeposit < 0 ? Math.abs(rawCashForDeposit) : 0;

  // ----------------------------------------------------
  // Required fields check — THIS DRIVES SAVE BUTTON
  // ----------------------------------------------------
  const isFormValid = numericFields.every((field) => {
    const v = form[field];
    return v !== "" && v !== null && v !== undefined;
  });

  // ----------------------------------------------------
  // Handle Input
  // ----------------------------------------------------
  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // live error removal
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ----------------------------------------------------
  // Helper: retry fetch
  // ----------------------------------------------------
  async function fetchWithRetry(
    url: string | URL,
    options: RequestInit = {},
    retries = 2,
    abortSignal?: AbortSignal,
  ): Promise<Response> {
    try {
      const res = await fetch(url, { ...options, signal: abortSignal });
      if (!res.ok) throw new Error(await res.text());
      return res;
    } catch (err: any) {
      if (abortSignal?.aborted) throw err;
      if (retries > 0)
        return await fetchWithRetry(url, options, retries - 1, abortSignal);

      throw err;
    }
  }

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
  // Fetch existing record
  // ----------------------------------------------------
  async function fetchExisting(showToast = false): Promise<void> {
    if (!selectedDate) return;

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

      setFormErrors({});

      if (data.status === "empty") {
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

      const f = data.fields || {};
      const lockStatus = (f["Lock Status"] || "").trim();

      setRecordId(data.id);
      setIsLocked(lockStatus.toLowerCase() === "locked");
      setForm(mapFields(f));

      if (showToast)
        toast.success(`Record loaded (${lockStatus || "Unlocked"})`);
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Error fetching record.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedDate) return;
    void fetchExisting(true);
  }, [selectedDate, store]);

  // ----------------------------------------------------
  // SAVE
  // ----------------------------------------------------
  const handleSave = async () => {
    if (isLocked) return toast.error("This record is locked.");

    // Validate required numeric fields
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    numericFields.forEach((field) => {
      if (form[field] === "" || form[field] === null) {
        newErrors[field] = "Required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

    const isCreate = !recordId;

    if (isCreate) {
      const ok = window.confirm(
        "This will CREATE a new record and LOCK it. Continue?",
      );
      if (!ok) return;
    }

    try {
      setIsSaving(true);

      const payload = {
        business_date: selectedDate,
        store,
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

      const res = await fetch(`${BACKEND_URL}/closings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      toast.success(data.action === "created" ? "Record created!" : "Updated!");

      setIsLocked(String(data.lock_status).toLowerCase() === "locked");
      await fetchExisting(false);
    } catch (err) {
      toast.error("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // Unlock
  // ----------------------------------------------------
  async function handleUnlock() {
    const pin = window.prompt("Manager PIN:");
    if (!pin) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/closings/${recordId}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        },
      );

      if (!res.ok) throw new Error("Unlock failed");

      toast.success("Unlocked!");
      setIsLocked(false);
      await fetchExisting(true);
    } catch {
      toast.error("Invalid PIN");
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded-md px-3 py-2 " +
    (isLocked ? "bg-gray-100 text-gray-500" : "");

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center">
      <Toaster position="top-center" />

      <div className="w-full max-w-2xl bg-white shadow-md rounded-xl p-6">
        {/* HEADER */}
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              🧾 Daily Closing Form — {store}
            </h1>

            <div className="flex items-center gap-3">
              <span>Business Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const d = e.target.value;
                  setSelectedDate(d);
                  setForm((prev) => ({ ...prev, date: d }));
                  setFormErrors({});
                }}
                className="border border-gray-300 rounded-md px-2 py-1"
                disabled={false}
              />

              {selectedDate && (
                <span
                  className={
                    "px-2 py-1 rounded text-xs " +
                    (isLocked
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800")
                  }
                >
                  {isLocked ? "Locked" : "Unlocked"}
                </span>
              )}
            </div>
          </div>

          {selectedDate && isLocked && (
            <div className="mt-2 p-2 text-sm border rounded bg-yellow-50 text-yellow-700">
              🔒 This record is locked. Unlock to edit.
            </div>
          )}
        </header>

        {/* NO DATE SELECTED */}
        {!selectedDate && (
          <p className="text-center text-gray-500 py-10 italic">
            Please choose a business date.
          </p>
        )}

        {/* LOADING */}
        {selectedDate && loading && (
          <p className="text-center text-gray-500 py-6">Loading…</p>
        )}

        {/* FORM CONTENT */}
        {selectedDate && !loading && (
          <>
            {/* SALES */}
            <section className="mb-6">
              <h2 className="font-medium text-center mb-2">Sales Inputs</h2>
              <div className="grid grid-cols-2 gap-3">
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
                    <label>{label}</label>
                    <input
                      type="number"
                      value={form[field]}
                      disabled={isLocked}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className={inputCls}
                    />
                    {formErrors[field] && (
                      <p className="text-xs text-red-500">{formErrors[field]}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* BUDGETS */}
            <section className="mb-6">
              <h2 className="font-medium text-center mb-2">Requested Budgets</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Kitchen Budget", "kitchenBudget"],
                  ["Bar Budget", "barBudget"],
                  ["Non-Food Budget", "nonFoodBudget"],
                  ["Staff Meal Budget", "staffMealBudget"],
                ] as const).map(([label, field]) => (
                  <div key={field}>
                    <label>{label}</label>
                    <input
                      type="number"
                      value={form[field]}
                      disabled={isLocked}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className={inputCls}
                    />
                    {formErrors[field] && (
                      <p className="text-xs text-red-500">{formErrors[field]}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* CASH COUNT */}
            <section className="mb-6">
              <h2 className="font-medium text-center mb-2">Cash Count Inputs</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Actual Cash Counted", "actualCashCounted"],
                  ["Cash Float", "cashFloat"],
                ] as const).map(([label, field]) => (
                  <div key={field}>
                    <label>{label}</label>
                    <input
                      type="number"
                      value={form[field]}
                      disabled={isLocked}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className={inputCls}
                    />
                    {formErrors[field] && (
                      <p className="text-xs text-red-500">{formErrors[field]}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* SUMMARY */}
            <section className="bg-gray-50 border rounded p-4 mb-6">
              <h2 className="font-semibold text-center mb-2">Summary</h2>
              <div className="grid grid-cols-2 text-sm">
                <div>Variance:</div>
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

            {/* FOOTER BUTTONS */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Submitted by: {submittedBy}</p>

              <div className="flex gap-2">
                {isLocked ? (
                  <>
                    <button
                      onClick={handleUnlock}
                      className="px-4 py-2 border rounded"
                    >
                      Unlock (Manager)
                    </button>
                    <button
                      disabled
                      className="px-6 py-2 bg-gray-300 text-white rounded"
                    >
                      Locked
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !isFormValid}
                    className={`px-6 py-2 rounded text-white font-medium
                      ${
                        !isFormValid || isSaving
                          ? "bg-gray-300 cursor-not-allowed"
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
};

export default CashierForm;
