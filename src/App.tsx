// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CashierForm from "./pages/CashierForm";
import DailyClosingPage from "./pages/DailyClosingPage"; 
import SettingsPage from "./pages/settings";
import HomePage from "./pages/index";   // your landing page
import HistoryPage from "./pages/history";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col p-0 m-0">
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* Dashboard (Manager) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Store Login */}
          <Route path="/login" element={<Login />} />

          {/* Cashier Closing Form */}
          <Route path="/cashier" element={<CashierForm />} />

          {/* Daily Closing Page (the new wrapper with Layout) */}
          <Route path="/daily" element={<DailyClosingPage />} />

          {/* History Page */}
          <Route path="/history" element={<HistoryPage />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}
