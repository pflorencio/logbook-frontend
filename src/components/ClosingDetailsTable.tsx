// src/components/ClosingDetailsTable.tsx
import React from "react";

export default function ClosingDetailsTable({ record }: { record: any }) {
  if (!record || !record.fields) return null;

  const f = record.fields;

  // Format helpers
  const peso = (v: any) =>
    typeof v === "number" ? `₱${v.toLocaleString()}` : v ?? "-";

  const row = (label: string, value: any) => (
    <div className="flex justify-between py-2 border-b">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-8">

      {/* ---------- STATUS ---------- */}
      <div>
        <span className="text-sm font-semibold text-gray-700">Status:</span>
        <span
          className={`ml-2 px-3 py-1 text-xs rounded-full ${
            f["Lock Status"] === "Locked"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {f["Lock Status"] || "Unlocked"}
        </span>
      </div>

      {/* ---------- SALES / PAYMENTS ---------- */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Sales & Payments</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {row("Total Sales", peso(f["Total Sales"]))}
          {row("Cash Payments", peso(f["Cash Payments"]))}
          {row("Card Payments", peso(f["Card Payments"]))}
          {row("Digital Payments", peso(f["Digital Payments"]))}
          {row("Grab Payments", peso(f["Grab Payments"]))}
          {row("Bank Transfer Payments", peso(f["Bank Transfer Payments"]))}
          {row("Voucher Payments", peso(f["Voucher Payments"]))}
          {row("Marketing Expenses", peso(f["Marketing Expenses"]))}
        </div>
      </section>

      {/* ---------- BUDGETS ---------- */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Budgets</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {row("Kitchen Budget", peso(f["Kitchen Budget"]))}
          {row("Bar Budget", peso(f["Bar Budget"]))}
          {row("Non Food Budget", peso(f["Non Food Budget"]))}
          {row("Staff Meal Budget", peso(f["Staff Meal Budget"]))}
          {row("Total Budget", peso(f["Total Budget"]))}
        </div>
      </section>

      {/* ---------- CASH SUMMARY ---------- */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Cash Summary</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {row("Actual Cash Counted", peso(f["Actual Cash Counted"]))}
          {row("Variance (Cash vs Actual)", peso(f["Variance"]))}
          {row("Cash Float", peso(f["Cash Float"]))}
          {row("Cash for Deposit", peso(f["Cash for Deposit"]))}
          {row("Transfer Needed", peso(f["Transfer Needed"]))}
          {row("Net Sales", peso(f["Net Sales"]))}
        </div>
      </section>

      {/* ---------- META / SUBMISSION ---------- */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">Submission Details</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {row("Submitted By", f["Submitted By"])}
          {row("Submission Time", f["Submission Time"])}
          {row("Verified Status", f["Verified Status"])}
          {row("Verification Flag (Auto)", f["Verification Flag"])}
          {row("Last Updated By", f["Last Updated By"])}
          {row("Last Updated At", f["Last Updated At"])}
          {row("Store", f["Store"])}
          {row("Tenant ID", f["Tenant ID"])}
        </div>
      </section>
    </div>
  );
}
