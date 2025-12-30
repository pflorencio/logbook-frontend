import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUsers, loginUser } from "@/lib/api";

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

  // Reset session on load
  useEffect(() => {
    localStorage.clear();
  }, []);

  // Load ACTIVE users from backend
  useEffect(() => {
    async function load() {
      try {
        const list = await fetchUsers();
        const activeUsers = list.filter((u) => u.active === true);
        setUsers(activeUsers);
      } catch (err) {
        console.error("❌ Error loading users:", err);
      }
    }
    load();
  }, []);

  // Handle login
  const handleLogin = async () => {
    setError("");

    if (!selectedUser || pin.length !== 4) {
      setError("Please select your name and enter a 4-digit PIN.");
      return;
    }

    const user = users.find((u) => u.user_id === selectedUser);

    if (!user) {
      setError("Invalid user selection.");
      return;
    }

    if (!user.active) {
      setError("This account is inactive. Please contact a manager.");
      return;
    }

    try {
      // Authenticate with backend
      const authData = await loginUser(user.user_id, pin);

      // Clean store fields
      const cleanStore = authData.store
        ? {
            id: authData.store.id,
            name: authData.store.name || null,
          }
        : null;

      // Clean store_access list
      const cleanStoreAccess =
        authData.store_access?.map((sa: any) => ({
          id: sa.id,
          name: sa.name || null,
        })) || [];

      // Create session object
      const session = {
        userId: authData.user_id,
        name: authData.name,
        role: authData.role,
        storeId: cleanStore?.id || null,
        storeName: cleanStore?.name || null,
        storeAccess: cleanStoreAccess,
        timestamp: Date.now(),
      };

      localStorage.setItem("session", JSON.stringify(session));
      localStorage.setItem("token", "logged_in");

      // Redirect based on role
      if (authData.role === "admin" || authData.role === "manager") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/cashier", { replace: true });
      }
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
            className="w-full mt-1 border rounded-lg px-3 py-2 focus:ring-blue-500"
          >
            <option value="">Select your name</option>

            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name} — {u.store?.name || "No Store Assigned"}
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
