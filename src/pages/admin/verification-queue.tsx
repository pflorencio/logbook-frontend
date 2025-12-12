// src/pages/admin/verification-queue.tsx
import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { fetchPendingClosings } from "@/lib/api";
import { Link } from "react-router-dom";

interface QueueRecord {
  id: string;
  fields: Record<string, any>;
}

const VerificationQueue: React.FC = () => {
  const [records, setRecords] = useState<QueueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Session + store mapping (for pretty store names) ---
  const sessionRaw =
    typeof window !== "undefined" ? localStorage.getItem("session") : null;
  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
  const storeAccess = session.storeAccess || session.store_access || [];

  const storeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (storeAccess || []).forEach((s: any) => {
      if (s && s.id) {
        map[s.id] = s.name || s.label || s.id;
      }
    });
    return map;
  }, [storeAccess]);

  // --- Load queue from backend ---
  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPendingClosings();
      setRecords(res.records || []);
    } catch (err) {
      console.error("Verification queue load error:", err);
      setError("Failed to load verification queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  const getStatusBadge = (status: string) => {
    let color = "bg-gray-200 text-gray-700";

    if (status === "Pending") color = "bg-yellow-100 text-yellow-700";
    if (status === "Needs Update") color = "bg-red-100 text-red-700";
    if (status === "Verified") color = "bg-green-100 text-green-700";

    return (
      <span className={`px-2 py-1 text-xs rounded-md ${color}`}>
        {status}
      </span>
    );
  };

  const truncate = (text: string, length = 30) => {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + "…" : text;
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-2">Verification Queue</h1>

      <p className="text-gray-600 mb-6">
        These closing reports are waiting for verification or require updates
        from management.
      </p>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm p-5 overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="border-b text-left text-sm text-gray-600">
                <th className="py-2">Date</th>
                <th className="py-2">Store</th>
                <th className="py-2">Status</th>
                <th className="py-2">Submitted By</th>

                {/* NEW MANAGER NOTES COLUMN */}
                <th className="py-2">Manager Notes</th>

                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-gray-500 text-center">
                    🎉 All closings are fully verified!
                  </td>
                </tr>
              )}

              {records.map((rec) => {
                const f = rec.fields || {};

                const rawDate: string =
                  f["Date"] || f["Business Date"] || "";

                // "Store" is a linked field → usually an array of IDs
                const storeField = f["Store"];
                let storeId = "";
                if (Array.isArray(storeField) && storeField.length > 0) {
                  storeId = storeField[0];
                } else if (typeof storeField === "string") {
                  storeId = storeField;
                }

                const displayStoreName =
                  (storeId && storeNameById[storeId]) ||
                  f["Store Normalized"] ||
                  f["Store Name"] ||
                  storeId ||
                  "—";

                const status: string = f["Verified Status"] || "Pending";
                const submittedBy: string = f["Submitted By"] || "—";

                const notes: string = f["Verification Notes"] || "";

                const hasLink = !!storeId && !!rawDate;

                return (
                  <tr key={rec.id} className="border-b text-sm">
                    <td className="py-3">{rawDate || "—"}</td>
                    <td className="py-3">{displayStoreName}</td>
                    <td className="py-3">{getStatusBadge(status)}</td>
                    <td className="py-3">{submittedBy}</td>

                    {/* NEW MANAGER NOTES CELL */}
                    <td className="py-3 max-w-xs">
                      {notes ? (
                        <span title={notes} className="text-gray-700">
                          {truncate(notes, 40)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      {hasLink ? (
                        <Link
                          to={`/admin/reports?store_id=${encodeURIComponent(
                            storeId
                          )}&business_date=${encodeURIComponent(rawDate)}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Review →
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Missing store/date
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default VerificationQueue;
