import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------
interface StorePinMap {
  [storeName: string]: string;
}

interface LocationState {
  from?: string;
}

// -------------------------------------------------------------
// PIN Definitions (central source of truth)
// -------------------------------------------------------------
import { StoreName, STORE_PINS as STATIC_STORE_PINS } from "../types/stores";

// -------------------------------------------------------------
// Utility: generate a simple session token
// -------------------------------------------------------------
function makeSessionToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// -------------------------------------------------------------
// Utility: constant-time comparison for PINs
// -------------------------------------------------------------
function safeEqual(a = "", b = ""): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  // -----------------------------------------------------------
  // Allow dynamic overrides (window.STORE_PINS) but default to static
  // -----------------------------------------------------------
  const PIN_MAP = useMemo<StorePinMap>(() => {
    if (typeof window !== "undefined" && (window as any).STORE_PINS) {
      return (window as any).STORE_PINS as StorePinMap;
    }
    return STATIC_STORE_PINS;
  }, []);

  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // -----------------------------------------------------------
  // Auto-redirect cashier if already logged in
  // -----------------------------------------------------------
  useEffect(() => {
    const existingStore = localStorage.getItem("store");
    const existingToken = localStorage.getItem("token");

    if (existingStore && existingToken) {
      const timer = setTimeout(() => {
        navigate("/cashier", { replace: true });
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [navigate]);

  // -----------------------------------------------------------
  // Clear session
  // -----------------------------------------------------------
  function handleLogoutIfAny() {
    localStorage.removeItem("store");
    localStorage.removeItem("token");
    localStorage.removeItem("submittedBy");
    alert("Session cleared. You can now log in again.");
  }

  // -----------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const entered = pin.trim();
    if (!entered) {
      setError("Please enter your PIN.");
      return;
    }

    // Validate PIN
    const match = Object.entries(PIN_MAP).find(([_, v]) => safeEqual(entered, v));

    if (!match) {
      setError("Invalid PIN. Please try again.");
      return;
    }

    const [storeName] = match as [StoreName, string];
    const token = makeSessionToken();

    // Save session
    localStorage.setItem("store", storeName);
    localStorage.setItem("token", token);
    localStorage.setItem("submittedBy", `${storeName} Cashier`);

    // Redirect to prior page or cashier
    const redirectTo = state?.from || "/cashier";
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Store Login</h1>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Enter your <span className="font-medium">store PIN</span> to access the cashier form.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PIN Input */}
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
                className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500"
                placeholder="••••"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPin((s) => !s)}
                className="rounded-r-md border border-l-0 border-gray-300 px-3 py-2 
                           text-sm text-gray-600 hover:bg-gray-50"
              >
                {showPin ? "Hide" : "Show"}
              </button>
            </div>

            {/* Display Test PINs */}
            <p className="mt-2 text-xs text-gray-500">
              Test PINs:{" "}
              {Object.entries(PIN_MAP)
                .map(([name, p]) => `${name}: ${p}`)
                .join(" • ")}
            </p>
          </div>

          {/* Error Box */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 text-white py-2.5 font-medium 
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Continue
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Clear Stored Session */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleLogoutIfAny}
            className="text-sm text-gray-500 hover:text-red-600 font-medium"
          >
            🔄 Clear saved session
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400 text-center">
          You’ll be redirected to your store’s cashier form.
          <br />
          Multi-user login coming soon.
        </p>
      </div>
    </div>
  );
}
