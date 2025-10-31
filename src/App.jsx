import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import OpsDashboard from "./pages/OpsDashboard";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1 className="text-3xl font-bold mb-4">
                  Restaurant Operations Dashboard
                </h1>
                <p className="text-gray-600 mb-6">
                  Welcome to the control panel. Choose a section below.
                </p>
                <Link
                  to="/ops"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Dashboard
                </Link>
              </div>
            }
          />
          <Route path="/ops" element={<OpsDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
