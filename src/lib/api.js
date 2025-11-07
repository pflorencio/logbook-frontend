// ✅ lib/api.js
const BACKEND_URL =
  import.meta.env.VITE_API_BASE ||
  "https://dc1d5084-d907-4236-8b8b-7b2b6225dddf-00-wb051pwb7av8.janeway.replit.dev";

console.log("🟢 Using backend URL:", BACKEND_URL);

export async function fetchClosings(businessDate) {
  const url = `${BACKEND_URL}/closings?business_date=${encodeURIComponent(businessDate)}`;
  console.log("📡 fetchClosings →", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchClosings failed: ${res.status}`);
  const data = await res.json();
  console.log("✅ Closings response:", data);
  return data;
}

export async function fetchDailySummary(businessDate) {
  const url = `${BACKEND_URL}/reports/daily-summary?business_date=${encodeURIComponent(businessDate)}`;
  console.log("📡 fetchDailySummary →", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchDailySummary failed: ${res.status}`);
  const data = await res.json();
  console.log("✅ Summary response:", data);
  return data;
}

export async function verifyRecord(record_id, status, verified_by) {
  const url = `${BACKEND_URL}/verify`;
  const payload = { record_id, status, verified_by };
  console.log("📡 verifyRecord →", url, payload);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`verifyRecord failed: ${res.status}`);
  const data = await res.json();
  console.log("✅ verifyRecord response:", data);
  return data;
}

export async function updateField(recordId, fieldName, newValue) {
  const apiBase =
    import.meta.env.VITE_API_BASE ||
    "https://dc1d5084-d907-4236-8b8b-7b2b6225dddf-00-wb051pwb7av8.janeway.replit.dev";

  const response = await fetch(`${apiBase}/closings/${recordId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      [fieldName]: newValue,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update failed: ${text}`);
  }

  return await response.json();
}
