/**
 * Bill upload / input screen (web).
 *
 * Mirrors the "Scan Your Bill" mockup: a file dropzone plus a manual entry
 * form. When the dropped file is an image (JPG/PNG), it's sent to the OCR
 * endpoint and the recognised values pre-fill the form — the user then
 * verifies/corrects before saving. Manual entry is always the fallback, so
 * a bad or unavailable scan never blocks the user. On submit everything is posted as
 * multipart/form-data via the API client.
 */

import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowClockwiseIcon,
  UploadSimpleIcon,
  PlusIcon,
  IdentificationBadgeIcon,
  StorefrontIcon,
  LightningIcon,
  CurrencyCircleDollarIcon,
  CalendarIcon,
} from "@phosphor-icons/react";
import {
  ApiError,
  createBill,
  scanBill,
  type BillFormData,
} from "../../lib/api";
import { formPatchFrom, scanNoteFor } from "./scanSummary";
import styles from "./BillUpload.module.css";

// Client-side mirror of the server's file rules, so we can reject bad
// files before uploading and show a friendly message immediately.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/** Blank form state used on first render and after a successful save. */
const EMPTY_FORM: BillFormData = {
  accountName: "",
  provider: "",
  kwhUsed: "",
  amount: "",
  periodStart: "",
  periodEnd: "",
};

export function BillUpload() {
  const [form, setForm] = useState<BillFormData>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  /** Update one field of the manual form as the user types. */
  function handleField(field: keyof BillFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /**
   * Send an image to the OCR endpoint and pre-fill any fields it recognised.
   * Only non-empty suggestions overwrite the form, so a partial scan still
   * helps. Failures are swallowed to a note — the user can always type it in.
   */
  async function autoFillFromScan(image: File) {
    setScanning(true);
    setScanNote(null);
    try {
      const scan = await scanBill(image);
      // Both derived from the scan before any state is touched: building the
      // summary inside the updater meant reading it before React had run it.
      setForm((prev) => ({ ...prev, ...formPatchFrom(scan) }));
      setScanNote(scanNoteFor(scan));
    } catch {
      setScanNote("Scan failed — enter the numbers manually below.");
    } finally {
      setScanning(false);
    }
  }

  /** Validate a chosen file against the same rules the server enforces. */
  function handleFile(selected: File | null) {
    setFileError(null);
    setScanNote(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setFileError("Only JPG, PNG, or PDF files are allowed.");
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setFileError("Max file size is 10 MB.");
      return;
    }
    setFile(selected);
    // Images can be scanned to pre-fill the form; PDFs aren't sent to the
    // vision model, so they're just attached for record-keeping.
    if (selected.type === "image/jpeg" || selected.type === "image/png") {
      void autoFillFromScan(selected);
    }
  }

  /** Submit the form to the API and reflect success/failure in the UI. */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setSavedMessage(null);
    try {
      const bill = await createBill(form, file);
      setSavedMessage(`Saved ${bill.accountName} — ${bill.kwhUsed} kWh.`);
      setForm(EMPTY_FORM);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      // ApiError carries the backend's per-field validation details.
      if (err instanceof ApiError) {
        setErrors(err.details?.length ? err.details : [err.message]);
      } else {
        setErrors(["Something went wrong. Is the API running on :4000?"]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.BillUpload}>
      <button
        className={styles.BillForm_back}
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeftIcon size={16} weight="bold" />
        Back
      </button>
      <h1 className={styles.BillUpload_title}>Scan Your Bill</h1>
      <p className={styles.BillUpload_subtitle}>
        Upload a photo of your electricity bill to auto-fill the form, or enter
        the numbers manually below.
      </p>

      {/* File dropzone — an image gets OCR'd to pre-fill the form. */}
      <button
        type="button"
        className={
          scanning ? `${styles.Dropzone} ${styles.Dropzone__scanning}` : styles.Dropzone
        }
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
        // Reading a bill can take tens of seconds, so the wait is announced
        // rather than left to the spinner, which a screen reader can't see.
        aria-busy={scanning}
      >
        {scanning ? (
          <ArrowClockwiseIcon
            className={styles.Dropzone_spinner}
            size={30}
            weight="bold"
          />
        ) : (
          <UploadSimpleIcon className={styles.Dropzone_icon} size={28} />
        )}
        <span className={styles.Dropzone_label}>
          {scanning ? "Reading your bill…" : file ? file.name : "Upload from File"}
        </span>
        <span className={styles.Dropzone_hint}>
          {scanning
            ? "This can take up to a minute. You can type the details in below instead."
            : "JPG, PNG, or PDF · max 10 MB"}
        </span>
      </button>

      {/* Announced to screen readers, which never see the spinner. Kept
          outside the disabled button so it is still read out. */}
      <span role="status" aria-live="polite" className={styles.VisuallyHidden}>
        {scanning ? "Reading your bill. This can take up to a minute." : ""}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className={styles.VisuallyHidden}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {fileError && <p className={styles.BillUpload_error}>{fileError}</p>}
      {scanNote && <p className={styles.BillUpload_scanNote}>{scanNote}</p>}

      {/* Manual entry — the numbers the MVP relies on. */}
      <form className={styles.BillForm} onSubmit={handleSubmit}>
        <label className={styles.BillForm_field}>
          <span className={styles.BillForm_fieldLabel}>
            <IdentificationBadgeIcon size={16} />
            Account name
          </span>
          <input
            value={form.accountName}
            onChange={(e) => handleField("accountName", e.target.value)}
            placeholder="Cafe Marie"
            required
          />
        </label>
        <label className={styles.BillForm_field}>
          <span className={styles.BillForm_fieldLabel}>
            <StorefrontIcon size={16} />
            Provider
          </span>
          <input
            value={form.provider}
            onChange={(e) => handleField("provider", e.target.value)}
            placeholder="Meralco"
            required
          />
        </label>
        <div className={styles.BillForm_row}>
          <label className={styles.BillForm_field}>
            <span className={styles.BillForm_fieldLabel}>
              <LightningIcon size={16} />
              Energy used (kWh)
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={form.kwhUsed}
              onChange={(e) => handleField("kwhUsed", e.target.value)}
              placeholder="312"
              required
            />
          </label>
          <label className={styles.BillForm_field}>
            <span className={styles.BillForm_fieldLabel}>
              <CurrencyCircleDollarIcon size={16} />
              Amount
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={form.amount}
              onChange={(e) => handleField("amount", e.target.value)}
              placeholder="1785.50"
              required
            />
          </label>
        </div>
        <div className={styles.BillForm_row}>
          <label className={styles.BillForm_field}>
            <span className={styles.BillForm_fieldLabel}>
              <CalendarIcon size={16} />
              Period start
            </span>
            <input
              type="date"
              value={form.periodStart}
              onChange={(e) => handleField("periodStart", e.target.value)}
              required
            />
          </label>
          <label className={styles.BillForm_field}>
            <span className={styles.BillForm_fieldLabel}>
              <CalendarIcon size={16} />
              Period end
            </span>
            <input
              type="date"
              value={form.periodEnd}
              onChange={(e) => handleField("periodEnd", e.target.value)}
              required
            />
          </label>
        </div>

        {/* Validation / server errors. */}
        {errors.length > 0 && (
          <ul className={styles.BillUpload_errorList}>
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}
        {/* On success, offer the next onboarding step rather than navigating
            away automatically — someone logging a monthly bill shouldn't be
            pushed into the appliance survey every time. */}
        {savedMessage && (
          <div className={styles.BillUpload_saved}>
            <p className={styles.BillUpload_success}>{savedMessage}</p>
            <Link className={styles.BillUpload_next} to="/appliances">
              Next: add your appliances
              <ArrowRightIcon size={16} weight="bold" />
            </Link>
          </div>
        )}

        <button
          type="submit"
          className={styles.BillForm_submit}
          disabled={submitting}
        >
          {!submitting && <PlusIcon size={18} weight="bold" />}
          {submitting ? "Saving…" : "Add bill"}
        </button>
      </form>
    </div>
  );
}
