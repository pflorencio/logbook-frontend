import React, { useState, useEffect, useMemo } from "react";
import { updateUser } from "@/lib/api";

interface StoreRef {
  id: string;
  name: string;
}

interface User {
  user_id: string;
  name: string;
  pin?: string;
  role: "cashier" | "manager" | "admin";
  active: boolean;
  store: StoreRef | null;
  store_access: StoreRef[];
}

interface EditUserModalProps {
  user: User | null;
  stores: StoreRef[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditUserModal({
  user,
  stores,
  onClose,
  onUpdated,
}: EditUserModalProps) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"cashier" | "manager" | "admin">("cashier");
  const [active, setActive] = useState(true);
  const [storeAccess, setStoreAccess] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Snapshot of original state (for dirty check)
  const [originalState, setOriginalState] = useState<{
    name: string;
    pin: string;
    role: "cashier" | "manager" | "admin";
    active: boolean;
    storeAccess: string[];
  } | null>(null);

  // ----------------------------------------------------
  // Load user data on open
  // ----------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const initial = {
      name: user.name,
      pin: user.pin || "",
      role: user.role,
      active: user.active,
      storeAccess: user.store_access.map((s) => s.id),
    };

    setName(initial.name);
    setPin(initial.pin);
    setRole(initial.role);
    setActive(initial.active);
    setStoreAccess(initial.storeAccess);

    setOriginalState(initial);
  }, [user]);

  // Reset store access when role changes
  useEffect(() => {
    if (!originalState) return;
    setStoreAccess([]);
  }, [role]);

  // ----------------------------------------------------
  // Role helper text
  // ----------------------------------------------------
  const roleHelper = useMemo(() => {
    if (role === "cashier") {
      return "Cashiers can only access one store and submit closings.";
    }
    if (role === "manager") {
      return "Managers can access multiple stores and verify closings.";
    }
    if (role === "admin") {
      return "Admins have full system access. Store assignment optional.";
    }
    return "";
  }, [role]);

  // ----------------------------------------------------
  // Soft validation
  // ----------------------------------------------------
  const isValid =
    name.trim().length > 0 &&
    pin.length === 4 &&
    (role === "admin" ||
      (role === "cashier" && storeAccess.length === 1) ||
      (role === "manager" && storeAccess.length >= 1));

  // ----------------------------------------------------
  // Dirty check
  // ----------------------------------------------------
  const isDirty = useMemo(() => {
    if (!originalState) return false;

    return (
      name !== originalState.name ||
      pin !== originalState.pin ||
      role !== originalState.role ||
      active !== originalState.active ||
      JSON.stringify(storeAccess) !==
        JSON.stringify(originalState.storeAccess)
    );
  }, [name, pin, role, active, storeAccess, originalState]);

  // ----------------------------------------------------
  // Toggle store access
  // ----------------------------------------------------
  const toggleStoreAccess = (id: string) => {
    setStoreAccess((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // ----------------------------------------------------
  // Save
  // ----------------------------------------------------
  const handleSave = async () => {
    if (!isValid || !isDirty || !user) return;

    try {
      setSaving(true);

      const payload = {
        name,
        pin,
        role,
        active,
        store_access: storeAccess, // ✅ consistent with backend
      };

      await updateUser(user.user_id, payload);

      onUpdated();
      onClose();
    } catch (err) {
      console.error("❌ Update user error:", err);
      alert("Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-5">
        <h2 className="text-xl font-semibold text-gray-800">
          Edit User — {user.name}
        </h2>

        {/* NAME */}
        <div>
          <label className="text-sm font-medium">Full Name</label>
          <input
            className="w-full px-3 py-2 border rounded-lg mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* PIN */}
        <div>
          <label className="text-sm font-medium">4-digit PIN</label>
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            className="w-full px-3 py-2 border rounded-lg mt-1"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {/* ROLE */}
        <div>
          <label className="text-sm font-medium">Role</label>
          <select
            className="w-full px-3 py-2 border rounded-lg mt-1"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "cashier" | "manager" | "admin")
            }
          >
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">{roleHelper}</p>
        </div>

        {/* ACTIVE */}
        <div>
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full px-3 py-2 border rounded-lg mt-1"
            value={active ? "active" : "inactive"}
            onChange={(e) => setActive(e.target.value === "active")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* STORE ACCESS */}
        {role !== "admin" && (
          <div>
            <label className="text-sm font-medium">Store Access</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {stores.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={storeAccess.includes(s.id)}
                    onChange={() => toggleStoreAccess(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!isValid || !isDirty || saving}
            className={`px-5 py-2 rounded-lg text-white ${
              isValid && isDirty
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
