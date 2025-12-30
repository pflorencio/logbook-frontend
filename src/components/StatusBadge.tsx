// src/components/StatusBadge.tsx

import React from "react";

export default function StatusBadge({ status }: { status: string }) {

  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Verified: "bg-green-100 text-green-700",
    "Needs Update": "bg-red-100 text-red-700"
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        colors[status] || "bg-gray-200 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}
