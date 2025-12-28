import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://restaurant-ops-backend.onrender.com";

type BudgetStatus = "draft" | "locked";

export default function WeeklyBudgets() {
  // ------------------------------
  // State
  // ------------------------------
  const [storeId, setStoreId] = useState<string>("recFhwPiq5KJIoofp"); // temp default
  const [weekStart, setWeekStart] = useState<string>("");

  const [kitchenBudget, setKitchenBudget] = useState<number>(0);
  const [barBudget, setBarBudget] = useState<number>(0);

  const [status, setStatus] = useState<BudgetStatus>("draft");
  const [hasSaved, setHasSaved] = useState(false);
  const [isPastWeek, setIsPastWeek] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBudget = kitchenBudget + barBudget;

  // ------------------------------
  // Helpers
  // ------------------------------
  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDate(date: Date) {
    return date.toISOString().split("T")[0];
  }

  // ------------------------------
  // Init current week (Monday)
  // ------------------------------
  useEffect(() => {
    if (!weekStart) {
      const monday = getMonday(new Date());
      setWeekStart(formatDate(monday));
    }
  }, [weekStart]);

  // ------------------------------
  // Fetch weekly budget
  // ------------------------------
  useEffect(() => {
    if (!storeId || !weekStart) return;

    const fetchBudget = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/weekly-budgets?store_id=${storeId}&week_start=${weekStart}`
        );

        if (res.status === 404) {
          setKitchenBudget(0);
          setBarBudget(0);
          setStatus("draft");
          setHasSaved(false);
        } else if (res.ok) {
          const data = await res.json();
          setKitchenBudget(data.kitchen_budget || 0);
          setBarBudget(data.bar_budget || 0);
          setStatus(data.status === "locked" ? "locked" : "draft");
          setHasSaved(true);
        } else {
          throw new Error("Failed to load weekly budget");
        }

        const selected = new Date(weekStart);
        const currentMonday = getMonday(new Date());
        setIsPastWeek(selected < currentMonday);
      } catch (err: any) {
        setError(err.message || "Error loading budget");
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, [storeId, weekStart]);

  // ------------------------------
  // Save
  // ------------------------------
  async function handleSave() {
    if (status === "locked" || isPastWeek) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/weekly-budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          week_start: weekStart,
          kitchen_budget: kitchenBudget,
          bar_budget: barBudget,
        }),
      });

      if (!res.ok) throw new Error("Failed to save budget");

      setHasSaved(true);
      alert("Weekly budget saved");
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------
  // Lock
  // ------------------------------
  async function handleLock() {
    if (!hasSaved || status === "locked") return;

    const confirmLock = confirm(
      "Once locked, this weekly budget can no longer be edited. Continue?"
    );
    if (!confirmLock) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/weekly-budgets/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          week_start: weekStart,
          locked_by: "Admin",
        }),
      });

      if (!res.ok) throw new Error("Failed to lock budget");

      setStatus("locked");
      alert("Weekly budget locked");
    } catch (err: any) {
      setError(err.message || "Lock failed");
    } finally {
      setLoading(false);
    }
  }

  const inputsDisabled = status === "locked" || isPastWeek || loading;

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <AdminLayout>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-6">Weekly Budget Setup</h1>

        <div className="mb-6 space-y-2">
          <div>
            <label className="block text-sm text-gray-600">
              Week (Monday)
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => {
                const selected = new Date(e.target.value);
                const monday = getMonday(selected);
                setWeekStart(formatDate(monday));
              }}
              className="border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Budget applies to the full week (Monday–Sunday)
            </p>
          </div>

          <div className="text-sm">
            Status:{" "}
            <span
              className={
                status === "locked" ? "text-blue-600" : "text-yellow-600"
              }
            >
              {status === "locked" ? "Locked" : "Draft"}
            </span>
          </div>

          {isPastWeek && (
            <p className="text-sm text-red-600">
              Past weeks cannot be edited.
            </p>
          )}
        </div>

        <div className="border rounded p-4 space-y-4">
          <div>
            <label className="block text-sm">Kitchen Weekly Budget</label>
            <input
              type="number"
              min={0}
              disabled={inputsDisabled}
              value={kitchenBudget}
              onChange={(e) =>
                setKitchenBudget(Number(e.target.value) || 0)
              }
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm">Bar Weekly Budget</label>
            <input
              type="number"
              min={0}
              disabled={inputsDisabled}
              value={barBudget}
              onChange={(e) => setBarBudget(Number(e.target.value) || 0)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600">Total Weekly Budget</p>
            <p className="text-lg font-semibold">
              ₱ {totalBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {status === "draft" && !isPastWeek && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
            >
              Save Budget
            </button>

            {hasSaved && (
              <button
                onClick={handleLock}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Lock Budget
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
    </AdminLayout>
  );
}