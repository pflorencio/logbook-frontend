import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Cashier {
  id: string;
  name: string;
  store: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------------------------
  // 🔄 Always start with a fresh login screen (clear previous session)
  // --------------------------------------------------------------------
  useEffect(() => {
    localStorage.removeItem("cashierSession");
    localStorage.removeItem("token");
    localStorage.removeItem("store");
    setSelectedCashier("");
    setPin("");
  }, []);

  // --------------------------------------------------------------------
  // 📌 Load Cashiers from Backend API (Live Airtable Data)
  // --------------------------------------------------------------------
  useEffect(() => {
    async function fetchCashiers() {
      try {
        const backend = import.meta.env.VITE_API_URL;

        const res = await fetch(`${backend}/cashiers`);
        const data = await res.json();

        if (data.success) {
          setCashiers(data.cashiers);
        } else {
          console.error("Failed to load cashiers:", data.message);
        }
      } catch (err) {
        console.error("❌ Error fetching cashiers:", err);
      }
    }

    fetchCashiers();
  }, []);

  // --------------------------------------------------------------------
  // 🟦 Handle Login
  // --------------------------------------------------------------------
  const handleLogin = () => {
    if (!selectedCashier || pin.length !== 4) {
      setError("Please enter your name and 4-digit PIN.");
      return;
    }

    const cashier = cashiers.find((c) => c.id === selectedCashier);

    if (!cashier) {
      setError("Invalid cashier selection.");
      return;
    }

    // (Optional) ⚠️ For now PIN is not validated (we add this in Sprint 2)
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be a 4-digit number.");
      return;
    }

    // ----------------------------------------------------------------
    // 🔐 Save Session
    // ----------------------------------------------------------------
    const session = {
      cashierId: cashier.id,
      cashierName: cashier.name,
      store: cashier.store,
      timestamp: Date.now(),
    };

    localStorage.setItem("cashierSession", JSON.stringify(session));
    localStorage.setItem("token", "logged_in");
    localStorage.setItem("store", cashier.store);

    navigate("/cashier", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Cashier Login</h1>
        <p className="text-gray-500 mb-6">
          Select your name and enter your 4-digit PIN to start today’s closing.
        </p>

        {/* NAME SELECT */}
        <div className="mb-6 text-left">
          <label className="font-medium">Name</label>

          <select
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2 focus:ring-blue-500"
          >
            <option value="">Select your name</option>

            {cashiers.length === 0 && (
              <option disabled>Loading...</option>
            )}

            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.store}
              </option>
            ))}
          </select>
        </div>

        {/* PIN INPUT */}
        <div className="mb-4 text-left">
          <label className="font-medium">PIN</label>

          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2 text-center tracking-widest text-xl"
          />

          <p className="text-xs text-gray-400 mt-1">
            4-digit PIN provided by your manager.
          </p>
        </div>

        {/* ERROR */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-medium"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
