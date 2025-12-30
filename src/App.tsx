// src/App.tsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// Cashier Pages
import LoginPage from "./pages/LoginPage";
import CashierForm from "./pages/CashierForm";
import SettingsPage from "./pages/settings";
import HomePage from "./pages/index";
import HistoryPage from "./pages/history";

// Admin Pages
import AdminHome from "./pages/admin/index";
import AdminUsers from "./pages/admin/users";
import AdminReports from "./pages/admin/reports";
import AdminSettings from "./pages/admin/settings";
import VerificationQueue from "./pages/admin/verification-queue";
import WeeklyBudgets from "./pages/admin/WeeklyBudgets";
import WeeklyBudgetHistory from "@/pages/admin/weekly-budget-history";

// Admin Login
import AdminLogin from "./pages/admin-login";

// Closing / Verification
import RecordView from "./pages/admin/closing/RecordView";
import VerifyClosing from "./pages/admin/verify/VerifyClosing";

// -------------------------------------------------------
// ⭐ SmartRedirect — sends user based on role
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

  if (role === "admin" || role === "manager") {
    return <Navigate to="/admin" replace />;
  }

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin-login" element={<AdminLogin />} />

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
              <ProtectedRoute roles={["cashier"]}>
                <CashierForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute roles={["cashier"]}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={["cashier"]}>
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

          {/* USERS LIST */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* ✅ NEW: USER EDIT (modal-driven, same page) */}
          <Route
            path="/admin/users/:id"
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
            path="/admin/verification-queue"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <VerificationQueue />
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

          <Route
            path="/admin/weekly-budgets"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <WeeklyBudgets />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/weekly-budget-history"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <WeeklyBudgetHistory />
              </ProtectedRoute>
            }
          />

          {/* ---------- CLOSING ROUTES ---------- */}
          <Route
            path="/admin/closing/:recordId"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <RecordView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/verify/:recordId"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <VerifyClosing />
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
