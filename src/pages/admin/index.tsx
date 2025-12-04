import React from "react";
import AdminLayout from "../../components/AdminLayout";

export default function AdminHome() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-gray-600">
        Welcome to the central management dashboard.
      </p>
    </AdminLayout>
  );
}
