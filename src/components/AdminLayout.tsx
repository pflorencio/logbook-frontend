import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function AdminLayout({
  children,
}: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const session = JSON.parse(localStorage.getItem("cashierSession") || "{}");
  const name = session.cashierName || "Admin User";
  const role = session.role || "admin";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm p-5 space-y-6">
        <h2 className="text-xl font-bold">Admin Panel</h2>

        <nav className="space-y-3">
          <Link className="block text-gray-700 hover:text-black" to="/admin">
            Dashboard
          </Link>
          <Link className="block text-gray-700 hover:text-black" to="/admin/users">
            Users & Access
          </Link>
          <Link className="block text-gray-700 hover:text-black" to="/admin/reports">
            Reports
          </Link>
          <Link className="block text-gray-700 hover:text-black" to="/admin/settings">
            System Settings
          </Link>
        </nav>

        <div className="mt-auto">
          <p className="text-sm text-gray-500 mb-2">Logged in as:</p>
          <p className="font-medium">{name}</p>
          <button
            onClick={handleLogout}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
