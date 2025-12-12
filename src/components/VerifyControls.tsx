// src/components/VerifyControls.tsx
import React, { useState } from "react";
import { verifyClosing } from "@/lib/api";
import toast from "react-hot-toast";

export default function VerifyControls({ record, onUpdate }: { record: any; onUpdate: (updated: any) => void }) {
  const [notes, setNotes] = useState(record.fields["Verification Notes"] || "");
  const [loading, setLoading] = useState(false);

  const sessionRaw = localStorage.getItem("session");
  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
  const verifiedBy = session.name || "Manager";

  // ---------------------------------------------
  // Handle Verify / Needs Update logic
  // ---------------------------------------------
  async function handleVerify(status: "Verified" | "Needs Update") {
    setLoading(true);

    try {
      const res = await verifyClosing({
        record_id: record.id,
        status,
        verified_by: verifiedBy,
        notes,
      });

      // ⭐ Show confirmation
      if (status === "Verified") {
        toast.success("Closing verified successfully!");
      } else {
        toast.success("Marked as: Needs Update");
      }

      // ⭐ Update the UI without refreshing
      const updatedRecord = {
        ...record,
        fields: {
          ...record.fields,
          "Verified Status": status,
          "Verification Notes": notes,
          "Verified By": verifiedBy,
          "Verified At": new Date().toISOString(),
        },
      };

      onUpdate(updatedRecord); // Update parent state

    } catch (err) {
      console.error(err);
      toast.error("Failed to update verification status.");
    }

    setLoading(false);
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm space-y-4">
      <h3 className="font-semibold text-gray-700">Verification Notes</h3>

      <textarea
        className="w-full border rounded px-3 py-2 min-h-[100px]"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes for cashier..."
      />

      <div className="flex gap-4">
        {/* VERIFIED BUTTON */}
        <button
          disabled={loading}
          onClick={() => handleVerify("Verified")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
        >
          {loading ? "Saving..." : "Verify Closing"}
        </button>

        {/* NEEDS UPDATE BUTTON */}
        <button
          disabled={loading}
          onClick={() => handleVerify("Needs Update")}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
        >
          {loading ? "Saving..." : "Mark Needs Update"}
        </button>
      </div>
    </div>
  );
}
