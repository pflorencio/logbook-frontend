import React, { useEffect, useMemo, useState } from "react";
import { createUser, fetchStores } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddUserModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"cashier" | "manager" | "admin">("cashier");
  const [active, setActive] = useState(true);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [storeAccess, setStoreAccess] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------
  // Load stores when modal opens
  // ----------------------------------------------------
  useEffect(() => {
    if (!open) return;

    async function load() {
      try {
        const list = await fetchStores();
        setStores(list);
        setError("");
      } catch (err) {
        console.error("❌ Failed loading stores:", err);
        setError("Failed to load stores.");
      }
    }

    load();
  }, [open]);

  // ----------------------------------------------------
  // Reset state when modal closes
  // ----------------------------------------------------
  useEffect(() => {
    if (open) return;

    setName("");
    setPin("");
    setRole("cashier");
    setActive(true);
    setStoreAccess([]);
    setError("");
    setLoading(false);
  }, [open]);

  // ----------------------------------------------------
  // Reset store access when role changes
  // ----------------------------------------------------
  useEffect(() => {
    setStoreAccess([]);
  }, [role]);

  // ----------------------------------------------------
  // Toggle store access
  // ----------------------------------------------------
  const toggleStoreAccess = (id: string) => {
    setStoreAccess((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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
      return "Admins have full system access. Store assignment is optional.";
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
  // Create user
  // ----------------------------------------------------
  const handleCreate = async () => {
    setError("");

    if (!isValid) {
      setError("Please complete all required fields correctly.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        pin,
        role,
        active,
        store_access: storeAccess, // ✅ single source of truth
      };

      await createUser(payload);

      onCreated();
      onClose();
    } catch (err) {
      console.error("❌ Create user error:", err);
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
          onChange={(e) =>
            setRole(e.target.value as "cashier" | "manager" | "admin")
          }
          className="w-full border px-3 py-2 rounded"
        >
          <option value="cashier">Cashier</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <p className="text-xs text-gray-500 mt-1 mb-4">{roleHelper}</p>

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

        {/* STORE ACCESS */}
        {role !== "admin" && (
          <>
            <label className="block mb-2 text-sm font-medium">
              Store Access
            </label>
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
          </>
        )}

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
            disabled={!isValid || loading}
            className={`px-4 py-2 rounded text-white ${
              isValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Saving…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}
