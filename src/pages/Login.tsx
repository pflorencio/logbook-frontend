import React, { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/api";

interface CashierOption {
  cashier_id: string;
  name: string;
  store: string;
  store_normalized?: string;
}

export default function CashierLoginPage(): JSX.Element {
  const [cashiers, setCashiers] = useState<CashierOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, send to /cashier
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem("cashierSession");
    if (existing) {
      window.location.href = "/cashier";
    }
  }, []);

  // Load active cashiers for dropdown
  useEffect(() => {
    async function loadCashiers() {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/cashiers`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCashiers(data || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load cashiers. Please contact your manager.");
      }
    }

    loadCashiers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedId || pin.length !== 4) {
      setError("Select your name and enter your 4-digit PIN.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/auth/cashier-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashier_id: selectedId, pin }),
      });

      if (!res.ok) {
        setError("Invalid PIN. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (typeof window !== "undefined") {
        // Save full session
        localStorage.setItem("cashierSession", JSON.stringify(data));
        // For existing form logic:
        localStorage.setItem("store", data.store || "");
        localStorage.setItem("submittedBy", data.name || "");
        localStorage.setItem("cashier_id", data.cashier_id || "");
      }

      window.location.href = "/cashier";
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6">
        <h1 className="text-xl font-semibold mb-1 text-center">
          Cashier Login
        </h1>
        <p className="text-xs text-gray-500 mb-4 text-center">
          Select your name and enter your 4-digit PIN to start today&apos;s
          closing.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Select your name</option>
              {cashiers.map((c) => (
                <option key={c.cashier_id} value={c.cashier_id}>
                  {c.name} {c.store ? `— ${c.store}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-lg tracking-[0.4em] text-center"
              placeholder="••••"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              4-digit PIN provided by your manager.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!selectedId || pin.length !== 4 || loading}
            className={`w-full py-2 rounded-md text-white text-sm font-medium ${
              !selectedId || pin.length !== 4 || loading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}