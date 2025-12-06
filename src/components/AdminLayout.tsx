// src/components/AdminLayout.tsx

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------
  // ⭐ NEW: Correct session source
  // ------------------------------
  const sessionRaw = localStorage.getItem("session");
  let session: any = {};

  try {
    session = sessionRaw ? JSON.parse(sessionRaw) : {};
  } catch {
    session = {};
  }

  const name = session.name || "Admin User";
  const role = session.role || "admin";

  // Manager may have multi-store access
  const storeAccess = session.storeAccess || [];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Utility to highlight active sidebar link
  const isActive = (path: string) =>
    location.pathname === path ? "text-black font-semibold" : "text-gray-700";

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm p-5 flex flex-col">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>

        <nav className="space-y-3 flex-1">
          <Link className={`block hover:text-black ${isActive("/admin")}`} to="/admin">
            Dashboard
          </Link>

          <Link
            className={`block hover:text-black ${isActive("/admin/users")}`}
            to="/admin/users"
          >
            Users & Access
          </Link>

          <Link
            className={`block hover:text-black ${isActive("/admin/reports")}`}
            to="/admin/reports"
          >
            Reports
          </Link>

          <Link
            className={`block hover:text-black ${isActive("/admin/settings")}`}
            to="/admin/settings"
          >
            System Settings
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="border-t pt-4 mt-6">
          <p className="text-sm text-gray-500">Logged in as:</p>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-gray-500 capitalize">{role}</p>

          {/* Manager store access preview */}
          {role === "manager" && storeAccess.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <p className="font-semibold mb-1">Store Access:</p>
              <ul className="list-disc ml-4">
                {storeAccess.map((s: any) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
