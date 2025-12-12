// src/pages/admin/reports.tsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { fetchClosings } from "@/lib/api";
import ClosingDetailsTable from "@/components/ClosingDetailsTable";
import StatusBadge from "@/components/StatusBadge";
import VerifyControls from "@/components/VerifyControls";

export default function AdminReports() {
  const [store, setStore] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();

  // Session data
  const sessionRaw = localStorage.getItem("session");
  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
  const storeAccess = session.storeAccess || [];

  // Auto-select store if only one is available
  useEffect(() => {
    if (storeAccess.length === 1) {
      setStore(storeAccess[0].id);
    }
  }, []);

  // Load the report
  async function loadReport(selectedStore = store, selectedDate = businessDate) {
    if (!selectedStore || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchClosings(selectedDate, selectedStore);

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

  // ⭐ NEW: Load report automatically if URL contains ?store= & ?date=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlStore = params.get("store");
    const urlDate = params.get("date");

    if (urlStore && urlDate) {
      setStore(urlStore);
      setBusinessDate(urlDate);

      // Auto-load report
      loadReport(urlStore, urlDate);
    }
  }, [location.search]);

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
          onClick={() => loadReport()}
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
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge status={closing.fields["Verified Status"]} />
            </div>

            {closing.fields["Verification Notes"] && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-1">
                  Manager Notes:
                </h3>
                <p className="text-gray-700 whitespace-pre-line">
                  {closing.fields["Verification Notes"]?.trim()}
                </p>
              </div>
            )}

            <ClosingDetailsTable record={closing} />

            <VerifyControls
              record={closing}
              onUpdate={(updatedRecord) => setClosing(updatedRecord)}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
