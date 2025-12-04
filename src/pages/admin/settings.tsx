import React from "react";
import AdminLayout from "../../components/AdminLayout";

export default function AdminSettings() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">System Settings</h1>
      <p className="text-gray-600">
        Configure system-wide settings, notifications, and defaults.
      </p>
    </AdminLayout>
  );
}
