import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();

  const session = localStorage.getItem("cashierSession");
  const token = localStorage.getItem("token");

  // Not logged in → redirect to login
  if (!session || !token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
