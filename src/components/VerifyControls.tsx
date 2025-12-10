import React, { useState } from "react";
import { verifyRecord } from "@/lib/api";
import toast from "react-hot-toast";

export default function VerifyControls({ record }: { record: any }) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(record.fields["Verification Notes"] || "");

  if (!record || !record.id || !record.fields) return null;

  const status = record.fields["Verified Status"];

  async function updateStatus(newStatus: string) {
    setLoading(true);

    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      await verifyRecord(record.id, newStatus, session.name, notes);

      toast.success(`Status updated to ${newStatus}`);
      window.location.reload();
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="mt-8 bg-white rounded-xl p-6 shadow-sm space-y-4">

      {/* Notes Field */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700">
          Verification Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border rounded-md p-3 mt-1 w-full h-24"
          placeholder="Add notes for cashier or audit purposes…"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        {status !== "Verified" && (
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300"
            disabled={loading}
            onClick={() => updateStatus("Verified")}
          >
            Verify Closing
          </button>
        )}

        {status !== "Needs Update" && (
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
            disabled={loading}
            onClick={() => updateStatus("Needs Update")}
          >
            Mark Needs Update
          </button>
        )}
      </div>
    </div>
  );
}
