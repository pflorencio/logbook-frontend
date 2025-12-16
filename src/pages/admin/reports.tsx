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

  const sessionRaw =
    typeof window !== "undefined" ? localStorage.getItem("session") : null;
  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
  const storeAccess = session.storeAccess || session.store_access || [];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const storeFromQuery = params.get("store_id");
    const dateFromQuery = params.get("business_date");

    if (storeFromQuery && storeFromQuery !== "undefined") {
      setStore(storeFromQuery);
    } else if (storeAccess.length === 1) {
      setStore(storeAccess[0].id);
    }

    if (dateFromQuery && dateFromQuery !== "undefined") {
      setBusinessDate(dateFromQuery);
    }
  }, []);

  useEffect(() => {
    if (store && businessDate) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, businessDate]);

  async function loadReport() {
    if (!store || !businessDate) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetchClosings(businessDate, store);

      if (!res.records || res.records.length === 0) {
        setClosing(null);
        setError("No closing submitted yet for this date.");
      } else {
        setClosing(res.records[0]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load report.");
    }

    setLoading(false);
  }

  // -----------------------------
  // Status interpretation
  // -----------------------------
  const status = closing?.fields?.["Verified Status"];

  let statusMessage = "";
  let statusTone: "info" | "success" | "warning" | "danger" = "info";

  if (!closing) {
    statusMessage = "Awaiting cashier submission.";
    statusTone = "warning";
  } else if (status === "Verified") {
    statusMessage = "Closing has been verified.";
    statusTone = "success";
  } else if (status === "Needs Update") {
    statusMessage = "Closing needs update from cashier.";
    statusTone = "danger";
  } else {
    statusMessage = "Submitted — pending verification.";
    statusTone = "info";
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

        {!error && (
          <div
            className={`rounded-lg p-4 ${
              statusTone === "success"
                ? "bg-green-50 text-green-800"
                : statusTone === "danger"
                ? "bg-red-50 text-red-800"
                : statusTone === "warning"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {!error && closing && (
          <>
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
};

export default AdminReports;
