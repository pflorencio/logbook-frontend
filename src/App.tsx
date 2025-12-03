// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CashierForm from "./pages/CashierForm";
import DailyClosingPage from "./pages/DailyClosingPage"; 
import SettingsPage from "./pages/settings";
import HomePage from "./pages/index";
import HistoryPage from "./pages/history";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Optional: Manager dashboard could be protected separately */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Protected Routes - require cashier login */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/cashier"
            element={
              <ProtectedRoute>
                <CashierForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/daily"
            element={
              <ProtectedRoute>
                <DailyClosingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}
