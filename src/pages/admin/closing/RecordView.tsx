import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { BACKEND_URL } from "@/lib/api";

export default function RecordView() {
  const { recordId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [store, setStore] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<string>("");

  // ----------------------------------------------------
  // Load full closing record
  // ----------------------------------------------------
  async function loadRecord() {
    if (!recordId) return;

    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/closings/${recordId}`);
      const data = await res.json();

      if (data && data.fields) {
        setFields(data.fields);
        setStore(data.fields["Store Name"] || data.fields["Store"]);
        setLockStatus(data.fields["Lock Status"]);
      }

      // fetch summary (backend-computed)
      const businessDate = data?.fields?.Date;
      const storeId = data?.fields?.Store?.[0];

      if (businessDate && storeId) {
        const summaryRes = await fetch(
          `${BACKEND_URL}/dashboard/closings?store_id=${storeId}&business_date=${businessDate}`
        );
        const s = await summaryRes.json();
        setSummary(s.summary);
      }

    } catch (err) {
      console.error("❌ Failed to load record:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const peso = (n: number | string | null | undefined) =>
    !n && n !== 0 ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Closing Record Details
            </h1>
            <p className="text-gray-600">
              Record ID: {recordId} {store ? `— ${store}` : ""}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              onClick={() => navigate("/admin")}
            >
              ← Back to Dashboard
            </button>

            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => navigate(`/admin/verify/${recordId}`)}
            >
              Verify Closing →
            </button>
          </div>
        </div>

        {/* LOADING */}
        {loading && <p className="text-gray-500">Loading record…</p>}

        {/* SUMMARY CARDS */}
        {summary && !loading && (
          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <div className="p-4 bg-white shadow rounded-xl border">
              <p className="text-xs text-gray-500">Variance</p>
              <p className={`text-lg font-bold ${summary.variance < 0 ? "text-red-600" : "text-green-700"}`}>
                {peso(summary.variance)}
              </p>
            </div>
            <div className="p-4 bg-white shadow rounded-xl border">
              <p className="text-xs text-gray-500">Total Budgets</p>
              <p className="text-lg font-bold">{peso(summary.total_budgets)}</p>
            </div>
            <div className="p-4 bg-white shadow rounded-xl border">
              <p className="text-xs text-gray-500">Cash for Deposit</p>
              <p className="text-lg font-bold">{peso(summary.cash_for_deposit)}</p>
            </div>
            <div className="p-4 bg-white shadow rounded-xl border">
              <p className="text-xs text-gray-500">Transfer Needed</p>
              <p className="text-lg font-bold text-red-600">
                {peso(summary.transfer_needed)}
              </p>
            </div>
          </div>
        )}

        {/* LOCK STATUS */}
        {fields && (
          <div className="mt-4">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                lockStatus === "Locked"
                  ? "bg-yellow-200 text-yellow-800"
                  : "bg-green-200 text-green-800"
              }`}
            >
              {lockStatus}
            </span>
          </div>
        )}

        {/* FULL FIELD TABLE */}
        {fields && (
          <div className="overflow-x-auto bg-white shadow rounded-xl border mt-6">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(fields).map(([key, value]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="p-3 font-medium text-gray-700">{key}</td>
                    <td className="p-3 text-gray-900">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!fields && !loading && (
          <p className="text-gray-500">No record found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
