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
  pin?: string; // Only in /auth/users, never returned on login
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
// SHARED FETCH HELPER
// -------------------------------------------------------------

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
}

// -------------------------------------------------------------
// AUTH / USERS
// -------------------------------------------------------------

// Fetch list of active users
export async function fetchUsers(): Promise<User[]> {
  const url = `${BACKEND_URL}/auth/users`;
  return apiRequest<User[]>(url);
}

// Login user & validate PIN
export async function loginUser(user_id: string, pin: string) {
  const url = `${BACKEND_URL}/auth/user-login`;
  return apiRequest(url, {
    method: "POST",
    body: JSON.stringify({ user_id, pin }),
  });
}

// -------------------------------------------------------------
// ADMIN — USER MANAGEMENT
// -------------------------------------------------------------

// ⭐ CREATE USER (newly added)
export async function createUser(payload: any) {
  const url = `${BACKEND_URL}/admin/users`;
  return apiRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Update an existing user
export async function updateUser(user_id: string, payload: any) {
  const url = `${BACKEND_URL}/admin/users/${user_id}`;
  return apiRequest(url, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// -------------------------------------------------------------
// STORES
// -------------------------------------------------------------
export async function fetchStores() {
  const url = `${BACKEND_URL}/stores`;
  return apiRequest<{ id: string; name: string }[]>(url);
}

// -------------------------------------------------------------
// DAILY CLOSINGS (Cashier + Dashboard)
// -------------------------------------------------------------

// Multi-store fetch (Dashboard)
export async function fetchClosings(
  businessDate: string,
  storeId?: string
): Promise<ClosingsResponse> {
  let url = `${BACKEND_URL}/closings?business_date=${encodeURIComponent(
    businessDate
  )}`;

  if (storeId) {
    url += `&store_id=${encodeURIComponent(storeId)}`;
  }

  return apiRequest<ClosingsResponse>(url);
}

// Fetch unique closing record (store_id + date)
export async function fetchUniqueClosing(date: string, storeName: string) {
  const url = `${BACKEND_URL}/closings/unique?business_date=${date}&store_name=${encodeURIComponent(
    storeName
  )}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch unique closing");

  return res.json();
}

// Create/update a closing record
export async function saveClosing(payload: any) {
  const url = `${BACKEND_URL}/closings`;

  return apiRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Inline field update (Dashboard)
export async function updateField(
  recordId: string,
  fieldName: string,
  newValue: number
) {
  const url = `${BACKEND_URL}/closings/${recordId}`;

  return apiRequest(url, {
    method: "PATCH",
    body: JSON.stringify({ [fieldName]: newValue }),
  });
}

// Verify record (manager/admin)
export async function verifyRecord(
  record_id: string,
  status: string,
  verified_by: string
) {
  const url = `${BACKEND_URL}/verify`;

  return apiRequest(url, {
    method: "POST",
    body: JSON.stringify({ record_id, status, verified_by }),
  });
}

// -------------------------------------------------------------
// REPORTING
// -------------------------------------------------------------

export async function fetchDailySummary(
  businessDate: string
): Promise<DailySummaryResponse> {
  const url = `${BACKEND_URL}/reports/daily-summary?business_date=${encodeURIComponent(
    businessDate
  )}`;

  return apiRequest<DailySummaryResponse>(url);
}
