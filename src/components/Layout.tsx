import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [store, setStore] = useState<string>("");

  // -----------------------------------------------------------
  // 🔐 Step 7: Add Auth Guard
  // Redirect to /login if cashier session is missing
  // -----------------------------------------------------------
  useEffect(() => {
    const savedStore = localStorage.getItem("store");
    const token = localStorage.getItem("token");

    if (!savedStore || !token) {
      console.warn("⛔ No valid cashier session — redirecting to /login");

      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    setStore(savedStore);
  }, [location.pathname, navigate]);

  const navItems: NavItem[] = [
    { label: "Daily Closing", href: "/" },
    { label: "History", href: "/history" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b flex justify-between items-center px-4 py-2">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <span className="text-2xl">🍽️</span>
          <span className="font-semibold text-gray-800 text-lg">
            Restaurant Ops
          </span>
        </div>

        <div className="text-sm text-gray-600 font-medium">
          Store: {store || "Not Set"}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex justify-center gap-4 bg-gray-100 py-2 border-b">
        {navItems.map((item: NavItem) => (
          <Link key={item.href} to={item.href}>
            <button
              className={`text-sm font-medium px-3 py-1 rounded-md ${
                location.pathname === item.href
                  ? "text-green-700 border-b-2 border-green-600 font-semibold"
                  : "text-gray-600 hover:text-green-700"
              }`}
            >
              {item.label}
            </button>
          </Link>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-y-auto">{children}</main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 py-2 border-t">
        © {new Date().getFullYear()} Restaurant Ops | Powered by Nonie’s Group
      </footer>
    </div>
  );
}
