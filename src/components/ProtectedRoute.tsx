import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // optional role-based access
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const location = useLocation();

  // ----------------------------------------------
  // LOAD SESSION
  // ----------------------------------------------
  const raw = localStorage.getItem("session");

  if (!raw) {
    console.warn("⛔ No session found. User not logged in.");

    // If user tries to access admin pages → go to admin-login
    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin-login" replace />;
    }

    // Otherwise → cashier login
    return <Navigate to="/login" replace />;
  }

  // Safely parse session
  let session: any = null;
  try {
    session = JSON.parse(raw);
  } catch (err) {
    console.error("⛔ Invalid session JSON:", err);
    localStorage.removeItem("session");
    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const userRole: string = session.role || "cashier";

  // ----------------------------------------------
  // SESSION TIMEOUT (1 hour)
  // ----------------------------------------------
  const ONE_HOUR = 60 * 60 * 1000;
  const lastTimestamp = session.timestamp;

  if (!lastTimestamp || Date.now() - lastTimestamp > ONE_HOUR) {
    console.warn("⏰ Session expired — logging out.");
    localStorage.removeItem("session");

    if (location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // AUTO-REFRESH TIMESTAMP
  // ----------------------------------------------
  session.timestamp = Date.now();
  localStorage.setItem("session", JSON.stringify(session));

  // ----------------------------------------------
  // 🚨 ROLE-BASED ACCESS RULES
  // ----------------------------------------------

  // Case 1 — Admin pages require manager/admin
  if (location.pathname.startsWith("/admin")) {
    if (userRole !== "admin" && userRole !== "manager") {
      console.warn("⛔ Cashier trying to access admin area.");
      return <Navigate to="/login" replace />;
    }
  }

  // Case 2 — Cashier pages require cashier role
  if (location.pathname.startsWith("/cashier")) {
    if (userRole !== "cashier") {
      console.warn("⛔ Manager/Admin trying to access cashier area.");
      return <Navigate to="/admin" replace />;
    }
  }

  // Additionally support explicit roles prop (optional)
  if (roles && !roles.includes(userRole)) {
    console.warn(`⛔ Access denied for role "${userRole}". Required:`, roles);

    if (userRole === "cashier") {
      return <Navigate to="/cashier" replace />;
    }

    return <Navigate to="/admin" replace />;
  }

  // ----------------------------------------------
  // ACCESS GRANTED
  // ----------------------------------------------
  return <>{children}</>;
}
