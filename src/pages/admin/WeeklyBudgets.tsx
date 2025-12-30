import { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://restaurant-ops-backend.onrender.com";

type BudgetStatus = "draft" | "locked";

type Store = {
  id: string;
  name: string;
};

export default function WeeklyBudgets() {
  // ------------------------------
  // State
  // ------------------------------
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  const [weekStart, setWeekStart] = useState<string>("");

  const [kitchenBudget, setKitchenBudget] = useState<number>(0);
  const [barBudget, setBarBudget] = useState<number>(0);

  const [status, setStatus] = useState<BudgetStatus>("draft");
  const [hasSaved, setHasSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockedAt, setLockedAt] = useState<string | null>(null);
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  const [isPastWeek, setIsPastWeek] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBudget = kitchenBudget + barBudget;

  const session = JSON.parse(localStorage.getItem("session") || "{}");
  const userRole = session.role;
  const allowedStoreIds =
    session.storeAccess?.map((s: any) => s.id) || [];

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

  function formatWeekRange(monday: string) {
    const start = new Date(monday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getSunday(monday: Date) {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d;
  }

  // ------------------------------
  // Load stores (role-aware)
  // ------------------------------
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch(`${API_BASE}/stores`);
        const data: Store[] = await res.json();

        if (userRole === "admin") {
          setStores(data || []);
        } else {
          const filtered = (data || []).filter((s) =>
            allowedStoreIds.includes(s.id)
          );
          setStores(filtered);

          // Auto-select store if manager has only one
          if (filtered.length === 1) {
            setStoreId(filtered[0].id);
          }
        }
      } catch (err) {
        console.error("❌ Failed to load stores:", err);
        setError("Failed to load stores");
      }
    };

    fetchStores();
  }, []);

  // ------------------------------
  // Init current week
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
          `${API_BASE}/weekly-budgets?store_id=${storeId}&business_date=${weekStart}`
        );

        if (res.ok) {
          const data = await res.json();

          if (!data || !data.week_start) {
            setKitchenBudget(0);
            setBarBudget(0);
            setStatus("draft");
            setHasSaved(false);
            setLastSavedAt(null);
            setLockedBy(null);
            setLockedAt(null);
          } else {
            setKitchenBudget(data.kitchen_budget || 0);
            setBarBudget(data.bar_budget || 0);
            setStatus(data.status === "locked" ? "locked" : "draft");
            setHasSaved(true);
            setLastSavedAt(data.updated_at || data.created_at || null);
            setLockedBy(data.locked_by || null);
            setLockedAt(data.locked_at || null);
          }
        } else {
          throw new Error("Failed to load weekly budget");
        }

        const selectedMonday = new Date(weekStart);
        const selectedSunday = getSunday(selectedMonday);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        setIsPastWeek(selectedSunday < today);

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
    if (!storeId || status === "locked" || isPastWeek) return;

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
      setLastSavedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------
  // Lock
  // ------------------------------
  async function confirmLockBudget() {
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
      setLockedBy("Admin");
      setLockedAt(new Date().toISOString());
      setShowLockConfirm(false);
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

        {/* Store Picker */}
        <div className="mb-4">
          <label className="block text-sm text-gray-600">Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Select store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Week Picker */}
        <div className="mb-6 space-y-2">
          <label className="block text-sm text-gray-600">Week (Monday)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) =>
              setWeekStart(formatDate(getMonday(new Date(e.target.value))))
            }
            className="border rounded px-3 py-2"
          />

          <p className="text-sm text-gray-600">
            Week: <strong>{formatWeekRange(weekStart)}</strong>
          </p>

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

          {status === "locked" && lockedAt && (
            <p className="text-xs text-gray-500">
              🔒 Locked by {lockedBy || "Admin"} on{" "}
              {formatDateTime(lockedAt)}
            </p>
          )}

          {lastSavedAt && status === "draft" && (
            <p className="text-xs text-gray-500">
              Last saved: {formatDateTime(lastSavedAt)}
            </p>
          )}
        </div>

        {/* Budget Inputs */}
        <div className="border rounded p-4 space-y-4 relative">
          {status === "locked" && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                🔒 Budget locked
              </span>
            </div>
          )}

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
              className="border rounded px-3 py-2 w-full disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm">Bar Weekly Budget</label>
            <input
              type="number"
              min={0}
              disabled={inputsDisabled}
              value={barBudget}
              onChange={(e) =>
                setBarBudget(Number(e.target.value) || 0)
              }
              className="border rounded px-3 py-2 w-full disabled:bg-gray-100"
            />
          </div>

          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600">Total Weekly Budget</p>
            <p className="text-lg font-semibold">
              ₱ {totalBudget.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        {status === "draft" && !isPastWeek && (
          <div className="mt-6 space-y-3">
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading || !storeId}
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              >
                Save Budget
              </button>

              {hasSaved && (
                <button
                  onClick={() => setShowLockConfirm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Lock Budget
                </button>
              )}
            </div>

            {showLockConfirm && (
              <div className="border border-red-200 bg-red-50 p-4 rounded text-sm">
                <p className="text-red-700 font-medium mb-2">
                  Locking will permanently prevent edits for this week.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={confirmLockBudget}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Confirm Lock
                  </button>
                  <button
                    onClick={() => setShowLockConfirm(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
    </AdminLayout>
  );
}