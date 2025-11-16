import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./styles/globals.css";

// Import pages
import IndexPage from "./pages/index";
import HistoryPage from "./pages/history";
import SettingsPage from "./pages/settings";
import Dashboard from "./pages/Dashboard";
import CashierForm from "./pages/CashierForm";
import Login from "./pages/Login";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cashier" element={<CashierForm />} />
        <Route path="/login" element={<Login />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
