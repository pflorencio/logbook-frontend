import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedCashier, setSelectedCashier] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");

  // Always start fresh — clear previous session
  useEffect(() => {
    localStorage.removeItem("cashierSession");
    setSelectedCashier("");
    setPin(["", "", "", ""]);
  }, []);

  const isPinValid = pin.every((digit) => digit !== "");

  function handleLogin() {
    if (!selectedCashier || !isPinValid) {
      setError("Please enter your name and PIN.");
      return;
    }

    // Store session
    const session = {
      cashierName: selectedCashier,
      store: selectedCashier.includes("Little Taj") ? "Little Taj" : "Nonie's",
      timestamp: Date.now(),
    };

    localStorage.setItem("cashierSession", JSON.stringify(session));

    navigate("/cashier", { replace: true });
  }

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
            <option value="Patrick Taj">Patrick Taj</option>
            <option value="Nonies Cashier">Nonie's Cashier</option>
            <option value="Little Taj Cashier">Little Taj Cashier</option>
          </select>
        </div>

        {/* PIN INPUT */}
        <div className="mb-4 text-left">
          <label className="font-medium">PIN</label>
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            className="w-full mt-1 border rounded-lg px-3 py-2 text-center tracking-widest text-xl"
            onChange={(e) => setPin(e.target.value.split(""))}
          />
          <p className="text-xs text-gray-400 mt-1">
            4-digit PIN provided by your manager.
          </p>
        </div>

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
