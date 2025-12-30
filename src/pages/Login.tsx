import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsers, loginUser } from "@/lib/api";
import { promptPWAInstall, isPWAInstallAvailable } from "@/main";

interface User {
  user_id: string;
  name: string;
  pin?: string;
  role: "cashier" | "manager" | "admin";
  active: boolean;
  store: { id: string; name: string } | null;
  store_access: { id: string; name: string }[];
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [canInstall, setCanInstall] = useState(false); // ✅ FIXED

  // Reset session on load
  useEffect(() => {
    // Delay clearing session so PWA install eligibility is preserved
    setTimeout(() => {
      localStorage.clear();
    }, 1000);
  }, []);

  // ✅ Check PWA install availability (from main.tsx)
  useEffect(() => {
    setCanInstall(isPWAInstallAvailable());
  }, []);

  // Load ACTIVE users
  useEffect(() => {
    async function load() {
      try {
        const list = await fetchUsers();
        setUsers(list.filter((u) => u.active));
      } catch (err) {
        console.error("❌ Error loading users:", err);
      }
    }
    load();
  }, []);

  const handleLogin = async () => {
    setError("");

    if (!selectedUser || pin.length !== 4) {
      setError("Please select your name and enter a 4-digit PIN.");
      return;
    }

    const user = users.find((u) => u.user_id === selectedUser);
    if (!user || !user.active) {
      setError("Invalid or inactive user.");
      return;
    }

    try {
      const authData = await loginUser(user.user_id, pin);

      const session = {
        userId: authData.user_id,
        name: authData.name,
        role: authData.role,
        storeId: authData.store?.id || null,
        storeName: authData.store?.name || null,
        storeAccess:
          authData.store_access?.map((s: any) => ({
            id: s.id,
            name: s.name || null,
          })) || [],
        timestamp: Date.now(),
      };

      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem("token", "logged_in");

      navigate(
        authData.role === "admin" || authData.role === "manager"
          ? "/admin"
          : "/cashier",
        { replace: true }
      );
    } catch (err) {
      console.error("❌ Login error:", err);
      setError("Incorrect PIN or inactive account.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Staff Login</h1>
        <p className="text-gray-500 mb-6">
          Select your name and enter your 4-digit PIN.
        </p>

        {/* USER SELECT */}
        <div className="mb-6 text-left">
          <label className="font-medium">Name</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          >
            <option value="">Select your name</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name} — {u.store?.name || "No Store"}
              </option>
            ))}
          </select>
        </div>

        {/* PIN */}
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
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* LOGIN */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-lg font-medium"
        >
          Login
        </button>

        {/* INSTALL APP */}
        {canInstall && (
          <button
            onClick={promptPWAInstall}
            className="w-full mt-3 border border-blue-600 text-blue-600 py-2 rounded-xl text-sm font-medium hover:bg-blue-50"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;