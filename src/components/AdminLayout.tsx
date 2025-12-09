// src/components/AdminLayout.tsx

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ------------------------------
  // Load session
  // ------------------------------
  const raw = localStorage.getItem("session");
  let session: any = {};

  try {
    session = raw ? JSON.parse(raw) : {};
  } catch {
    session = {};
  }

  const name = session.name || "Admin User";
  const role = session.role || "admin";
  const store = session.store?.name || "No Store Selected";
  const storeAccess = session.storeAccess || [];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/admin-login");
  };

  const isActive = (path: string) =>
    location.pathname === path
      ? "bg-gray-200 text-gray-900 font-semibold"
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900";

  const isMatch = (prefix: string) =>
    location.pathname.startsWith(prefix)
      ? "bg-gray-200 text-gray-900 font-semibold"
      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900";

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ========================================================= */}
      {/* SIDEBAR */}
      {/* ========================================================= */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">

        {/* Logo + Title */}
        <div className="px-6 py-6 border-b">
          <h1 className="text-xl font-bold">Management Portal</h1>
          <p className="text-xs text-gray-500 capitalize mt-1">{role}</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">

          <Link
            to="/admin"
            className={`block px-4 py-2 rounded-lg ${isActive("/admin")}`}
          >
            📊 Dashboard
          </Link>

          <Link
            to="/admin/reports"
            className={`block px-4 py-2 rounded-lg ${isActive("/admin/reports")}`}
          >
            📈 Reports
          </Link>

          <Link
            to="/admin/users"
            className={`block px-4 py-2 rounded-lg ${isActive("/admin/users")}`}
          >
            👥 Users & Access
          </Link>

          <Link
            to="/admin/settings"
            className={`block px-4 py-2 rounded-lg ${isActive("/admin/settings")}`}
          >
            ⚙️ System Settings
          </Link>

          {/* Closing-related routes */}
          {location.pathname.startsWith("/admin/closing") && (
            <div className={`block px-4 py-2 rounded-lg ${isMatch("/admin/closing")}`}>
              🧾 Closing Record
            </div>
          )}

          {location.pathname.startsWith("/admin/verify") && (
            <div className={`block px-4 py-2 rounded-lg ${isMatch("/admin/verify")}`}>
              ✔️ Verify Closing
            </div>
          )}
        </nav>

        {/* Footer / User Info */}
        <div className="px-6 py-5 border-t">
          <p className="text-sm text-gray-500">Logged in as:</p>
          <p className="font-medium">{name}</p>

          {/* Manager store access preview */}
          {role === "manager" && storeAccess.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <p className="font-semibold mb-1">Store Access:</p>
              <ul className="list-disc ml-4 space-y-1">
                {storeAccess.map((s: any) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================= */}
      <main className="flex-1">

        {/* Top Header */}
        <header className="w-full bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm">

          <div>
            <p className="text-sm text-gray-500">Current Store</p>
            <p className="font-semibold text-gray-900">
              {store}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full uppercase font-semibold">
              {role}
            </span>
          </div>

        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>

    </div>
  );
}
