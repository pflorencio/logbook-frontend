import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";

// -------------------------------------------------------------
// Central Store Types & Data
// -------------------------------------------------------------
import { StoreName, STORE_NAMES } from "../types/stores";

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------
export default function SettingsPage() {
  const [store, setStore] = useState<StoreName>(""); // selected store
  const [cashierName, setCashierName] = useState<string>(""); // cashier identity

  // -----------------------------------------------------------
  // Load saved settings
  // -----------------------------------------------------------
  useEffect(() => {
    const savedStore = (localStorage.getItem("store") as StoreName) || "";
    const savedName = localStorage.getItem("submittedBy") || "";

    if (savedStore) setStore(savedStore);
    if (savedName) setCashierName(savedName);
  }, []);

  // -----------------------------------------------------------
  // Save settings to localStorage
  // -----------------------------------------------------------
  function handleSave(): void {
    if (!store) {
      alert("Please select a store.");
      return;
    }

    const cleanedName = cashierName.trim();
    if (!cleanedName) {
      alert("Please enter your name.");
      return;
    }

    localStorage.setItem("store", store);
    localStorage.setItem("submittedBy", cleanedName);

    alert("Settings saved successfully!");
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto mt-10 bg-white shadow p-6 rounded-lg">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Settings</h1>

        <div className="space-y-4">
          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value as StoreName)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Store</option>
              {STORE_NAMES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Cashier Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cashier Name
            </label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter your name"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-md"
          >
            Save Settings
          </button>
        </div>
      </div>
    </Layout>
  );
}
