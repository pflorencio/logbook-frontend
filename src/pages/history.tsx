import Layout from "../components/Layout";

export default function HistoryPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto mt-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">History</h1>
        <p className="text-gray-600 mb-4">
          This page will show previously submitted daily closings from Airtable.
        </p>
        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500 italic">
            History data will load here via the `/history` endpoint.
          </p>
        </div>
      </div>
    </Layout>
  );
}
