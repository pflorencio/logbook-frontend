// -------------------------------------------------------------
// lib/api.ts — Clean, Organized, Production-Ready API Client
// -------------------------------------------------------------

export const BACKEND_URL: string =
  import.meta.env.VITE_API_BASE || "https://restaurant-ops-backend.onrender.com";

console.log("🟢 Using backend URL:", BACKEND_URL);

// -------------------------------------------------------------
// TYPES
// -------------------------------------------------------------

export interface StoreRef {
  id: string;
  name: string;
}

export interface User {
  user_id: string;
  name: string;
  pin?: string; // Not returned on login
  role: "cashier" | "manager" | "admin";
  active: boolean;
  store: StoreRef | null;
  store_access: StoreRef[];
}

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
  status?: string;
  fields?: Record<string, any>;
  lock_status?: string;
}

export interface DailySummaryResponse {
  business_date: string;
  store?: string | null;
  preview: string;
}

// -------------------------------------------------------------
// SHARED FETCH WRAPPER
// -------------------------------------------------------------

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  console.log("🌐 API REQUEST →", options.method || "GET", url);

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = await res.text();
    console.error("❌ API Error:", detail);
    throw new Error(detail || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

// -------------------------------------------------------------
// AUTH / USERS
// -------------------------------------------------------------

export async function fetchUsers(): Promise<User[]> {
  return apiRequest<User[]>(`${BACKEND_URL}/auth/users`);
}

export async function loginUser(user_id: string, pin: string) {
  return apiRequest(`${BACKEND_URL}/auth/user-login`, {
    method: "POST",
    body: JSON.stringify({ user_id, pin }),
  });
}

// -------------------------------------------------------------
// ADMIN — USER MANAGEMENT
// -------------------------------------------------------------

export async function createUser(payload: any) {
  return apiRequest(`${BACKEND_URL}/admin/users`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(user_id: string, payload: any) {
  return apiRequest(`${BACKEND_URL}/admin/users/${user_id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------
// STORES
// -------------------------------------------------------------

export async function fetchStores() {
  return apiRequest<{ id: string; name: string }[]>(`${BACKEND_URL}/stores`);
}

// -------------------------------------------------------------
// DAILY CLOSINGS
// -------------------------------------------------------------

// Dashboard: fetch all closings for date (optional store filter)
export async function fetchClosings(
  businessDate: string,
  storeId?: string
): Promise<ClosingsResponse> {
  let url = `${BACKEND_URL}/closings?business_date=${encodeURIComponent(
    businessDate
  )}`;
  if (storeId) url += `&store_id=${encodeURIComponent(storeId)}`;
  return apiRequest(url);
}

// Fetch unique closing record (store_id + date)
export async function fetchUniqueClosing(
  businessDate: string,
  storeId: string
): Promise<{ id?: string; fields?: any; status?: string }> {
  const url = `${BACKEND_URL}/closings/unique?business_date=${encodeURIComponent(
    businessDate
  )}&store_id=${encodeURIComponent(storeId)}`;

  return apiRequest(url);
}

// Create or update closing
export async function saveClosing(payload: any) {
  return apiRequest(`${BACKEND_URL}/closings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Dashboard inline update
export async function updateField(
  recordId: string,
  fieldName: string,
  newValue: number
) {
  return apiRequest(`${BACKEND_URL}/closings/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ [fieldName]: newValue }),
  });
}

// ⭐ Required for Manager Unlock Modal
export async function unlockRecord(recordId: string, pin: string) {
  return apiRequest(`${BACKEND_URL}/closings/${recordId}/unlock`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

// Verify (manager/admin)
export async function verifyRecord(
  record_id: string,
  status: string,
  verified_by: string
) {
  return apiRequest(`${BACKEND_URL}/verify`, {
    method: "POST",
    body: JSON.stringify({ record_id, status, verified_by }),
  });
}

// -------------------------------------------------------------
// REPORTING ENDPOINTS
// -------------------------------------------------------------

export async function fetchDailySummary(
  businessDate: string
): Promise<DailySummaryResponse> {
  return apiRequest(
    `${BACKEND_URL}/reports/daily-summary?business_date=${encodeURIComponent(
      businessDate
    )}`
  );
}
