import React, { useState, useEffect } from "react";
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
  onUpdated: () => void; // refresh list
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

  const [primaryStore, setPrimaryStore] = useState<string>("");
  const [storeAccess, setStoreAccess] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // ----------------------------------------------------
  // Load data when modal opens
  // ----------------------------------------------------
  useEffect(() => {
    if (!user) return;

    setName(user.name);
    setPin(user.pin || "");
    setRole(user.role);
    setActive(user.active);

    setPrimaryStore(user.store?.id || "");
    setStoreAccess(user.store_access.map((s) => s.id));
  }, [user]);

  if (!user) return null;

  // ----------------------------------------------------
  // Handle save/update
  // ----------------------------------------------------
  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    if (pin.length !== 4) {
      alert("PIN must be 4 digits.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        pin,
        role,
        active,
        store_id: primaryStore || null,
        store_access_ids: storeAccess,
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

  // ----------------------------------------------------
  // Toggle store access
  // ----------------------------------------------------
  const toggleStoreAccess = (id: string) => {
    setStoreAccess((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // ----------------------------------------------------
  // REMOVE Access option if it's the Primary Store? (Optional)
  // You can allow both for flexibility.
  // ----------------------------------------------------

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

        {/* PRIMARY STORE */}
        <div>
          <label className="text-sm font-medium">Primary Store</label>
          <select
            className="w-full px-3 py-2 border rounded-lg mt-1"
            value={primaryStore}
            onChange={(e) => setPrimaryStore(e.target.value)}
          >
            <option value="">No Store Assigned</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* STORE ACCESS MULTI SELECT */}
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
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-white ${
              saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
