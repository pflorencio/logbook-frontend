import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { fetchPendingClosings } from "@/lib/api";
import { Link } from "react-router-dom";

export default function VerificationQueue() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    try {
      const res = await fetchPendingClosings();
      setRecords(res.records || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load verification queue.");
    }
    setLoading(false);
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

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-2">Verification Queue</h1>

      <p className="text-gray-600 mb-6">
        These closing reports are waiting for verification or require updates from management.
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
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-gray-500 text-center">
                    🎉 All closings are fully verified!
                  </td>
                </tr>
              )}

              {records.map((rec: any) => {
                const f = rec.fields;

                const date = f["Date"];
                const storeName = f["Store"];
                const status = f["Verified Status"];
                const submittedBy = f["Submitted By"] ?? "—";

                return (
                  <tr key={rec.id} className="border-b text-sm">
                    <td className="py-3">{date}</td>
                    <td className="py-3">{storeName}</td>
                    <td className="py-3">{getStatusBadge(status)}</td>
                    <td className="py-3">{submittedBy}</td>

                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/reports?store=${encodeURIComponent(
                          storeName
                        )}&date=${encodeURIComponent(date)}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Review →
                      </Link>
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
}