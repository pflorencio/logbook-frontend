import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import AdminLayout from "../../components/AdminLayout";
import { fetchStores, BACKEND_URL } from "../../lib/api";

/* ---------------------------------------------
   Types
--------------------------------------------- */

interface Store {
  id: string;
  name: string;
}

interface WeeklyBudgetHistoryRow {
  id: string;
  store_id: string;
  week_start: string;
  week_end: string;

  original_weekly_budget: number;
  weekly_budget_amount: number;
  kitchen_budget: number;
  bar_budget: number;
  food_cost_deducted: number;

  status: string;
  locked_at?: string;
}

/* ---------------------------------------------
   Page Component
--------------------------------------------- */
function WeeklyBudgetHistoryPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rows, setRows] = useState<WeeklyBudgetHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------
     Load Stores (aligned with api.ts)
  --------------------------------------------- */
  useEffect(() => {
    fetchStores()
      .then(setStores)
      .catch(() => {
        setError("Failed to load stores");
      });
  }, []);

  /* ---------------------------------------------
     Fetch Weekly Budget History
  --------------------------------------------- */
  const fetchHistory = async () => {
    if (!storeId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        store_id: storeId,
      });

      if (startDate) params.append("from_date", startDate);
      if (endDate) params.append("to_date", endDate);

      const res = await fetch(
        `${BACKEND_URL}/weekly-budgets/history?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch weekly budget history");
      }

      const data = await res.json();
      setRows(data.results || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */
  const peso = (v: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(v || 0);

  const sum = (arr: number[]) =>
    arr.reduce((acc, v) => acc + (Number(v) || 0), 0);

  const avg = (arr: number[]) =>
    arr.length ? sum(arr) / arr.length : 0;

  /* ---------------------------------------------
     Derived totals
  --------------------------------------------- */
  const totalFoodCost = sum(
    rows.map((r) => r.food_cost_deducted)
  );

  const avgWeeklyBudget = avg(
    rows.map((r) => r.weekly_budget_amount)
  );

  /* ---------------------------------------------
     Render
  --------------------------------------------- */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Weekly Budget History</h1>
        <p className="text-sm text-gray-500">
          Read-only view of previously locked weekly budgets.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Store</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="border rounded px-3 py-2 w-48"
          >
            <option value="">Select store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={fetchHistory}
          disabled={!storeId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load History"}
        </button>
      </div>

      {/* Errors */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 text-sm">
            <tr>
              <th className="border px-3 py-2 text-left">Week</th>
              <th className="border px-3 py-2 text-right">Original Budget</th>
              <th className="border px-3 py-2 text-right">Final Budget</th>
              <th className="border px-3 py-2 text-right">Kitchen</th>
              <th className="border px-3 py-2 text-right">Bar</th>
              <th className="border px-3 py-2 text-right">Food Cost</th>
              <th className="border px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 px-4 py-6">
                  No records found
                </td>
              </tr>
            )}

            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2">
                  {r.week_start} → {r.week_end}
                </td>
                <td className="border px-3 py-2 text-right">
                  {peso(r.original_weekly_budget)}
                </td>
                <td className="border px-3 py-2 text-right font-medium">
                  {peso(r.weekly_budget_amount)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {peso(r.kitchen_budget)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {peso(r.bar_budget)}
                </td>
                <td className="border px-3 py-2 text-right">
                  {peso(r.food_cost_deducted)}
                </td>
                <td className="border px-3 py-2">
                  <span className="inline-block px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-gray-50 border-t text-sm font-semibold">
            <tr>
              <td className="border px-3 py-3">Totals / Averages</td>
              <td className="border px-3 py-3"></td>
              <td className="border px-3 py-3 text-right">
                Avg: {peso(avgWeeklyBudget)}
              </td>
              <td className="border px-3 py-3"></td>
              <td className="border px-3 py-3"></td>
              <td className="border px-3 py-3 text-right">
                {peso(totalFoodCost)}
              </td>
              <td className="border px-3 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------
   Page Export (Admin-safe)
--------------------------------------------- */

export default function WeeklyBudgetHistory() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <WeeklyBudgetHistoryPage />
      </AdminLayout>
    </ProtectedRoute>
  );
}