import React from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate();

  // Load session info
  const session = JSON.parse(localStorage.getItem("cashierSession") || "{}");
  const cashierName = session.cashierName || "User";
  const store = session.store || "Unknown Store";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <Layout cashierName={cashierName} onLogout={handleLogout}>
      <div className="max-w-xl mx-auto mt-10 bg-white shadow p-6 rounded-lg">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Profile Settings
        </h1>

        <div className="space-y-6">
          {/* Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store
            </label>
            <input
              type="text"
              value={store}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Cashier Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cashier Name
            </label>
            <input
              type="text"
              value={cashierName}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </Layout>
  );
}
