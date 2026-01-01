import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const location = useLocation();
  const hostname = window.location.hostname;

  // ----------------------------------------------
  // LOAD SESSION (SINGLE SOURCE OF TRUTH)
  // ----------------------------------------------
  const raw = localStorage.getItem("session");
  const token = localStorage.getItem("token");

  let session: any = null;

  if (raw) {
    try {
      session = JSON.parse(raw);
    } catch (err) {
      console.error("⛔ Invalid session JSON:", err);
      localStorage.clear();
    }
  }

  // ----------------------------------------------
  // LOGIN PAGE RULES
  // ----------------------------------------------

  // ✅ Not logged in → allow login page
  if (location.pathname === "/login" && (!session || !token)) {
    return <>{children}</>;
  }

  // 🚫 Logged in → block login page
  if (location.pathname === "/login" && session && token) {
    return (
      <Navigate
        to={session.activeStoreId ? "/cashier" : "/admin"}
        replace
      />
    );
  }

  // 🚫 No session anywhere else
  if (!session || !token) {
    console.warn("⛔ No valid session found. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  const userRole: string = session.role || "cashier";

  // ----------------------------------------------
  // SESSION TIMEOUT (1 hour)
  // ----------------------------------------------
  const ONE_HOUR = 60 * 60 * 1000;
  if (!session.timestamp || Date.now() - session.timestamp > ONE_HOUR) {
    console.warn("⏰ Session expired — logging out.");
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Refresh timestamp
  session.timestamp = Date.now();
  localStorage.setItem("session", JSON.stringify(session));

  // ----------------------------------------------
  // DOMAIN RULES
  // ----------------------------------------------
  if (hostname.startsWith("admin.")) {
    if (userRole !== "admin" && userRole !== "manager") {
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }
  }

  // ----------------------------------------------
  // PATH RULES
  // ----------------------------------------------

  // Admin routes
  if (location.pathname.startsWith("/admin")) {
    if (userRole !== "admin" && userRole !== "manager") {
      return <Navigate to="/login" replace />;
    }
  }

  // Cashier routes
  if (location.pathname.startsWith("/cashier")) {
    if (userRole === "cashier") return <>{children}</>;

    if ((userRole === "admin" || userRole === "manager") && session.activeStoreId) {
      return <>{children}</>;
    }

    console.warn("⛔ Admin/Manager missing store for cashier route.");
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // OPTIONAL ROLE CHECK
  // ----------------------------------------------
  if (roles && !roles.includes(userRole)) {
    return <Navigate to={userRole === "cashier" ? "/cashier" : "/admin"} replace />;
  }

  // ----------------------------------------------
  // ✅ ACCESS GRANTED
  // ----------------------------------------------
  return <>{children}</>;
}