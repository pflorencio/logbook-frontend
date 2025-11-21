import React from "react";
import Layout from "@/components/Layout";
import CashierForm from "./CashierForm";

export default function CashierPage(): JSX.Element {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Title + subtitle */}
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

