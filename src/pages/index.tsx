import Layout from "../components/Layout";

export default function IndexPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto text-center mt-10">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Daily Closing
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome to the Restaurant Ops Dashboard. <br />
          This will be your daily closing form and summary hub.
        </p>
        <div className="bg-white rounded-xl shadow p-6 border">
          <p className="text-gray-500 italic">
            The closing form component will appear here soon.
          </p>
        </div>
      </div>
    </Layout>
  );
}
