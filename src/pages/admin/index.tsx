import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { fetchDashboardClosing } from "@/lib/api";
import { BACKEND_URL } from "@/lib/api";

// Utility
const peso = (n: number | string | null | undefined) =>
  !n && n !== 0 ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;

interface Store {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const session = JSON.parse(localStorage.getItem("session") || "{}");
  const allowedStores: Store[] = session.storeAccess || []; // fallback to one-store setup
  const primaryStore = session.store || null;

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>(primaryStore?.id || "");
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [summary, setSummary] = useState<any>(null);
  const [rawFields, setRawFields] = useState<any>(null);
  const [lockStatus, setLockStatus] = useState<string>("");

  // ----------------------------------------------------
  // Load stores list for dropdown
  // ----------------------------------------------------
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch(`${BACKEND_URL}/stores`);
        const data = await res.json();
        setStores(data);
      } catch (err) {
        console.error("Failed to load stores:", err);
      }
    }
    loadStores();
  }, []);

  // ----------------------------------------------------
  // Fetch dashboard summary
  // ----------------------------------------------------
  async function loadSummary() {
    if (!storeId || !date) return;

    setLoading(true);
    try {
      const result = await fetchDashboardClosing(storeId, date);

      if (result.status === "empty") {
        setSummary(null);
        setRawFields(null);
        setLockStatus("Unlocked");
        return;
      }

      setSummary(result.summary);
      setRawFields(result.raw_fields);
      setLockStatus(result.lock_status);
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  }

  // Trigger when store or date changes
  useEffect(() => {
    if (storeId && date) loadSummary();
  }, [storeId, date]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">

        {/* -------------------------------------------------- */}
        {/* HEADER */}
        {/* -------------------------------------------------- */}
        <h1 className="text-2xl font-semibold text-gray-900">
          Daily Closing Dashboard
        </h1>

        <div className="text-gray-600">
          View summaries and closing data per store per business day.
        </div>

        {/* -------------------------------------------------- */}
        {/* FILTER BAR */}
        {/* -------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-4 bg-white shadow p-4 rounded-xl border border-gray-100">

          {/* Store Selector */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Store</label>
            <select
              className="px-3 py-2 rounded-lg border bg-white"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">Select store...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Business Date</label>
            <input
              type="date"
              className="px-3 py-2 rounded-lg border bg-white"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* LOADING */}
        {/* -------------------------------------------------- */}
        {loading && <p className="text-gray-500 mt-4">Loading summary…</p>}

        {/* -------------------------------------------------- */}
        {/* SUMMARY CARDS */}
        {/* -------------------------------------------------- */}
        {summary && !loading && (
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-white rounded-xl shadow border">
              <p className="text-xs text-gray-500">Variance</p>
              <p className={`text-lg font-bold ${summary.variance < 0 ? "text-red-600" : "text-green-700"}`}>
                {peso(summary.variance)}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl shadow border">
              <p className="text-xs text-gray-500">Total Budgets</p>
              <p className="text-lg font-bold">{peso(summary.total_budgets)}</p>
            </div>

            <div className="p-4 bg-white rounded-xl shadow border">
              <p className="text-xs text-gray-500">Cash for Deposit</p>
              <p className="text-lg font-bold">{peso(summary.cash_for_deposit)}</p>
            </div>

            <div className="p-4 bg-white rounded-xl shadow border">
              <p className="text-xs text-gray-500">Transfer Needed</p>
              <p className="text-lg font-bold text-red-600">
                {peso(summary.transfer_needed)}
              </p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* RAW FIELDS TABLE */}
        {/* -------------------------------------------------- */}
        {rawFields && !loading && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Closing Details</h2>
            <div className="text-sm text-gray-500 mb-2">
              Status:{" "}
              <span
                className={`px-2 py-1 rounded-full ${
                  lockStatus === "Locked"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {lockStatus}
              </span>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl shadow border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(rawFields).map(([key, value]) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="p-3 font-medium text-gray-700">{key}</td>
                      <td className="p-3 text-gray-900">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* EMPTY STATE */}
        {/* -------------------------------------------------- */}
        {!summary && rawFields === null && !loading && storeId && date && (
          <p className="text-gray-500 mt-6">
            No closing record found for this store and date.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
