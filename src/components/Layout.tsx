import React from "react";
import { LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  cashierName?: string | null;
  onLogout?: () => void;
}

export default function Layout({
  children,
  cashierName,
  onLogout,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* TOP BAR */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <div />

        {cashierName && (
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-sm">
              Hello, <strong>{cashierName}</strong> 👋
            </span>

            <button
              onClick={onLogout}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      <main className="flex-1">{children}</main>
    </div>
  );
}
