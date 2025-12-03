import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import CashierForm from "./CashierForm";

export default function CashierPage(): JSX.Element {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const session = localStorage.getItem("cashierSession");
    if (!session) {
      // Not logged in → send to login
      window.location.href = "/login";
      return;
    }

    setIsReady(true);
  }, []);

  if (!isReady) {
    // Avoid flicker during redirect
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Daily Closing
        </h1>
        <p className="text-gray-500 mb-6">
          Complete the end-of-day cashier report for today’s business date.
        </p>

        <CashierForm />
      </div>
    </Layout>
  );
}