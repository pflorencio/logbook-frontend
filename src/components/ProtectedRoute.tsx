import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // optional role-based access
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const location = useLocation();
  const hostname = window.location.hostname;

  // ----------------------------------------------
  // LOAD SESSION
  // ----------------------------------------------
  const raw = localStorage.getItem("session");
  const token = localStorage.getItem("token");

  if (!raw || !token) {
    console.warn("⛔ No valid session found. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  // Safely parse session
  let session: any = null;
  try {
    session = JSON.parse(raw);
  } catch (err) {
    console.error("⛔ Invalid session JSON:", err);
    localStorage.clear();
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
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // AUTO-REFRESH TIMESTAMP
  // ----------------------------------------------
  session.timestamp = Date.now();
  localStorage.setItem("session", JSON.stringify(session));

  // ----------------------------------------------
  // ⏳ ALLOW LOGIN PAGE DURING STORE SELECTION
  // ----------------------------------------------
  if (location.pathname === "/login") {
    return <>{children}</>;
  }
  
  // ----------------------------------------------
  // 🌐 DOMAIN-LEVEL ACCESS RULES
  // ----------------------------------------------

  // admin.logbook.ph → ONLY admin / manager
  if (hostname.startsWith("admin.")) {
    if (userRole !== "admin" && userRole !== "manager") {
      console.warn("⛔ Cashier blocked from admin domain.");
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }
  }

  // ----------------------------------------------
  // 🚨 PATH-LEVEL ROLE RULES (PHASE 1)
  // ----------------------------------------------

  // /admin routes → admin / manager only
  if (location.pathname.startsWith("/admin")) {
    if (userRole !== "admin" && userRole !== "manager") {
      console.warn("⛔ Unauthorized access to admin route.");
      return <Navigate to="/login" replace />;
    }
  }

  // /cashier routes →
  // ✅ cashiers always allowed
  // ✅ admin / manager allowed ONLY if a store is selected
  if (location.pathname.startsWith("/cashier")) {
    // Cashiers are always allowed
    if (userRole === "cashier") return <>{children}</>;

    // Admin / Manager allowed ONLY with store context
    if (
      (userRole === "admin" || userRole === "manager") &&
      session.activeStoreId
    ) {
      return <>{children}</>;
    }

    console.warn("⛔ Admin/Manager missing store for cashier route.");
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // OPTIONAL EXPLICIT ROLE CHECK
  // ----------------------------------------------
  if (roles && !roles.includes(userRole)) {
    console.warn(`⛔ Role "${userRole}" not permitted. Required:`, roles);

    if (userRole === "cashier") {
      return <Navigate to="/cashier" replace />;
    }

    return <Navigate to="/admin" replace />;
  }

  // ----------------------------------------------
  // ✅ ACCESS GRANTED
  // ----------------------------------------------
  return <>{children}</>;
}