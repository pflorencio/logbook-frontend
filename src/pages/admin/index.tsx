// src/pages/admin/index.tsx
import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { BACKEND_URL } from "@/lib/api";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [storeSummaries, setStoreSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get yesterday's business date (YYYY-MM-DD)
  function getYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  const businessDate = getYesterday();

  // Fetch summaries for each store the user has access to
  async function loadDashboard() {
    setLoading(true);

    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return;

      const session = JSON.parse(sessionRaw);

      // Determine store list
      let stores: any[] = [];

      if (session.storeAccess && session.storeAccess.length > 0) {
        stores = session.storeAccess;
      } else if (session.store) {
        stores = [session.store];
      }

      // Alphabetical ordering
      stores.sort((a, b) => a.name.localeCompare(b.name));

      const results: any[] = [];

      for (const store of stores) {
        try {
          const res = await fetch(
            `${BACKEND_URL}/dashboard/closings?store_id=${store.id}&business_date=${businessDate}`
          );
          const data = await res.json();

          results.push({
            storeName: store.name,
            summary: data.summary || null,
            missing: !data.summary,
          });
        } catch (err) {
          console.error("Error loading store summary:", err);
          results.push({
            storeName: store.name,
            summary: null,
            missing: true,
          });
        }
      }

      setStoreSummaries(results);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const peso = (n: number | string | null | undefined) =>
    !n && n !== 0 ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;


  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily Multi-Store Dashboard</h1>
          <p className="text-gray-600">
            Business Date: <strong>{businessDate}</strong>
          </p>
        </div>

        {loading && <p className="text-gray-500">Loading dashboard…</p>}

        {!loading && storeSummaries.length === 0 && (
          <p className="text-gray-500">No stores available.</p>
        )}

        {/* Store-by-store blocks */}
        {!loading &&
          storeSummaries.map((s, idx) => (
            <div
              key={idx}
              className="bg-white border rounded-xl shadow-sm p-6 space-y-6"
            >
              {/* Store header */}
              <h2 className="text-xl font-semibold">{s.storeName}</h2>

              {/* Missing state */}
              {s.missing && (
                <p className="text-sm text-red-600">
                  Closing not submitted for this date.
                </p>
              )}

              {/* Summary cards */}
              {!s.missing && s.summary && (
                <div className="grid md:grid-cols-4 xl:grid-cols-8 gap-4">

                  <SummaryCard label="Variance" value={peso(s.summary.variance)} red={s.summary.variance < 0} />

                  <SummaryCard label="Total Budgets" value={peso(s.summary.total_budgets)} />
                  <SummaryCard label="Kitchen Budget" value={peso(s.summary.kitchen_budget || 0)} />
                  <SummaryCard label="Bar Budget" value={peso(s.summary.bar_budget || 0)} />
                  <SummaryCard label="Non-Food Budget" value={peso(s.summary.non_food_budget || 0)} />
                  <SummaryCard label="Staff Meal Budget" value={peso(s.summary.staff_meal_budget || 0)} />

                  <SummaryCard label="Cash for Deposit" value={peso(s.summary.cash_for_deposit)} />
                  <SummaryCard label="Transfer Needed" value={peso(s.summary.transfer_needed)} red />

                </div>
              )}
            </div>
          ))}
      </div>
    </AdminLayout>
  );
}


// --------------------------------------------
// Summary Card Component
// --------------------------------------------
function SummaryCard({
  label,
  value,
  red,
}: {
  label: string;
  value: string;
  red?: boolean;
}) {
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${red ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
