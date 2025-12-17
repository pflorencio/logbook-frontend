import React from "react";
import { LogOut } from "lucide-react";

export default function Layout({
  children,
  cashierName,
  onLogout,
}: {
  children: React.ReactNode;
  cashierName?: string;
  onLogout?: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Daily Closing App</h1>

        <div className="flex items-center gap-4">
          {cashierName && (
            <span className="text-gray-600 font-medium">
              Hello, {cashierName} 👋
            </span>
          )}

          {onLogout && (
            <button onClick={onLogout} className="text-gray-600 hover:text-black">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4">{children}</main>
    </div>
  );
}
