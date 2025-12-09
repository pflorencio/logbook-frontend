import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { BACKEND_URL, verifyRecord } from "@/lib/api";
import toast from "react-hot-toast";

export default function VerifyClosing() {
  const { recordId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<any>(null);
  const [editable, setEditable] = useState<any>({});
  const [summary, setSummary] = useState<any>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [businessDate, setBusinessDate] = useState<string | null>(null);

  // Local helper
  const peso = (n: number | string | null | undefined) =>
    !n && n !== 0 ? "₱0" : `₱${Number(n).toLocaleString("en-PH")}`;

  // ------------------------------------------------
  // Fetch full record + backend summary
  // ------------------------------------------------
  async function loadRecord() {
    try {
      setLoading(true);

      const res = await fetch(`${BACKEND_URL}/closings/${recordId}`);
      const data = await res.json();

      if (!data?.fields) {
        toast.error("Record not found.");
        return;
      }

      setFields(data.fields);
      setEditable({
        "Actual Cash Counted": data.fields["Actual Cash Counted"],
        "Kitchen Budget": data.fields["Kitchen Budget"],
        "Bar Budget": data.fields["Bar Budget"],
        "Non Food Budget": data.fields["Non Food Budget"],
        "Staff Meal Budget": data.fields["Staff Meal Budget"],
        "Marketing Expenses": data.fields["Marketing Expenses"],
        Notes: data.fields["Notes"] || "",
      });

      const bd = data.fields.Date;
      const storeId = data.fields.Store?.[0];

      setBusinessDate(bd);
      setStoreName(data.fields["Store Name"] || data.fields.Store);

      if (bd && storeId) {
        const summaryRes = await fetch(
          `${BACKEND_URL}/dashboard/closings?store_id=${storeId}&business_date=${bd}`
        );
        const summaryData = await summaryRes.json();
        setSummary(summaryData.summary);
      }
    } catch (err) {
      console.error("❌ Failed to load record:", err);
      toast.error("Failed to load record.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecord();
  }, [recordId]);


  // ------------------------------------------------
  // UPDATE FIELD LOCALLY
  // ------------------------------------------------
  function updateField(name: string, value: string) {
    setEditable((prev: any) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value),
    }));
  }


  // ------------------------------------------------
  // SAVE CHANGES (PATCH)
  // ------------------------------------------------
  async function handleSave() {
    try {
      const payload: any = {};

      Object.entries(editable).forEach(([key, val]) => {
        payload[key] = val;
      });

      const res = await fetch(`${BACKEND_URL}/closings/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast.error("Failed to save changes.");
        return;
      }

      toast.success("Changes saved.");
      await loadRecord();
    } catch (err) {
      console.error(err);
      toast.error("Error saving changes.");
    }
  }


  // ------------------------------------------------
  // VERIFY RECORD (POST /verify)
  // ------------------------------------------------
  async function handleVerify() {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const verifiedBy = session.name || "Manager";

      await verifyRecord(recordId!, "verified", verifiedBy);

      toast.success("Closing verified successfully.");
      navigate(`/admin/closing/${recordId}`);
    } catch (err) {
      console.error("❌ Failed to verify:", err);
      toast.error("Failed to verify closing.");
    }
  }


  return (
    <AdminLayout>
      <div className="p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Verify Closing
            </h1>
            <p className="text-gray-600">
              {storeName ? `${storeName} — ${businessDate}` : ""}
            </p>
          </div>

          <button
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            onClick={() => navigate(`/admin/closing/${recordId}`)}
          >
            ← Back to Record
          </button>
        </div>

        {/* LOADING */}
        {loading && <p className="text-gray-500">Loading…</p>}

        {!loading && fields && (
          <>

            {/* SUMMARY CARDS */}
            {summary && (
              <div className="grid md:grid-cols-4 gap-4 mt-4">
                <div className="p-4 bg-white shadow rounded-xl border">
                  <p className="text-xs text-gray-500">Variance</p>
                  <p className={`text-lg font-bold ${summary.variance < 0 ? "text-red-600" : "text-green-700"}`}>
                    {peso(summary.variance)}
                  </p>
                </div>
                <div className="p-4 bg-white shadow rounded-xl border">
                  <p className="text-xs text-gray-500">Total Budgets</p>
                  <p className="text-lg font-bold">{peso(summary.total_budgets)}</p>
                </div>
                <div className="p-4 bg-white shadow rounded-xl border">
                  <p className="text-xs text-gray-500">Cash for Deposit</p>
                  <p className="text-lg font-bold">{peso(summary.cash_for_deposit)}</p>
                </div>
                <div className="p-4 bg-white shadow rounded-xl border">
                  <p className="text-xs text-gray-500">Transfer Needed</p>
                  <p className="text-lg font-bold text-red-600">
                    {peso(summary.transfer_needed)}
                  </p>
                </div>
              </div>
            )}

            {/* EDITABLE FIELDS */}
            <div className="bg-white shadow rounded-xl border p-6 space-y-4 mt-6">
              <h2 className="text-lg font-semibold mb-2">Adjust Editable Fields</h2>

              {[
                "Actual Cash Counted",
                "Kitchen Budget",
                "Bar Budget",
                "Non Food Budget",
                "Staff Meal Budget",
                "Marketing Expenses",
              ].map((field) => (
                <div key={field} className="flex flex-col">
                  <label className="text-sm text-gray-600">{field}</label>
                  <input
                    type="number"
                    value={editable[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-white mt-1"
                  />
                </div>
              ))}

              {/* Notes */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600">Notes</label>
                <textarea
                  value={editable["Notes"]}
                  onChange={(e) =>
                    setEditable((prev: any) => ({
                      ...prev,
                      Notes: e.target.value,
                    }))
                  }
                  className="px-3 py-2 rounded-lg border bg-white mt-1 h-24"
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={handleSave}
                className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Save Changes
              </button>

              <button
                onClick={handleVerify}
                className="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700"
              >
                Verify Closing
              </button>

              <button
                onClick={() => navigate(`/admin/closing/${recordId}`)}
                className="px-5 py-3 bg-gray-200 rounded-xl hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>

          </>
        )}
      </div>
    </AdminLayout>
  );
}
