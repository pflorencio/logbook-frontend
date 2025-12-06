// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// Cashier Pages
import Login from "./pages/Login";
import CashierForm from "./pages/CashierForm";
import SettingsPage from "./pages/settings";
import HomePage from "./pages/index";
import HistoryPage from "./pages/history";

// Admin Pages
import AdminHome from "./pages/admin/index";
import AdminUsers from "./pages/admin/users";
import AdminReports from "./pages/admin/reports";
import AdminSettings from "./pages/admin/settings";


// -------------------------------------------------------
// ⭐ NEW: SmartRedirect component
// Redirects user to correct home depending on role
// -------------------------------------------------------
function SmartRedirect() {
  const sessionRaw = localStorage.getItem("session");

  if (!sessionRaw) return <Navigate to="/login" replace />;

  let session: any = {};
  try {
    session = JSON.parse(sessionRaw);
  } catch {
    return <Navigate to="/login" replace />;
  }

  const role = session.role;

  if (role === "admin" || role === "manager") return <Navigate to="/admin" replace />;
  return <Navigate to="/cashier" replace />;
}



// -------------------------------------------------------
// APP ROUTER
// -------------------------------------------------------
export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">

        <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}
          <Route path="/login" element={<Login />} />

          {/* ---------- DEFAULT ROUTE ---------- */}
          <Route
            path="/"
            element={
              <ProtectedRoute roles={["cashier", "manager", "admin"]}>
                <SmartRedirect />
              </ProtectedRoute>
            }
          />

          {/* ---------- CASHIER ROUTES ---------- */}
          <Route
            path="/cashier"
            element={
              <ProtectedRoute roles={["cashier", "manager", "admin"]}>
                <CashierForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute roles={["cashier", "manager", "admin"]}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={["cashier", "manager", "admin"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- ADMIN ROUTES ---------- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <AdminHome />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <AdminReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* ---------- FALLBACK ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
