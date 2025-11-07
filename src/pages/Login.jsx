// src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Minimal, self-contained PIN map.
 * You can edit these values now; we can externalize to src/config/stores.js later.
 */
const DEFAULT_STORE_PINS = {
  "Nonie's": "1111",
  Muchos: "2222",
  "Little Taj": "3333",
  "Island Izakaya": "4444",
};

/**
 * Utility: generate a simple session token
 */
function makeSessionToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Utility: harden comparison (constant-ish time for tiny strings)
 */
function safeEqual(a = "", b = "") {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const STORE_PINS = useMemo(() => {
    if (typeof window !== "undefined" && window.STORE_PINS) {
      return window.STORE_PINS;
    }
    return DEFAULT_STORE_PINS;
  }, []);

  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  // Auto-redirect if session exists
  useEffect(() => {
    const existingStore = localStorage.getItem("store");
    const existingToken = localStorage.getItem("token");

    // Only redirect if both exist AND the user hasn't just cleared the session
    if (existingStore && existingToken) {
      // Add a small delay so devs can click "Clear saved session"
      const timer = setTimeout(() => {
        navigate("/cashier", { replace: true });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [navigate]);

  function handleLogoutIfAny() {
    localStorage.removeItem("store");
    localStorage.removeItem("token");
    localStorage.removeItem("submittedBy");
    alert("Session cleared. You can now log in again.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const entered = pin.trim();
    if (!entered) {
      setError("Please enter your PIN.");
      return;
    }

    const match = Object.entries(STORE_PINS).find(([_, storePin]) =>
      safeEqual(entered, String(storePin)),
    );

    if (!match) {
      setError("Invalid PIN. Please try again.");
      return;
    }

    const [storeName] = match;
    const token = makeSessionToken();

    localStorage.setItem("store", storeName);
    localStorage.setItem("token", token);
    localStorage.setItem("submittedBy", `${storeName} Cashier`);

    const to = (location.state && location.state.from) || "/cashier";
    navigate(to, { replace: true });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Store Login</h1>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Enter your <span className="font-medium">store PIN</span> to access
          the cashier closing form.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store PIN
            </label>
            <div className="flex">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                className="rounded-r-md border border-l-0 border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {showPin ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Test PINs:{" "}
              {Object.entries(STORE_PINS)
                .map(([name, p]) => `${name}: ${p}`)
                .join(" • ")}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Continue
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Clear session button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleLogoutIfAny}
            className="text-sm text-gray-500 hover:text-red-600 font-medium"
          >
            🔄 Clear saved session
          </button>
        </div>

        {/* Footnote */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          You’ll be redirected to the cashier form for your store.
          <br />
          We’ll add per-user logins later.
        </p>
      </div>
    </div>
  );
}
