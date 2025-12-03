import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const sessionRaw = localStorage.getItem("cashierSession");
  const token = localStorage.getItem("token");

  // If no session or token → not logged in
  if (!sessionRaw || !token) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch (err) {
    console.error("Invalid session JSON:", err);
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // --- SESSION TIMEOUT LOGIC (1 hour = 3600000 ms) ---
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

  // If NOT expired → allow access
  return <>{children}</>;
}
