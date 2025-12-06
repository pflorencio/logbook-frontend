import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // optional role-based access
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  // ⭐ Using new universal session format
  const sessionRaw = localStorage.getItem("session");
  const token = localStorage.getItem("token");

  // ----------------------------------------------
  // AUTH CHECK
  // ----------------------------------------------
  if (!sessionRaw || !token) {
    console.warn("⛔ No session or token → redirecting to login.");
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  let session: any;
  try {
    session = JSON.parse(sessionRaw);
  } catch (err) {
    console.error("⛔ Invalid session JSON:", err);
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // SESSION TIMEOUT (1 hour)
  // ----------------------------------------------
  const ONE_HOUR = 60 * 60 * 1000; 
  const lastTimestamp = session.timestamp;

  if (!lastTimestamp || Date.now() - lastTimestamp > ONE_HOUR) {
    console.warn("⏰ Session expired — logging out.");
    localStorage.removeItem("session");
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // ⭐ AUTO-REFRESH SESSION TIMESTAMP (Keeps user active)
  // ----------------------------------------------
  session.timestamp = Date.now();
  localStorage.setItem("session", JSON.stringify(session));

  // ----------------------------------------------
  // ROLE-BASED ACCESS CONTROL
  // ----------------------------------------------
  const userRole: string = session.role || "cashier";

  if (roles && !roles.includes(userRole)) {
    console.warn(
      `⛔ Access denied for role "${userRole}". Required roles:`,
      roles
    );

    // Redirect unauthorized roles safely
    if (userRole === "cashier") {
      return <Navigate to="/cashier" replace />;
    }

    // Manager/Admin fallback
    return <Navigate to="/admin" replace />;
  }

  // ----------------------------------------------
  // ACCESS GRANTED
  // ----------------------------------------------
  return <>{children}</>;
}
