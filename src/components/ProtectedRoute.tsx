import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const location = useLocation();
  const hostname = window.location.hostname;

  // ✅ ALWAYS allow login page (store picker lives here)
  if (location.pathname === "/login") {
    return <>{children}</>;
  }

  // ----------------------------------------------
  // LOAD SESSION
  // ----------------------------------------------
  const raw = localStorage.getItem("session");
  const token = localStorage.getItem("token");

  if (!raw || !token) {
    console.warn("⛔ No valid session found.");
    return <Navigate to="/login" replace />;
  }

  let session: any;
  try {
    session = JSON.parse(raw);
  } catch {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  const userRole = session.role;

  // ----------------------------------------------
  // SESSION TIMEOUT
  // ----------------------------------------------
  if (!session.timestamp || Date.now() - session.timestamp > 60 * 60 * 1000) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  session.timestamp = Date.now();
  localStorage.setItem("session", JSON.stringify(session));

  // ----------------------------------------------
  // DOMAIN RULES
  // ----------------------------------------------
  if (hostname.startsWith("admin.")) {
    if (!["admin", "manager"].includes(userRole)) {
      return <Navigate to="/login" replace />;
    }
  }

  // ----------------------------------------------
  // ADMIN ROUTES
  // ----------------------------------------------
  if (location.pathname.startsWith("/admin")) {
    if (!["admin", "manager"].includes(userRole)) {
      return <Navigate to="/login" replace />;
    }
  }

  // ----------------------------------------------
  // CASHIER ROUTES
  // ----------------------------------------------
  if (location.pathname.startsWith("/cashier")) {
    if (userRole === "cashier") return <>{children}</>;

    if (["admin", "manager"].includes(userRole) && session.activeStoreId) {
      return <>{children}</>;
    }

    console.warn("⛔ Admin/Manager missing activeStoreId");
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // OPTIONAL ROLE GUARD
  // ----------------------------------------------
  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
