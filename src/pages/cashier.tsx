import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import CashierForm from "./CashierForm";
import { useNavigate } from "react-router-dom";

export default function CashierPage() {
  const navigate = useNavigate();
  const [cashierName, setCashierName] = useState<string | null>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem("cashierSession");
    if (!sessionStr) {
      navigate("/login", { replace: true });
      return;
    }

    const session = JSON.parse(sessionStr);

    // Expire after 12 hours
    const twelveHours = 12 * 60 * 60 * 1000;
    const expired = Date.now() - session.timestamp > twelveHours;

    if (expired) {
      localStorage.removeItem("cashierSession");
      navigate("/login", { replace: true });
      return;
    }

    setCashierName(session.cashierName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cashierSession");
    navigate("/login", { replace: true });
  };

  return (
    <Layout cashierName={cashierName} onLogout={handleLogout}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Daily Closing
        </h1>
        <p className="text-gray-500 mb-6">
          Complete the end-of-day report for today’s business date.
        </p>

        <CashierForm />
      </div>
    </Layout>
  );
}
