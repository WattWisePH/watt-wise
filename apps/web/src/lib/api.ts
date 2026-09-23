/**
 * Thin typed client for the Watty backend (apps/api).
 *
 * All network calls to the Node API go through here so components never
 * hardcode URLs or duplicate fetch/error logic. The base URL is read from
 * VITE_API_URL at build time and falls back to the local dev server.
 *
 * Every request carries the Supabase access token: the bill and appliance
 * routes require it and scope their data to the signed-in user. Note that the
 * multipart calls pass only the auth header — setting Content-Type by hand
 * would clobber the boundary the browser generates for FormData.
 */

import { authHeaders } from "./session";

// Vite exposes env vars prefixed with VITE_. In dev this defaults to the
// local Express server; set VITE_API_URL in a .env for other environments.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/**
 * Absolute URL for an API path. Exported so sibling modules (establishments)
 * resolve against the same base instead of reading the env var again.
 */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

/** Shape of a bill as returned by the API (mirrors apps/api Bill type). */
export interface Bill {
  id: string;
  establishmentId: string;
  providerId: string | null;
  kwhUsed: number;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
  file: { originalName: string; mimeType: string; size: number } | null;
  createdAt: string;
}

/**
 * The manual fields the upload form collects. No accountName or provider
 * here: both belong to the establishment the bill is filed under (the API
 * path names it, and the server defaults providerId from it), not the bill
 * itself.
 */
export interface BillFormData {
  kwhUsed: string; // kept as strings from the form inputs
  amount: string;
  periodStart: string;
  periodEnd: string;
}

/** Error thrown for non-2xx responses, carrying the API's error payload. */
export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Create a bill under an establishment. Sends multipart/form-data so the
 * optional scanned file rides along with the manual fields — exactly what
 * the API's multer middleware expects. `file` is optional (manual entry
 * works on its own). The provider is never sent from here: the server
 * always files the bill under the establishment's own provider.
 */
export async function createBill(
  establishmentId: string,
  form: BillFormData,
  file: File | null,
): Promise<Bill> {
  const body = new FormData();
  // Append each manual field; FormData sends them as text parts.
  body.append("kwhUsed", form.kwhUsed);
  body.append("amount", form.amount);
  body.append("periodStart", form.periodStart);
  body.append("periodEnd", form.periodEnd);
  if (file) body.append("file", file);

  const res = await fetch(`${API_URL}/api/establishments/${establishmentId}/bills`, {
    method: "POST",
    headers: await authHeaders(),
    body,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface the API's message + per-field details to the UI.
    throw new ApiError(
      data.message ?? data.error ?? "Failed to save bill",
      res.status,
      data.details,
    );
  }
  return data as Bill;
}

/** Fetch an establishment's bills, newest first. */
export async function listBills(establishmentId: string): Promise<Bill[]> {
  const res = await fetch(`${API_URL}/api/establishments/${establishmentId}/bills`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new ApiError("Failed to load bills", res.status);
  return (await res.json()) as Bill[];
}

/**
 * One appliance as recorded by the survey. `type` and `isInverter` are
 * resolved from the lookup tables by the API on the way out — they're what
 * the recommendation engine reads, not what the survey submits.
 */
export interface Appliance {
  id: string;
  establishmentId: string;
  kindId: string;
  subtypeId: string | null;
  type: string;
  count: number;
  isInverter?: boolean;
  ageYears?: number;
  createdAt: string;
}

/**
 * What the survey form collects for one appliance before submitting.
 * Ids from the lookup tables, not free text: "Aircon", "aircon" and "Air
 * Conditioner" would otherwise all arrive as different appliances.
 */
export interface ApplianceDraft {
  kindId: string;
  /** Absent when the kind has no variants, or the user skipped the detail. */
  subtypeId?: string;
  count: number;
  ageYears?: number;
}

/**
 * Submit the whole survey for an establishment in one request. The API
 * validates every entry before saving any of them, so a bad row rejects the
 * batch rather than leaving a partial survey.
 */
export async function saveAppliances(
  establishmentId: string,
  drafts: ApplianceDraft[],
): Promise<Appliance[]> {
  const res = await fetch(
    `${API_URL}/api/establishments/${establishmentId}/appliances`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(drafts),
    },
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.message ?? data.error ?? "Failed to save appliances",
      res.status,
      data.details,
    );
  }
  return data as Appliance[];
}

/** Best-effort fields the OCR scan suggests (any may be absent). */
export interface ScanResult {
  accountName?: string;
  kwhUsed?: number;
  amount?: number;
  provider?: string;
  periodStart?: string;
  periodEnd?: string;
  rawText: string;
}

/**
 * OCR a bill image (JPG/PNG) and return suggested field values. This does
 * not save anything — the caller pre-fills the form with the result and the
 * user verifies before submitting. Only images are accepted (no PDF).
 */
export async function scanBill(file: File): Promise<ScanResult> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch(`${API_URL}/api/bills/scan`, {
    method: "POST",
    headers: await authHeaders(),
    body,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.message ?? data.error ?? "Failed to scan image",
      res.status,
    );
  }
  return data as ScanResult;
}
