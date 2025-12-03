// -------------------------------------------------------------
// StoreName type — SINGLE source of truth for store names
// -------------------------------------------------------------
export type StoreName =
  | "Nonie's"
  | "Muchos"
  | "Little Taj"
  | "Island Izakaya";

// -------------------------------------------------------------
// List of store names (NEW — fixes Vite build error)
// -------------------------------------------------------------
export const STORE_NAMES: StoreName[] = [
  "Nonie's",
  "Muchos",
  "Little Taj",
  "Island Izakaya",
];

// -------------------------------------------------------------
// Central Store PIN mapping
// (Frontend local login only — NOT sensitive)
// -------------------------------------------------------------
export const STORE_PINS: Record<StoreName, string> = {
  "Nonie's": "1111",
  Muchos: "2222",
  "Little Taj": "3333",
  "Island Izakaya": "4444",
};
