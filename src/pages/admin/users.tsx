// src/pages/admin/users.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";

import {
  fetchUsers,
  type User,
  type StoreRef,
} from "@/lib/api";

import AddUserModal from "@/components/admin/AddUserModal";
import EditUserModal from "@/components/admin/EditUserModal";

// -------------------------------------------------------------
// Helper: build unique list of stores from users
// -------------------------------------------------------------
function deriveStoreOptions(users: User[]): StoreRef[] {
  const map = new Map<string, StoreRef>();

  users.forEach((u) => {
    if (u.store) {
      map.set(u.store.id, u.store);
    }
    (u.store_access || []).forEach((s) => {
      if (s?.id) {
        map.set(s.id, s);
      }
    });
  });

  return Array.from(map.values());
}

// -------------------------------------------------------------
// Main Users Page
// -------------------------------------------------------------
const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // ⭐ URL param for edit

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // -------------------------------------------------------------
  // Load users
  // -------------------------------------------------------------
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await fetchUsers();
      setUsers(list);
    } catch (err) {
      console.error("❌ Error fetching users:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  // -------------------------------------------------------------
  // Auto-open edit modal if /admin/users/:id is visited
  // -------------------------------------------------------------
  useEffect(() => {
    if (!id || users.length === 0) return;

    const found = users.find((u) => u.user_id === id);
    if (found) {
      setSelectedUser(found);
      setEditOpen(true);
    }
  }, [id, users]);

  // -------------------------------------------------------------
  // Generate store options
  // -------------------------------------------------------------
  const storeOptions = useMemo(() => deriveStoreOptions(users), [users]);

  // -------------------------------------------------------------
  // Open edit (URL-driven)
  // -------------------------------------------------------------
  const handleOpenEdit = (u: User) => {
    navigate(`/admin/users/${u.user_id}`);
  };

  // -------------------------------------------------------------
  // Refresh after save
  // -------------------------------------------------------------
  const handleAfterSave = () => {
    void loadUsers();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Access</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage staff accounts, roles, and store permissions.
          </p>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700"
        >
          <span>＋</span>
          <span>Add User</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* USERS TABLE */}
      {/* --------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Name
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Role
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Primary Store
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Active
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Loading users…
                </td>
              </tr>
            )}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No users found. Click “Add User” to create your first account.
                </td>
              </tr>
            )}

            {!loading &&
              users.map((u) => (
                <tr
                  key={u.user_id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-900">{u.name}</td>

                  <td className="px-4 py-3 capitalize text-gray-700">
                    {u.role}
                  </td>

                  <td className="px-4 py-3 text-gray-700">
                    {u.store?.name || "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium " +
                        (u.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500")
                      }
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenEdit(u);
                      }}
                      className="px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* --------------------------------------------------------- */}
      {/* ADD USER MODAL */}
      {/* --------------------------------------------------------- */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleAfterSave}
      />

      {/* --------------------------------------------------------- */}
      {/* EDIT USER MODAL */}
      {/* --------------------------------------------------------- */}
      <EditUserModal
        user={selectedUser}
        stores={storeOptions}
        onUpdated={handleAfterSave}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
          navigate("/admin/users");
        }}
      />
    </AdminLayout>
  );
};

export default AdminUsersPage;
