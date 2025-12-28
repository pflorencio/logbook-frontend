import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://restaurant-ops-backend.onrender.com";

type BudgetStatus = "draft" | "locked";

export default function WeeklyBudgetsPage() {
  const router = useRouter();

  // ---- Core State ----
  const [storeId, setStoreId] = useState<string>("recFhwPiq5KJIoofp"); // default for now
  const [weekStart, setWeekStart] = useState<string>("");

  const [kitchenBudget, setKitchenBudget] = useState<number>(0);
  const [barBudget, setBarBudget] = useState<number>(0);

  const [status, setStatus] = useState<BudgetStatus>("draft");
  const [hasSaved, setHasSaved] = useState(false);
  const [isPastWeek, setIsPastWeek] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBudget = kitchenBudget + barBudget;

  // ---- Helpers ----
  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function formatDate(date: Date) {
    return date.toISOString().split("T")[0];
  }

  // ---- Initialize week to current Monday ----
  useEffect(() => {
    if (!weekStart) {
      const monday = getMonday(new Date());
      setWeekStart(formatDate(monday));
    }
  }, [weekStart]);

  // ---- Fetch budget when store/week changes ----
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
          // No budget yet
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

        // Past week guard
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

  // ---- Save Budget ----
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

  // ---- Lock Budget ----
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

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Weekly Budget Setup</h1>

      {/* Context */}
      <div className="mb-6 space-y-2">
        <div>
          <label className="block text-sm text-gray-600">Week (Monday)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <div>
          <span className="text-sm font-medium">
            Status:{" "}
            {status === "locked" ? (
              <span className="text-blue-600">Locked</span>
            ) : (
              <span className="text-yellow-600">Draft</span>
            )}
          </span>
        </div>

        {isPastWeek && (
          <div className="text-sm text-red-600">
            Past weeks cannot be edited.
          </div>
        )}
      </div>

      {/* Budget Card */}
      <div className="border rounded p-4 space-y-4">
        <div>
          <label className="block text-sm">Kitchen Weekly Budget</label>
          <input
            type="number"
            min={0}
            value={kitchenBudget}
            disabled={inputsDisabled}
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
            value={barBudget}
            disabled={inputsDisabled}
            onChange={(e) => setBarBudget(Number(e.target.value) || 0)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        <div className="pt-2 border-t">
          <div className="text-sm text-gray-600">Total Weekly Budget</div>
          <div className="text-lg font-semibold">
            ₱ {totalBudget.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {status === "draft" && !isPastWeek && (
          <>
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
          </>
        )}
      </div>

      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
