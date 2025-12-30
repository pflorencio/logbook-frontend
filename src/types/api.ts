// -------------------------------------------------------------
// Shared API Response Types
// -------------------------------------------------------------

export interface AirtableFields {
  [key: string]: any;
  Store?: string;
  "Last Updated At"?: string;
  "Verified Status"?: string;
}

export interface ClosingRecord {
  id: string;
  fields: AirtableFields;
}

export interface ClosingsResponse {
  count?: number;
  records?: ClosingRecord[];
  status?: string;
  fields?: AirtableFields;
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
