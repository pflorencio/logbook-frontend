// -------------------------------------------------------------
// lib/api.ts — Production-Ready TypeScript API Client
// -------------------------------------------------------------

// Centralized Backend URL
export const BACKEND_URL: string =
  import.meta.env.VITE_API_BASE || "https://restaurant-ops-backend.onrender.com";

console.log("🟢 Using backend URL:", BACKEND_URL);

// -------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------

export interface AirtableFields {
  [key: string]: any;
}

export interface ClosingRecord {
  id: string;
  fields: AirtableFields;
}

export interface ClosingsResponse {
  count?: number;
  records?: ClosingRecord[];
  // From /closings/unique
  status?: string;
  fields?: Record<string, any>;
  lock_status?: string;
}

export interface DailySummaryResponse {
  business_date: string;
  store?: string | null;
  preview: string;
}

export interface VerifyPayload {
  record_id: string;
  status: string;
  verified_by: string;
}

// -------------------------------------------------------------
// Shared Fetch Helper
// -------------------------------------------------------------
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  console.log("🌐 API →", options.method || "GET", url);

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ API Error:", text);
    throw new Error(text || `Request failed with ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new Error("Invalid JSON response");
  }
}

// -------------------------------------------------------------
// GET: closing records for a date
// -------------------------------------------------------------
export async function fetchClosings(
  businessDate: string
): Promise<ClosingsResponse> {
  const url = `${BACKEND_URL}/closings?business_date=${encodeURIComponent(
    businessDate
  )}`;

  return apiRequest<ClosingsResponse>(url);
}

// -------------------------------------------------------------
// GET: daily summary
// -------------------------------------------------------------
export async function fetchDailySummary(
  businessDate: string
): Promise<DailySummaryResponse> {
  const url = `${BACKEND_URL}/reports/daily-summary?business_date=${encodeURIComponent(
    businessDate
  )}`;

  return apiRequest<DailySummaryResponse>(url);
}

// -------------------------------------------------------------
// POST: verify a record
// -------------------------------------------------------------
export async function verifyRecord(
  record_id: string,
  status: string,
  verified_by: string
) {
  const url = `${BACKEND_URL}/verify`;
  const payload: VerifyPayload = { record_id, status, verified_by };

  return apiRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------
// PATCH: update a single Airtable field
// -------------------------------------------------------------
export async function updateField(
  recordId: string,
  fieldName: string,
  newValue: number
) {
  const url = `${BACKEND_URL}/closings/${recordId}`;

  return apiRequest(url, {
    method: "PATCH",
    body: JSON.stringify({
      [fieldName]: newValue,
    }),
  });
}
