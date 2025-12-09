// src/pages/admin/reports.tsx

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { BACKEND_URL, fetchStores } from "@/lib/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ReportsPage() {
  const navigate = useNavigate();

  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [recordId, setRecordId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);

  // Load available stores (admin → all stores, manager → storeAccess)
  useEffect(() => {
    async function load() {
      try {
        const sessionRaw = localStorage.getItem("session");
        const session = sessionRaw ? JSON.parse(sessionRaw) : null;

        if (!session) return;

        if (session.role === "admin") {
          const allStores = await fetchStores();
          setStores(allStores);
        } else {
          setStores(session.storeAccess || [session.store].filter(Boolean));
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load stores.");
      }
    }
    load();
  }, []);

  // Fetch the full closing record for reporting
  async function loadReport() {
    if (!selectedStore || !selectedDate) {
      toast.error("Please select store and date.");
      return;
    }

    setLoading(true);
    setRecordId(null);
    setSummary(null);
    setDetails(null);

    try {
      // -----------------------------------
      // 1) Fetch summary
      // -----------------------------------
      const summaryRes = await fetch(
        `${BACKEND_URL}/dashboard/closings?store_id=${selectedStore}&business_date=${selectedDate}`
      );
      const sumData = await summaryRes.json();

      if (!sumData.summary) {
        toast.error("No closing data found for this date.");
        setLoading(false);
        return;
      }

      setSummary(sumData.summary);

      // -----------------------------------
      // 2) Fetch unique closing record to get ID
      // -----------------------------------
      const recordRes = await fetch(
        `${BACKEND_URL}/closings/unique?store_id=${selectedStore}&business_date=${selectedDate}`
      );
      const recordData = await recordRes.json();

      if (!recordData?.id) {
        toast.error("No closing record found.");
        setLoading(false);
        return;
      }

      setRecordId(recordData.id);

      // -----------------------------------
      // 3) Fetch detailed fields
      // -----------------------------------
      const detailsRes = await fetch(`${BACKEND_URL}/closings/${recordData.id}`);
      const detailsData = await detailsRes.json();

      setDetails(detailsData.fields || {});

    } catch (err) {
      console.error(err);
      toast.error("Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  const peso = (n: number | string | null | undefined) =>
    !n && n !== 0 ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;


  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily Closing Reports</h1>
          <p className="text-gray-600">
            Select a store and business date to view closing results.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end bg-white border rounded-xl p-6 shadow-sm">
          {/* Store picker */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Store</label>
            <select
              className="border rounded-lg px-4 py-2 mt-1 bg-white"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="">Choose store...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date picker */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600">Business Date</label>
            <input
              type="date"
              className="border rounded-lg px-4 py-2 mt-1 bg-white"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Button */}
          <button
            onClick={loadReport}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Load Report
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid md:grid-cols-4 xl:grid-cols-8 gap-4">

            <SummaryCard label="Variance" value={peso(summary.variance)} red={summary.variance < 0} />
            <SummaryCard label="Total Budgets" value={peso(summary.total_budgets)} />

            <SummaryCard label="Kitchen Budget" value={peso(summary.kitchen_budget || 0)} />
            <SummaryCard label="Bar Budget" value={peso(summary.bar_budget || 0)} />
            <SummaryCard label="Non-Food Budget" value={peso(summary.non_food_budget || 0)} />
            <SummaryCard label="Staff Meal Budget" value={peso(summary.staff_meal_budget || 0)} />

            <SummaryCard label="Cash for Deposit" value={peso(summary.cash_for_deposit)} />
            <SummaryCard label="Transfer Needed" value={peso(summary.transfer_needed)} red />
          </div>
        )}

        {/* Details Table */}
        {details && (
          <div className="bg-white shadow rounded-xl border mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(details).map(([key, value]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="p-3 font-medium text-gray-700">{key}</td>
                    <td className="p-3 text-gray-900">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Buttons */}
        {recordId && (
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => navigate(`/admin/closing/${recordId}`)}
              className="px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300"
            >
              View Full Closing Record
            </button>

            <button
              onClick={() => navigate(`/admin/verify/${recordId}`)}
              className="px-5 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              Verify Closing
            </button>
          </div>
        )}

        {loading && <p className="text-gray-500">Loading report…</p>}
      </div>
    </AdminLayout>
  );
}


// --------------------------------------------
// Summary Card Component
// --------------------------------------------
function SummaryCard({
  label,
  value,
  red,
}: {
  label: string;
  value: string;
  red?: boolean;
}) {
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${red ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
