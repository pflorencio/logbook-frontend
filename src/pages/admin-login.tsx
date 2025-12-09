import React, { useEffect, useState } from "react";
import { fetchUsers, loginUser } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------
  // Load only manager/admin users
  // ------------------------------------------------------
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetchUsers();
        const filtered = res.filter(
          (u) => u.role === "manager" || u.role === "admin"
        );
        setUsers(filtered || []);
      } catch (err) {
        console.error("❌ Failed to fetch users:", err);
        toast.error("Unable to load users.");
      }
    }
    loadUsers();
  }, []);

  // ------------------------------------------------------
  // Handle login
  // ------------------------------------------------------
  async function handleLogin() {
    if (!selectedUserId || !pin) {
      toast.error("Please select a user and enter PIN.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(selectedUserId, pin);

      // ⭐ Normalize fields (Airtable sometimes returns undefined)
      const store = data.store || null;
      const storeAccess = data.store_access || [];

      // ⭐ Save session with timestamp + token
      localStorage.setItem(
        "session",
        JSON.stringify({
          user_id: data.user_id,
          name: data.name,
          role: data.role,
          store,
          storeAccess,
          timestamp: Date.now(),        // ⭐ REQUIRED FOR PROTECTEDROUTE
        })
      );

      localStorage.setItem("token", "admin-auth"); // ⭐ REQUIRED

      toast.success(`Welcome ${data.name}!`);

      // ⭐ Redirect to admin dashboard
      navigate("/admin", { replace: true });

    } catch (err) {
      toast.error("Invalid PIN or user.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Toaster />

      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-sm w-full space-y-6">
        <h1 className="text-xl font-semibold text-gray-900 text-center">
          Management Portal Login
        </h1>

        {/* User selection */}
        <div>
          <label className="text-sm text-gray-600">Select User</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full mt-1 px-4 py-2 rounded-lg border bg-white"
          >
            <option value="">Choose...</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* PIN input */}
        <div>
          <label className="text-sm text-gray-600">PIN</label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full mt-1 px-4 py-2 rounded-lg border bg-white"
            placeholder="••••"
          />
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </div>
    </div>
  );
}
