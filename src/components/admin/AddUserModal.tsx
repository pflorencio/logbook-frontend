import React, { useEffect, useState } from "react";
import { createUser, fetchStores } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddUserModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("cashier");
  const [active, setActive] = useState(true);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeId, setStoreId] = useState("");
  const [storeAccess, setStoreAccess] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load stores on open
  useEffect(() => {
    if (!open) return;

    async function load() {
      try {
        const list = await fetchStores();
        setStores(list);
      } catch (err) {
        console.error("❌ Failed loading stores:", err);
      }
    }

    load();
  }, [open]);

  const toggleStoreAccess = (id: string) => {
    setStoreAccess((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (pin.length !== 4) {
      setError("PIN must be 4 digits.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        pin,
        role,
        active,
        store_id: storeId || null,
        store_access: storeAccess,
      };

      await createUser(payload);

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg">

        <h2 className="text-xl font-bold mb-4">Add New User</h2>

        {/* NAME */}
        <label className="block mb-2 text-sm font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        {/* PIN */}
        <label className="block mb-2 text-sm font-medium">PIN (4 digits)</label>
        <input
          type="password"
          maxLength={4}
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full border px-3 py-2 rounded mb-4"
        />

        {/* ROLE */}
        <label className="block mb-2 text-sm font-medium">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        >
          <option value="cashier">Cashier</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>

        {/* ACTIVE */}
        <label className="block mb-2 text-sm font-medium">Status</label>
        <select
          value={active ? "active" : "inactive"}
          onChange={(e) => setActive(e.target.value === "active")}
          className="w-full border px-3 py-2 rounded mb-4"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* ASSIGNED STORE */}
        <label className="block mb-2 text-sm font-medium">Main Store</label>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        >
          <option value="">— None —</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* STORE ACCESS */}
        <label className="block mb-2 text-sm font-medium">Store Access</label>
        <div className="space-y-2 mb-4">
          {stores.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={storeAccess.includes(s.id)}
                onChange={() => toggleStoreAccess(s.id)}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>

        {/* ERROR */}
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? "Saving…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}
