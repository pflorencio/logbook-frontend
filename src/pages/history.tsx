import React from "react";
import Layout from "../components/Layout";

export default function HistoryPage(): JSX.Element {
  return (
    <Layout>
      <main className="max-w-4xl mx-auto mt-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">History</h1>
        <p className="text-gray-600 mb-4">
          This page will show previously submitted daily closings from Airtable.
        </p>

        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500 italic">
            History data will load here via the <code>/history</code> endpoint.
          </p>
        </div>
      </main>
    </Layout>
  );
}
