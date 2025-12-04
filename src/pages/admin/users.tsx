import React from "react";
import AdminLayout from "../../components/AdminLayout";

export default function AdminUsers() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <p className="text-gray-600">
        Here you will be able to create, edit, deactivate users and assign roles.
      </p>
    </AdminLayout>
  );
}