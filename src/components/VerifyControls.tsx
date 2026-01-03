// src/components/VerifyControls.tsx
import React, { useState } from "react";
import { verifyClosing } from "@/lib/api";
import toast from "react-hot-toast";

export default function VerifyControls({
  record,
  onUpdate,
}: {
  record: any;
  onUpdate: (updated: any) => void;
}) {
  const [notes, setNotes] = useState(
    record.fields["Verification Notes"] || ""
  );

  // Admin deposit adjustment fields
  const [cardTips, setCardTips] = useState<number | "">(
    record.fields["Card Tips"] ?? ""
  );
  const [returnedChange, setReturnedChange] = useState<number | "">(
    record.fields["Returned Change"] ?? ""
  );
  const [reimbursements, setReimbursements] = useState<number | "">(
    record.fields["Reimbursements"] ?? ""
  );

  const [loading, setLoading] = useState(false);

  const sessionRaw = localStorage.getItem("session");
  const session = sessionRaw ? JSON.parse(sessionRaw) : {};
  const verifiedBy = session.name || "Manager";

  const verifiedStatus = record.fields["Verified Status"];
  const isVerified = verifiedStatus === "Verified";

  async function handleVerify(status: "Verified" | "Needs Update") {
    if (isVerified && status === "Verified") return;

    setLoading(true);

    try {
      const payload = {
        record_id: record.id,
        status,
        verified_by: verifiedBy,
        notes,

        card_tips: cardTips === "" ? null : Math.max(0, Number(cardTips)),
        returned_change:
          returnedChange === "" ? null : Math.max(0, Number(returnedChange)),
        reimbursements:
          reimbursements === "" ? null : Math.max(0, Number(reimbursements)),
      };

      await verifyClosing(payload);

      toast.success(
        status === "Verified"
          ? "Closing verified successfully!"
          : "Marked as: Needs Update"
      );

      onUpdate({
        ...record,
        fields: {
          ...record.fields,
          "Verified Status": status,
          "Verification Notes": notes,
          "Verified By": verifiedBy,
          "Verified At": new Date().toISOString(),
          "Card Tips": cardTips,
          "Returned Change": returnedChange,
          "Reimbursements": reimbursements,
        },
      });
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

      <div className="space-y-3 pt-2">
        <h4 className="font-medium text-gray-700">
          Deposit Adjustments (Admin)
        </h4>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Card Tips</label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="border rounded px-3 py-2"
            value={cardTips}
            onChange={(e) =>
              setCardTips(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Returned Change</label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="border rounded px-3 py-2"
            value={returnedChange}
            onChange={(e) =>
              setReturnedChange(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Reimbursements</label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="border rounded px-3 py-2"
            value={reimbursements}
            onChange={(e) =>
              setReimbursements(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
        </div>
      </div>

      {isVerified && (
        <p className="text-sm text-green-700">
          This closing has been verified. You may still mark it as “Needs Update”
          if corrections are required.
        </p>
      )}

      <div className="flex gap-4 pt-2">
        <button
          disabled={loading || isVerified}
          onClick={() => handleVerify("Verified")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
        >
          Verify Closing
        </button>

        <button
          disabled={loading}
          onClick={() => handleVerify("Needs Update")}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300"
        >
          Mark Needs Update
        </button>
      </div>
    </div>
  );
}