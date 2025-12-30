import React from "react";
import Layout from "../components/Layout";  // ✅ Correct path now
import { useNavigate } from "react-router-dom";

export default function HistoryPage(): JSX.Element {
  // Load cashier name + logout handler
  const navigate = useNavigate();

  const session = JSON.parse(localStorage.getItem("cashierSession") || "{}");
  const cashierName = session.cashierName || "User";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <Layout cashierName={cashierName} onLogout={handleLogout}>
      <main className="max-w-4xl mx-auto mt-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">History</h1>
        <p className="text-gray-600 mb-4">
          This page will show previously submitted daily closings from Airtable.
        </p>

        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500 italic">
            History data will load here via the <code>/history</code> endpoint.
          </p>
        </div>
      </main>
    </Layout>
  );
}
