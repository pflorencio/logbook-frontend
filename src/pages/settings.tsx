import Layout from "../components/Layout";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto mt-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Settings</h1>
        <p className="text-gray-600">
          This section will later contain user preferences, store assignments,
          and authentication options.
        </p>
      </div>
    </Layout>
  );
}
