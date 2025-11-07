// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CashierForm from "./pages/CashierForm"; // ✅ add this import

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <Routes>
          {/* Homepage */}
          <Route
            path="/"
            element={
              <div>
                <h1 className="text-3xl font-bold mb-4">
                  Restaurant Operations Dashboard
                </h1>
                <p className="text-gray-600 mb-6">
                  Welcome to the control panel. Choose a section below.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link
                    to="/dashboard"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    to="/login"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Store Login
                  </Link>
                </div>
              </div>
            }
          />

          {/* Dashboard (Manager View) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Store Login */}
          <Route path="/login" element={<Login />} />

          {/* Cashier Form (Store View) */}
          <Route path="/cashier" element={<CashierForm />} />
        </Routes>
      </div>
    </Router>
  );
}
