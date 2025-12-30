// src/pages/admin/reports.tsx  (or Dashboard.tsx depending on your file structure)
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import {
  fetchClosings,
  fetchDailySummary,
  updateField,
  verifyRecord,
  type ClosingRecord,
} from "@/lib/api";

// Types
type RecordItem = ClosingRecord;
type AirtableFields = RecordItem["fields"];

interface CellStatusMap {
  [recordId: string]: {
    [fieldName: string]: "saving" | "success" | "error" | null;
  };
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export default function AdminDashboard() {
  // -------------------------------
  // SESSION INFORMATION
  // -------------------------------
  const session = JSON.parse(localStorage.getItem("session") || "{}");
  const userName = session.name || "Manager / Admin";
  const storeAccess = session.storeAccess || []; // array of { id, name }

  // -------------------------------
  // PAGE STATE
  // -------------------------------
  const [date, setDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [cellStatus, setCellStatus] = useState<CellStatusMap>({});
  const [verifying, setVerifying] = useState<{ [id: string]: boolean }>({});

  // -------------------------------
  // TOAST HELPER
  // -------------------------------
  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // -------------------------------
  // FETCH DATA
  // -------------------------------
  async function loadData() {
    setLoading(true);

    try {
      const closings = await fetchClosings(
        date,
        selectedStoreId !== "all" ? selectedStoreId : undefined
      );

      setRecords(closings.records || []);

      const daily = await fetchDailySummary(date);
      setSummary(daily.preview || "");
    } catch (err: any) {
      console.error("❌ loadData error:", err);
      showToast("Failed to load dashboard data.", "error");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [date, selectedStoreId]);

  // -------------------------------
  // INLINE EDIT HANDLER
  // -------------------------------
  const handleInlineEdit = async (
    recordId: string,
    fieldName: string,
    newValue: string
  ) => {
    try {
      setCellStatus((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [fieldName]: "saving" },
      }));

      const numericValue = Number(newValue) || 0;

      await updateField(recordId, fieldName, numericValue);

      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                fields: { ...r.fields, [fieldName]: numericValue },
              }
            : r
        )
      );

      setCellStatus((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [fieldName]: "success" },
      }));

      showToast("Saved!", "success");
    } catch (err) {
      console.error(err);
      setCellStatus((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [fieldName]: "error" },
      }));
      showToast("Save failed.", "error");
    } finally {
      setTimeout(() => {
        setCellStatus((prev) => ({
          ...prev,
          [recordId]: { ...prev[recordId], [fieldName]: null },
        }));
      }, 1500);
    }
  };

  // -------------------------------
  // VERIFY RECORD
  // -------------------------------
  const handleVerify = async (id: string, status: string) => {
    try {
      setVerifying((prev) => ({ ...prev, [id]: true }));

      await verifyRecord(id, status, userName);

      showToast(`Record ${status}`, "success");
      await loadData();
    } catch (err) {
      console.error("Verify error:", err);
      showToast("Verification failed", "error");
    } finally {
      setVerifying((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------
  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <h1 className="text-2xl font-bold mb-2">Daily Operations Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Review daily closings across all stores.
        </p>

        {/* FILTERS */}
        <div className="flex items-center gap-4 mb-6">
          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border px-3 py-2 rounded shadow-sm"
          />

          {/* Store Filter */}
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="border px-3 py-2 rounded shadow-sm"
          >
            <option value="all">All Stores</option>
            {storeAccess.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* TOAST */}
        {toast && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded text-white shadow-md z-50 ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "error"
                ? "bg-red-600"
                : "bg-blue-600"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <p className="text-center text-gray-500 py-6">Loading data…</p>
        )}

        {/* TABLE */}
        {!loading && (
          <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Store</th>
                  <th className="px-4 py-3 text-right">Total Sales</th>
                  <th className="px-4 py-3 text-right">Cash</th>
                  <th className="px-4 py-3 text-right">Card</th>
                  <th className="px-4 py-3 text-right">Digital</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      No data found.
                    </td>
                  </tr>
                )}

                {records.map((r) => {
                  const f: AirtableFields = r.fields;

                  const isLocked =
                    (f["Lock Status"] || "").toLowerCase() === "locked";

                  return (
                    <tr
                      key={r.id}
                      className="border-t hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">{f.Store || "—"}</td>

                      {/* Editable Numeric Fields */}
                      {[
                        "Total Sales",
                        "Cash Payments",
                        "Card Payments",
                        "Digital Payments",
                        "Variance (Cash Payments vs Actual)",
                      ].map((field) => (
                        <td key={field} className="px-4 py-3 text-right">
                          {typeof f[field] === "number" ? (
                            <input
                              type="number"
                              defaultValue={f[field]}
                              onBlur={(e) =>
                                handleInlineEdit(r.id, field, e.target.value)
                              }
                              disabled={isLocked}
                              className="w-24 border rounded px-2 py-1 text-right"
                            />
                          ) : (
                            f[field] || "—"
                          )}
                        </td>
                      ))}

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {isLocked ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                            Locked
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            Unlocked
                          </span>
                        )}
                      </td>

                      {/* Verify Buttons */}
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled={verifying[r.id]}
                          onClick={() => handleVerify(r.id, "Verified")}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          {verifying[r.id] ? "…" : "Verify"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SUMMARY */}
        {!loading && summary && (
          <div className="mt-8 p-4 bg-gray-50 border rounded shadow-sm whitespace-pre-wrap">
            <h2 className="text-lg font-bold mb-2">📊 Management Summary</h2>
            <pre className="text-sm">{summary}</pre>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
