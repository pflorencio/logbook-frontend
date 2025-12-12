// src/pages/admin/reports.tsx
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { fetchClosings } from "@/lib/api";
import ClosingDetailsTable from "@/components/ClosingDetailsTable";
import StatusBadge from "@/components/StatusBadge";
import VerifyControls from "@/components/VerifyControls";

const AdminReports: React.FC = () => {
  const [store, setStore] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Session data (store access restrictions)
  const sessionRaw =
    typeof window !== "undefined" ? localStorage.getItem("session") : null;
  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
  const storeAccess = session.storeAccess || session.store_access || [];

  // Read query params from URL when page mounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const storeFromQuery = params.get("store_id");
    const dateFromQuery = params.get("business_date");

    if (storeFromQuery && storeFromQuery !== "undefined") {
      setStore(storeFromQuery);
    } else if (storeAccess.length === 1) {
      // Fallback: auto-select single store
      setStore(storeAccess[0].id);
    }

    if (dateFromQuery && dateFromQuery !== "undefined") {
      setBusinessDate(dateFromQuery);
    }
  }, []);

  // Whenever both store + date are set, auto-load report
  useEffect(() => {
    if (store && businessDate) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, businessDate]);

  // Load the report based on store + date
  async function loadReport() {
    if (!store || !businessDate) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchClosings(businessDate, store);

      if (!res.records || res.records.length === 0) {
        setError("No closing record found for this date.");
        setClosing(null);
      } else {
        setClosing(res.records[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load report.");
    }

    setLoading(false);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-2">Daily Closing Reports</h1>
      <p className="text-gray-600 mb-6">
        Select a store and business date to view the full closing record.
      </p>

      {/* Filters */}
      <div className="bg-white rounded-lg p-5 shadow-sm flex gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Store</label>
          <select
            className="border rounded px-3 py-2"
            value={store}
            onChange={(e) => setStore(e.target.value)}
          >
            <option value="">Choose store...</option>
            {storeAccess.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Business Date</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={businessDate}
            onChange={(e) => setBusinessDate(e.target.value)}
          />
        </div>

        <button
          onClick={loadReport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          {loading ? "Loading..." : "Load Report"}
        </button>
      </div>

      {/* Results */}
      <div className="mt-6 space-y-6">
        {error && <p className="text-red-500">{error}</p>}

        {!error && closing && (
          <>
            {/* Status Badge */}
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={closing.fields["Verified Status"]} />
            </div>

            {/* Verification Notes (visible card) */}
            {"Verification Notes" in closing.fields && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-1">
                  Manager Notes:
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {closing.fields["Verification Notes"]?.trim() ||
                    "No notes added."}
                </p>
              </div>
            )}

            {/* Full Closing Table */}
            <ClosingDetailsTable record={closing} />

            {/* Verification Controls */}
            <VerifyControls
              record={closing}
              onUpdate={(updatedRecord) => setClosing(updatedRecord)}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
