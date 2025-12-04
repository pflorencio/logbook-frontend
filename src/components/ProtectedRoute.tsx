import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // ⭐ NEW: optional role-based access
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const sessionRaw = localStorage.getItem("cashierSession");
  const token = localStorage.getItem("token");

  // If no session or token → not authenticated
  if (!sessionRaw || !token) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  let session: any;
  try {
    session = JSON.parse(sessionRaw);
  } catch (err) {
    console.error("Invalid session JSON:", err);
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // ⭐ SESSION TIMEOUT (1 HOUR)
  // ----------------------------------------------
  const ONE_HOUR = 60 * 60 * 1000; // 3600000 ms
  const sessionTimestamp = session.timestamp;

  if (!sessionTimestamp || Date.now() - sessionTimestamp > ONE_HOUR) {
    console.warn("Session expired — logging out.");

    // Clear auth data
    localStorage.removeItem("cashierSession");
    localStorage.removeItem("token");
    localStorage.removeItem("store");
    localStorage.removeItem("submittedBy");

    return <Navigate to="/login" replace />;
  }

  // ----------------------------------------------
  // ⭐ ROLE-BASED ACCESS CONTROL
  // ----------------------------------------------

  // Default role = "cashier" if not set (for backward compatibility)
  const userRole: string = session.role || "cashier";

  // If route specifies required roles…
  if (roles && !roles.includes(userRole)) {
    console.warn(`Access denied for role "${userRole}". Allowed roles:`, roles);

    // Redirect unauthorized users:
    // Cashier → cashier form
    // Manager/Admin → admin dashboard
    if (userRole === "cashier") {
      return <Navigate to="/cashier" replace />;
    } else {
      return <Navigate to="/admin" replace />;
    }
  }

  // ----------------------------------------------
  // If NOT expired and role allowed → allow access
  // ----------------------------------------------
  return <>{children}</>;
}
