import React, { useEffect, useState } from "react";
import {
  fetchClosings,
  fetchDailySummary,
  verifyRecord,
  updateField,
  type ClosingRecord,
} from "../lib/api";

// --------- Types ---------
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

// ----------------------------------------------------

export default function Dashboard() {
  const [date, setDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<{ [id: string]: boolean }>({});
  const [cellStatus, setCellStatus] = useState<CellStatusMap>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // --- Toast helper ---
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // --- Fetch data ---
  async function loadData(selectedDate: string) {
    setLoading(true);
    setDebugInfo(`Fetching for: ${selectedDate}`);

    try {
      const closings = await fetchClosings(selectedDate);
      const data = (closings.records || []) as RecordItem[];
      setRecords(data);

      const daily = await fetchDailySummary(selectedDate);
      setSummary(daily.preview || "");
    } catch (err: any) {
      console.error("❌ loadData error:", err);
      setDebugInfo(`Error fetching data: ${err.message}`);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData(date);
  }, [date]);

  // --- Inline edit ---
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

      // 🔧 Call API using the typed signature from api.ts
      await updateField(recordId, fieldName, numericValue);

      // Update UI optimistically
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                fields: {
                  ...r.fields,
                  [fieldName]: numericValue,
                },
              }
            : r
        )
      );

      setCellStatus((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [fieldName]: "success" },
      }));

      showToast("✅ Saved successfully", "success");
    } catch (err) {
      console.error("Error updating field:", err);
      setCellStatus((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [fieldName]: "error" },
      }));
      showToast("⚠️ Failed to save", "error");
    } finally {
      setTimeout(() => {
        setCellStatus((prev) => ({
          ...prev,
          [recordId]: { ...prev[recordId], [fieldName]: null },
        }));
      }, 1500);
    }
  };

  // --- Verify record ---
  const handleVerify = async (id: string, status: string) => {
    try {
      setVerifying((prev) => ({ ...prev, [id]: true }));
      await verifyRecord(id, status, "Patrick Florencio");
      showToast(`✅ Record ${status}`, "success");

      await loadData(date);

      // Auto-refresh summary if all verified
      const allVerified = records.every(
        (r) =>
          (r.fields["Verified Status"] || "").toLowerCase() === "verified"
      );

      if (allVerified) {
        const daily = await fetchDailySummary(date);
        setSummary(daily.preview || "");
        showToast("📊 All stores verified — summary refreshed", "info");
      }
    } catch (err) {
      console.error("Verify error:", err);
      showToast("⚠️ Verification failed", "error");
    } finally {
      setVerifying((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ----------------------------------------------------

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">
        Daily Operations Dashboard
      </h1>

      {/* Date Selector */}
      <div className="flex justify-center mb-6">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border px-3 py-2 rounded shadow-sm"
        />
      </div>

      {/* Toast */}
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

      {/* Debug Info */}
      <div className="text-xs text-gray-400 text-center mb-4 whitespace-pre-line">
        {debugInfo}
      </div>

      {loading && <p className="text-center text-gray-500">Loading data...</p>}

      {!loading &&
        records.map((r) => {
          const f: AirtableFields = r.fields || {};

          return (
            <div
              key={r.id}
              className="bg-white rounded-lg shadow-md mb-6 border border-gray-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-t-lg">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  🏪 {f.Store || "Unknown Store"}
                </h2>
                <span className="text-xs text-gray-500">
                  Last updated:{" "}
                  {f["Last Updated At"]
                    ? new Date(f["Last Updated At"]).toLocaleString()
                    : "—"}
                </span>
              </div>

              {/* Table */}
              <table className="w-full text-sm">
                <tbody>
                  {[
                    "Total Sales",
                    "Net Sales",
                    "Cash Payments",
                    "Card Payments",
                    "Digital Payments",
                    "Grab Payments",
                    "Voucher Payments",
                    "Bank Transfer Payments",
                    "Marketing Expenses",
                    "Actual Cash Counted",
                    "Cash Float",
                    "Variance (Cash Payments vs Actual)",
                    "Kitchen Budget",
                    "Bar Budget",
                    "Non Food Budget",
                    "Staff Meal Budget",
                    "Cash for Deposit",
                    "Transfer Needed",
                    "Submitted By",
                    "Verified Status",
                  ].map((field) => (
                    <tr
                      key={field}
                      className="border-t hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-2 w-1/2 font-medium text-gray-700">
                        {field}
                      </td>
                      <td className="p-2 w-1/2 text-right">
                        {typeof f[field] === "number" ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              className="w-28 border rounded px-2 py-1 text-right text-gray-700"
                              defaultValue={f[field]}
                              onBlur={(e) =>
                                handleInlineEdit(
                                  r.id,
                                  field,
                                  e.target.value
                                )
                              }
                            />
                            {cellStatus[r.id]?.[field] === "saving" && (
                              <span className="text-blue-500 text-xs">
                                Saving...
                              </span>
                            )}
                            {cellStatus[r.id]?.[field] === "success" && (
                              <span className="text-green-500 text-xs">✓</span>
                            )}
                            {cellStatus[r.id]?.[field] === "error" && (
                              <span className="text-red-500 text-xs">⚠</span>
                            )}
                          </div>
                        ) : (
                          f[field] || "-"
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Actions */}
                  <tr className="border-t bg-gray-50">
                    <td className="p-2 text-right font-semibold">Actions</td>
                    <td className="p-2 text-right space-x-2">
                      <button
                        disabled={verifying[r.id]}
                        onClick={() => handleVerify(r.id, "Verified")}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                      >
                        {verifying[r.id] ? "..." : "Verify"}
                      </button>

                      <button
                        disabled={verifying[r.id]}
                        onClick={() => handleVerify(r.id, "Flagged")}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                      >
                        {verifying[r.id] ? "..." : "Flag"}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

      {/* No data */}
      {!loading && records.length === 0 && (
        <p className="text-center text-gray-500 mt-4">
          No records found for this date.
        </p>
      )}

      {/* Management Summary */}
      {!loading && summary && (
        <div
          className="mt-8 p-4 border rounded bg-gray-50 whitespace-pre-wrap text-left shadow-inner scroll-smooth"
          id="management-summary"
        >
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            📊 Management Summary
          </h2>
          <pre className="text-sm">{summary}</pre>
        </div>
      )}
    </div>
  );
}
