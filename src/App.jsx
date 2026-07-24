import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { loadDashboardRows, loadInFlightAudits, loadCurrentBatch, startBulkAudit, loadAllAudits, loadAuditDiagnostics } from "./data.js";
import { downloadExcel, downloadPdf, downloadDiagnosticsPdf, generatePdfData, generateDiagnosticsPdfData, reportRowsToSheetRows, compareColumnsToSheetRows } from "./export.js";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Icons (inline SVG components, stroke-based, no external icon library)
// ---------------------------------------------------------------------------
const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const IconGauge = () => <svg {...svgProps}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>;
const IconGlobe = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const IconClock = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
const IconDocument = () => <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>;
const IconLink = () => <svg {...svgProps}><path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-1.93 1.93a5 5 0 0 0 7.07 7.07L13.5 18.5" /></svg>;
const IconStopwatch = () => <svg {...svgProps}><path d="M10 2h4" /><path d="M12 14v-4" /><circle cx="12" cy="14" r="8" /></svg>;
const IconImage = () => <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>;
const IconHand = () => <svg {...svgProps}><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>;
const IconLayers = () => <svg {...svgProps}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>;
const IconActivity = () => <svg {...svgProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const IconWheelchair = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none" /><path d="M11 6v5l-4 6" /><path d="M11 11h5" /><path d="M13 11l3 7" /><path d="M7 17a4 4 0 1 0 7.6-1.8" /></svg>;
const IconAward = () => <svg {...svgProps}><circle cx="12" cy="8" r="6" /><path d="M15.48 13.4 17 22l-5-3-5 3 1.52-8.6" /></svg>;
const IconSearch = () => <svg {...svgProps}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const IconBarChart = () => <svg {...svgProps}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>;
const IconSparkles = () => <svg {...svgProps}><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z" /><path d="m19 15 0.7 2.3L22 18l-2.3 0.7L19 21l-0.7-2.3L16 18l2.3-0.7L19 15Z" /><path d="m5 15 0.7 2.3L8 18l-2.3 0.7L5 21l-0.7-2.3L2 18l2.3-0.7L5 15Z" /></svg>;
const IconDownload = () => <svg {...svgProps}><path d="M12 15V3" /><path d="m7 10 5 5 5-5" /><path d="M21 21H3" /></svg>;
const IconMail = () => <svg {...svgProps}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
const IconChevronDown = () => <svg {...svgProps}><path d="m6 9 6 6 6-6" /></svg>;
const IconSun = () => <svg {...svgProps}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>;
const IconMoon = () => <svg {...svgProps}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>;
const IconInbox = () => <svg {...svgProps}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
const IconTemplate = () => <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>;

// ---------------------------------------------------------------------------
// Lightweight toast bus — components anywhere can call showToast() without
// prop-drilling; <ToastStack /> (rendered once in App) listens and renders.
// ---------------------------------------------------------------------------
function showToast(message, type = "success") {
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, type, id: Date.now() + Math.random() } }));
}

function ToastStack() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const t = e.detail;
      setToasts(list => [...list, t]);
      setTimeout(() => setToasts(list => list.filter(x => x.id !== t.id)), 3500);
    }
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  if (!toasts.length) return null;
  return createPortal(
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === "error" ? "⚠" : "✓"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Theme toggle — light/dark, persisted to localStorage, applied to <html>.
// ---------------------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("dashboard-theme") || "light"; } catch { return "light"; }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem("dashboard-theme", theme); } catch {}
  }, [theme]);

  const isDark = theme === "dark";
  return (
    <button className="theme-toggle" onClick={() => setTheme(isDark ? "light" : "dark")} title="Toggle light / dark theme">
      {isDark ? <IconSun /> : <IconMoon />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

// Skeleton placeholders shown during the very first data load.
function LoadingSkeleton() {
  return (
    <>
      <div className="hero-stats" style={{ marginTop: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="skeleton-table">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton skeleton-row" />)}
      </div>
    </>
  );
}

// Friendly empty state when there are no audits yet.
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><IconInbox /></div>
      <h3>No audits yet</h3>
      <p>Run an audit from the browser extension, or paste URLs into the Bulk Audit box above to get started.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Threshold -> CSS class helpers (Lighthouse standard breakpoints)
// ---------------------------------------------------------------------------
const grade = {
  fcp: s => (s == null ? "muted" : s <= 1.8 ? "good" : s <= 3.0 ? "warn" : "bad"),
  lcp: s => (s == null ? "muted" : s <= 2.5 ? "good" : s <= 4.0 ? "warn" : "bad"),
  tbt: ms => (ms == null ? "muted" : ms <= 200 ? "good" : ms <= 600 ? "warn" : "bad"),
  cls: v => (v == null ? "muted" : v <= 0.1 ? "good" : v <= 0.25 ? "warn" : "bad"),
  si: s => (s == null ? "muted" : s <= 3.4 ? "good" : s <= 5.8 ? "warn" : "bad"),
  score: v => (v == null ? "muted" : v >= 90 ? "good" : v >= 50 ? "warn" : "bad")
};

const fmt = (v, digits = 1, suffix = "") => (v == null || isNaN(v) ? "—" : v.toFixed(digits) + suffix);
const fmtMs = v => (v == null || isNaN(v) ? "—" : Math.round(v) + " ms");

function avg(nums) {
  const v = nums.filter(n => n != null && !isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function minOf(nums) {
  const v = nums.filter(n => n != null && !isNaN(n));
  return v.length ? Math.min(...v) : null;
}
function maxOf(nums) {
  const v = nums.filter(n => n != null && !isNaN(n));
  return v.length ? Math.max(...v) : null;
}
function donutGradient(pct, color) {
  return pct == null ? "#e7eaf0" : `conic-gradient(${color} ${pct * 3.6}deg, #e7eaf0 0deg)`;
}

// Every metric key MetricCell shows a hover-diagnosis tooltip for, in the
// order they should appear in the PDF appendix.
const METRIC_DEFS = [
  { key: "fcp", label: "First Contentful Paint" },
  { key: "lcp", label: "Largest Contentful Paint" },
  { key: "tbt", label: "Total Blocking Time" },
  { key: "cls", label: "Cumulative Layout Shift" },
  { key: "si", label: "Speed Index" },
  { key: "accessibility", label: "Accessibility" },
  { key: "bestPractices", label: "Best Practices" },
  { key: "seo", label: "SEO" }
];

// ---------------------------------------------------------------------------
// Export bar — reused by the Report, History, and Compare tabs. `onExcel`
// builds the sheet(s) from the tab's current data; `onPdf` rasterizes
// `targetRef`'s DOM so the PDF matches the on-screen UI exactly.
// ---------------------------------------------------------------------------
// Multi-select checklist for scoping the Report tab (and its export) down to
// specific pages — with 30+ audited URLs, exporting everything (especially
// with the diagnosis appendix) produces an unwieldy PDF. `selected` is a Set
// of URLs, or null meaning "all" (the default, so behavior is unchanged
// until someone actually narrows it down).
function PageFilter({ rows, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  const pages = useMemo(() => {
    const map = new Map();
    rows.forEach(r => { if (!map.has(r.url)) map.set(r.url, r.page); });
    return [...map.entries()].map(([url, page]) => ({ url, page }));
  }, [rows]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const allSelected = selected == null;
  const count = allSelected ? pages.length : selected.size;

  function toggle(url) {
    const next = new Set(allSelected ? pages.map(p => p.url) : selected);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    onChange(next.size === pages.length ? null : next);
  }

  return (
    <div className="page-filter" ref={popoverRef}>
      <button className="export-btn" onClick={() => setOpen(o => !o)}>
        <IconLayers />
        <span>{allSelected ? "All Pages" : `${count} of ${pages.length} Pages`}</span>
        <IconChevronDown />
      </button>
      {open && (
        <div className="page-filter-popover">
          <div className="page-filter-actions">
            <button onClick={() => onChange(null)}>Select all</button>
            <button onClick={() => onChange(new Set())}>Clear</button>
          </div>
          <div className="page-filter-list">
            {pages.map(p => (
              <label className="page-filter-item" key={p.url}>
                <input
                  type="checkbox"
                  checked={allSelected || selected.has(p.url)}
                  onChange={() => toggle(p.url)}
                />
                <span title={p.url}>{p.page}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Generic dropdown used for the Export/Email menus — click the trigger to
// open a popover of actions, click outside (or click an item) to close it.
function DropdownMenu({ label, icon, disabled, busy, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="page-filter" ref={ref}>
      <button className="export-btn" onClick={() => setOpen(o => !o)} disabled={disabled}>
        {icon}
        <span>{busy || label}</span>
        <IconChevronDown />
      </button>
      {open && (
        <div className="page-filter-popover dropdown-menu-popover" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function ExportBar({ targetRef, onExcel, pdfFilename, disabled, diagnosticsRows, diagnosticsFilename, templateRows, children }) {
  const [exporting, setExporting] = useState(false);
  const [exportingDiagnostics, setExportingDiagnostics] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showDiagnosticsEmail, setShowDiagnosticsEmail] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const templateFileRef = useRef(null);

  function handleDefaultTemplate() {
    if (!templateRows || !templateRows.length) return;
    downloadExcel("performance-report.xlsx", [
      { name: "Report", rows: reportRowsToSheetRows(templateRows) }
    ]);
    showToast("Default report downloaded");
  }

  async function handleTemplateFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !templateRows || !templateRows.length) return;
    setTemplateBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const filled = fillTemplateWorkbook(workbook, templateRows);
      if (!filled) {
        showToast("Couldn't find a recognizable header row — need columns like \"URL\" and \"Performance\"", "error");
        return;
      }
      XLSX.writeFile(filled, file.name.replace(/\.xlsx?$/i, "") + "-filled.xlsx");
      showToast("Filled template downloaded");
    } catch {
      showToast("Failed to read that file — use a valid .xlsx/.xls", "error");
    } finally {
      setTemplateBusy(false);
    }
  }

  function handleExcel() {
    onExcel();
    showToast("Excel file downloaded");
  }

  async function handlePdf() {
    if (!targetRef.current || exporting) return;
    setExporting(true);
    try {
      await downloadPdf(targetRef.current, pdfFilename);
      showToast("PDF downloaded");
    } catch {
      showToast("Couldn't generate the PDF", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleDiagnosticsPdf() {
    if (exportingDiagnostics || !diagnosticsRows || !diagnosticsRows.length) return;
    setExportingDiagnostics(true);
    try {
      const diagnosticsList = await Promise.all(diagnosticsRows.map(r => loadAuditDiagnostics(r.auditId)));
      const sections = diagnosticsRows.map((r, i) => ({
        title: `${r.page} — ${r.url}`,
        groups: METRIC_DEFS
          .map(def => ({ label: def.label, entries: diagnosticsList[i]?.[def.key] ?? [] }))
          .filter(g => g.entries.length)
      }));
      downloadDiagnosticsPdf(diagnosticsFilename, sections);
      showToast("Diagnostics PDF downloaded");
    } catch {
      showToast("Couldn't generate the diagnostics PDF", "error");
    } finally {
      setExportingDiagnostics(false);
    }
  }

  async function handleSendEmail(email) {
    if (!targetRef.current) return;
    const dataUrl = await generatePdfData(targetRef.current);
    const base64 = dataUrl.split(",")[1];
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `Performance Report — ${document.title || pdfFilename}`,
        body: `Please find the attached performance report (${pdfFilename}).`,
        attachment: { data: base64, filename: pdfFilename },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to send email");
    }
    return data;
  }

  async function handleSendDiagnosticsEmail(email) {
    if (!diagnosticsRows || !diagnosticsRows.length) return;
    const diagnosticsList = await Promise.all(diagnosticsRows.map(r => loadAuditDiagnostics(r.auditId)));
    const sections = diagnosticsRows.map((r, i) => ({
      title: `${r.page} — ${r.url}`,
      groups: METRIC_DEFS
        .map(def => ({ label: def.label, entries: diagnosticsList[i]?.[def.key] ?? [] }))
        .filter(g => g.entries.length)
    }));
    const dataUrl = generateDiagnosticsPdfData(sections);
    const base64 = dataUrl.split(",")[1];
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `Detailed Diagnostics — ${document.title || diagnosticsFilename}`,
        body: `Please find the attached detailed diagnostics report (${diagnosticsFilename}).`,
        attachment: { data: base64, filename: diagnosticsFilename },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to send email");
    }
    return data;
  }

  return (
    <div className="export-bar">
      {children}

      <DropdownMenu
        label="Export"
        icon={<IconDownload />}
        disabled={disabled}
        busy={exporting ? "Generating PDF…" : exportingDiagnostics ? "Gathering findings…" : null}
      >
        <button className="dropdown-item" onClick={handleExcel}>Export Excel</button>
        <button className="dropdown-item" onClick={handlePdf}>Export Dashboard PDF</button>
        {diagnosticsRows && (
          <button className="dropdown-item" onClick={handleDiagnosticsPdf}>Export Diagnostics PDF</button>
        )}
      </DropdownMenu>

      <DropdownMenu label="Email" icon={<IconMail />} disabled={disabled}>
        <button className="dropdown-item" onClick={() => setShowEmail(true)}>Email Dashboard</button>
        {diagnosticsRows && (
          <button className="dropdown-item" onClick={() => setShowDiagnosticsEmail(true)}>Email Diagnostics</button>
        )}
      </DropdownMenu>

      {templateRows && (
        <DropdownMenu
          label="Template"
          icon={<IconTemplate />}
          disabled={disabled}
          busy={templateBusy ? "Filling template…" : null}
        >
          <button className="dropdown-item" onClick={() => templateFileRef.current?.click()}>
            <span>Custom template</span>
            <span className="dropdown-item-sub">Upload your own — .xlsx or .xls</span>
          </button>
          <button className="dropdown-item" onClick={handleDefaultTemplate}>
            <span>Default template</span>
            <span className="dropdown-item-sub">Download our format — .xlsx</span>
          </button>
        </DropdownMenu>
      )}
      <input
        ref={templateFileRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleTemplateFile}
        style={{ display: "none" }}
      />

      <EmailModal visible={showEmail} title="Send Dashboard Report via Email" onSend={handleSendEmail} onClose={() => setShowEmail(false)} />
      <EmailModal visible={showDiagnosticsEmail} title="Send Diagnostics Report via Email" onSend={handleSendDiagnosticsEmail} onClose={() => setShowDiagnosticsEmail(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Modal — overlaid when the user clicks "Send Email"
// ---------------------------------------------------------------------------
function EmailModal({ visible, title = "Send Report via Email", onSend, onClose }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [error, setError] = useState("");

  if (!visible) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      const data = await onSend(email.trim());
      setDevMode(!!data.dev);
      setDone(true);
      setTimeout(() => { setDone(false); setDevMode(false); onClose(); }, 4000);
    } catch (err) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="modal-done">
            {devMode ? (
              <>
                <div className="modal-done-icon">📧</div>
                <div>Email saved locally</div>
                <p className="modal-done-sub">SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env for live sending. The email data was saved to <code>public/emails/</code>.</p>
              </>
            ) : (
              <>
                <div className="modal-done-icon">✓</div>
                <div>Email sent successfully!</div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>{title}</h3>
            <p className="modal-hint">The PDF report will be attached to the email.</p>
            <input
              className="modal-input"
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={sending}
              autoFocus
              required
            />
            {error ? <p className="modal-error">{error}</p> : null}
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={onClose} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="modal-btn modal-btn-send" disabled={sending || !email.trim()}>
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Hover tooltip for stats — reveals the specific pages behind a number on
// hover (portaled to <body> so it isn't clipped by panel overflow, and
// flips above the anchor when there isn't room below).
// ---------------------------------------------------------------------------
function StatTooltip({ anchorRect, title, items, emptyText, onMouseEnter, onMouseLeave }) {
  const elRef = useRef(null);
  const [style, setStyle] = useState(null);

  // Two-pass positioning: the box's real height depends on its content (a
  // handful of rows vs. many), so we measure it before deciding whether it
  // flips above or below the anchor. Otherwise flipping-above placement
  // assumed the box would fill all available space and left a large empty
  // gap between a short box and the anchor.
  useLayoutEffect(() => {
    if (!anchorRect || !elRef.current) { setStyle(null); return; }
    const width = 288;
    const margin = 12;
    const gap = 8;
    const maxHeight = 300;
    const contentHeight = Math.min(elRef.current.scrollHeight, maxHeight);

    const spaceBelow = window.innerHeight - anchorRect.bottom - gap - margin;
    const spaceAbove = anchorRect.top - gap - margin;
    let top, cap;
    if (spaceBelow >= contentHeight || spaceBelow >= spaceAbove) {
      cap = Math.max(70, Math.min(maxHeight, spaceBelow));
      top = anchorRect.bottom + gap;
    } else {
      cap = Math.max(70, Math.min(maxHeight, spaceAbove));
      top = anchorRect.top - gap - Math.min(contentHeight, cap);
    }
    const left = Math.min(Math.max(anchorRect.left, margin), window.innerWidth - width - margin);
    setStyle({ top, left, width, maxHeight: cap });
  }, [anchorRect, title, items, emptyText]);

  if (!anchorRect) return null;

  return createPortal(
    <div
      ref={elRef}
      className="stat-tooltip"
      style={style || { top: -9999, left: -9999, width: 288, maxHeight: 300 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="stat-tooltip-title">{title}</div>
      {items && items.length ? (
        <div className="stat-tooltip-list">
          {items.map((it, i) => (
            <div className="stat-tooltip-item" key={i}>
              <span className="stat-tooltip-label" title={it.label}>{it.label}</span>
              <span className={`stat-tooltip-value ${it.tone || ""}`}>{it.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="stat-tooltip-empty">{emptyText || "No pages"}</div>
      )}
    </div>,
    document.body
  );
}

// Shared hover-tooltip open/close logic with a short grace period on close,
// so moving the mouse from a (possibly thin) hover target across the gap
// into the portaled tooltip doesn't close it before the cursor arrives.
function useTooltipHover() {
  const [rect, setRect] = useState(null);
  const closeTimer = useRef(null);

  function show(el) {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (el) setRect(el.getBoundingClientRect());
  }
  function scheduleHide() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setRect(null); closeTimer.current = null; }, 150);
  }
  function cancelHide() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return { rect, show, scheduleHide, cancelHide };
}

// Wraps any element so hovering it shows a StatTooltip anchored to it.
function HoverStat({ title, items, emptyText, className, children, ...rest }) {
  const ref = useRef(null);
  const { rect, show, scheduleHide, cancelHide } = useTooltipHover();
  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={() => show(ref.current)}
      onMouseLeave={scheduleHide}
      {...rest}
    >
      {children}
      {rect && (
        <StatTooltip
          anchorRect={rect}
          title={title}
          items={items}
          emptyText={emptyText}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational components
// ---------------------------------------------------------------------------
function TopBar() {
  return (
    <header className="app-header">
      <img className="app-logo" src="/Assets/IGS_Main_Logo.BJcAJana_1NGxFy.webp" alt="IGS Engineering Quality" />
      <ThemeToggle />
    </header>
  );
}

function HeroStats({ rows }) {
  const withLoad = rows
    .filter(r => r.pageLoad != null && !isNaN(r.pageLoad))
    .sort((a, b) => a.pageLoad - b.pageLoad);
  const bestRow = withLoad[0] || null;
  const worstRow = withLoad[withLoad.length - 1] || null;
  const avgPageLoad = avg(rows.map(r => r.pageLoad));

  const fastCount = withLoad.filter(r => r.pageLoad < 1).length;
  const modCount = withLoad.filter(r => r.pageLoad >= 1 && r.pageLoad <= 2).length;
  const slowCount = withLoad.filter(r => r.pageLoad > 2).length;

  const loadItem = r => ({
    label: r.page,
    value: fmt(r.pageLoad, 2, " s"),
    tone: r.pageLoad < 1 ? "good" : r.pageLoad <= 2 ? "warn" : "bad",
  });

  const cards = [
    {
      icon: <IconDocument />, bg: "icon-bg-blue",
      val: rows.length, lbl: "Pages Tested",
      title: "All tested pages (fastest first)",
      items: withLoad.map(loadItem),
    },
    {
      icon: <IconStopwatch />, bg: "icon-bg-green",
      val: fmt(bestRow?.pageLoad, 2, " s"), lbl: "Best Page Load",
      sub: bestRow?.page,
      title: "Fastest pages",
      items: withLoad.slice(0, 5).map(loadItem),
    },
    {
      icon: <IconStopwatch />, bg: "icon-bg-red",
      val: fmt(worstRow?.pageLoad, 2, " s"), lbl: "Worst Page Load",
      sub: worstRow?.page,
      title: "Slowest pages",
      items: withLoad.slice(-5).reverse().map(loadItem),
    },
    {
      icon: <IconBarChart />, bg: "icon-bg-blue",
      val: fmt(avgPageLoad, 2, " s"), lbl: "Avg Page Load",
      title: "Page-load spread",
      items: [
        { label: "Fast (< 1s)", value: `${fastCount}`, tone: "good" },
        { label: "Moderate (1–2s)", value: `${modCount}`, tone: "warn" },
        { label: "Slow (> 2s)", value: `${slowCount}`, tone: "bad" },
      ],
    },
  ];

  return (
    <div className="hero-stats">
      {cards.map((c, i) => (
        <HoverStat key={i} className="stat-card stat-card-hover" title={c.title} items={c.items} emptyText="No page-load data yet">
          <div className={`icon ${c.bg}`}>{c.icon}</div>
          <div>
            <div className="val">{c.val}</div>
            <div className="lbl">{c.lbl}</div>
            {c.sub && <div className="stat-sub" title={c.sub}>{c.sub}</div>}
          </div>
        </HoverStat>
      ))}
    </div>
  );
}

function Hero({ rows, lastUpdated }) {
  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-icon"><IconGauge /></div>
        <div>
          <h1>IGS BEACON
            <span className="live-badge"><span className="dot" />LIVE</span>
          </h1>
          <div className="hero-sub">
            <span><IconGlobe /></span><span>Environment: Browsing History Audit</span>
            <span><IconClock /></span><span>Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </div>
      <HeroStats rows={rows} />
    </section>
  );
}

function InFlightPanel({ items }) {
  if (!items.length) return null;
  return (
    <div className="panel in-flight-panel">
      <div className="panel-title">Currently Auditing ({items.length})</div>
      <div className="panel-body">
        <div className="bulk-audit-list">
          {items.map(it => (
            <div className="bulk-audit-item" key={it.websiteId}>
              <span className="bulk-audit-status muted">running</span>
              <span className="bulk-audit-url" title={it.url}>{it.url}</span>
              <span className="bulk-audit-msg">{Math.max(0, Math.round((Date.now() - it.startedAt) / 1000))}s elapsed</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BulkAuditPanel() {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef(null);

  function parseUrls(raw) {
    return [...new Set(raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
  }

  function extractUrlsFromSheet(data) {
    const lines = [];
    if (Array.isArray(data)) {
      for (const row of data) {
        if (!row) continue;
        const vals = Object.values(row).filter(v => typeof v === "string" || typeof v === "number");
        for (const v of vals) {
          const s = String(v).trim();
          if (s && /^https?:\/\//i.test(s)) lines.push(s);
        }
      }
    }
    return lines;
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      const buf = await file.arrayBuffer();

      if (ext === "xlsx" || ext === "xls") {
        const wb = XLSX.read(buf, { type: "array" });
        const allLines = [];
        for (const name of wb.SheetNames) {
          const sheet = wb.Sheets[name];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          for (const row of data) {
            if (!Array.isArray(row)) continue;
            for (const cell of row) {
              const s = String(cell ?? "").trim();
              if (s && /^https?:\/\//i.test(s)) allLines.push(s);
            }
          }
          if (allLines.length === 0) {
            const raw = XLSX.utils.sheet_to_json(sheet);
            allLines.push(...extractUrlsFromSheet(raw));
          }
        }
        const merged = text ? text + "\n" + allLines.join("\n") : allLines.join("\n");
        setText(merged);
      } else {
        const raw = new TextDecoder().decode(buf);
        const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const merged = text ? text + "\n" + lines.join("\n") : lines.join("\n");
        setText(merged);
      }
    } catch (err) {
      setStartError("Failed to read file: " + err.message);
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  useEffect(() => {
    let cancelled = false;
    function poll() {
      loadCurrentBatch().then(data => { if (!cancelled) setBatch(data); }).catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const items = batch?.items ?? [];
  const running = items.some(it => it.status === "queued" || it.status === "running");

  async function runBulk() {
    const urls = parseUrls(text);
    if (!urls.length) return;
    setStarting(true);
    setStartError(null);
    try {
      const newBatch = await startBulkAudit(urls);
      setBatch(newBatch);
      setText("");
      setFileName("");
    } catch (e) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  }

  const statusClass = { done: "good", error: "bad", skipped: "warn", running: "muted", queued: "muted" };
  const doneCount = items.filter(i => i.status === "done" || i.status === "skipped" || i.status === "error").length;

  return (
    <div className="panel bulk-audit-panel">
      <div className="panel-title">Bulk Audit</div>
      <div className="panel-body">
        <div className="bulk-upload-row">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFileUpload} className="bulk-file-input" id="bulk-file-input" />
          <label htmlFor="bulk-file-input" className="bulk-file-label">Choose File</label>
          <span className="bulk-file-name">{fileName || "Upload .xlsx, .csv, or .txt"}</span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"Paste URLs, one per line"}
          disabled={running || starting}
        />
        <div className="bulk-audit-actions">
          <button className="bulk-run-btn" onClick={runBulk} disabled={running || starting || !text.trim()}>
            {running ? `Auditing ${doneCount}/${items.length}...` : starting ? "Starting..." : "Run Bulk Audit"}
          </button>
          {!running && items.length > 0 && (
            <span className="bulk-audit-summary">
              {items.filter(i => i.status === "done").length} audited, {items.filter(i => i.status === "skipped").length} skipped, {items.filter(i => i.status === "error").length} failed
            </span>
          )}
        </div>
        {startError && <div className="bulk-audit-error">{startError}</div>}
        {items.length > 0 && (
          <div className="bulk-audit-list">
            {items.map((it, i) => (
              <div className="bulk-audit-item" key={i}>
                <span className={`bulk-audit-status ${statusClass[it.status]}`}>{it.status}</span>
                <span className="bulk-audit-url" title={it.url}>{it.url}</span>
                {it.message && <span className="bulk-audit-msg" title={it.message}>{it.message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricTooltip({ anchorRect, loading, hasData, entries }) {
  if (!anchorRect) return null;
  const width = 320;
  const maxHeight = 360;
  const gap = 8;
  const margin = 12;

  const spaceBelow = window.innerHeight - anchorRect.bottom - gap - margin;
  const spaceAbove = anchorRect.top - gap - margin;

  // Flip above the cell when there isn't room below, and clamp the height to
  // whichever side actually has room so the box (and its own scrollbar) never
  // runs off the bottom or top of the viewport.
  let top, height;
  if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
    height = Math.max(120, Math.min(maxHeight, spaceBelow));
    top = anchorRect.bottom + gap;
  } else {
    height = Math.max(120, Math.min(maxHeight, spaceAbove));
    top = anchorRect.top - gap - height;
  }

  const style = {
    top,
    left: Math.min(Math.max(anchorRect.left, margin), window.innerWidth - width - margin),
    maxHeight: height
  };
  return createPortal(
    <div className="metric-tooltip" style={style}>
      {loading ? (
        <div className="metric-tooltip-loading">Loading diagnosis…</div>
      ) : !hasData ? (
        <div className="metric-tooltip-loading">No diagnostic data for this audit — it ran before this feature was added.</div>
      ) : entries.length === 0 ? (
        <div className="metric-tooltip-loading metric-tooltip-ok">No issues found — this metric passed cleanly.</div>
      ) : (
        entries.map(e => (
          <div className="metric-tooltip-item" key={e.id}>
            <div className="metric-tooltip-title">
              {e.title}
              {e.displayValue ? <span className="metric-tooltip-value"> — {e.displayValue}</span> : null}
            </div>
            <div className="metric-tooltip-desc">{e.description}</div>
            {e.learnMoreUrl && (
              <a className="metric-tooltip-fix" href={e.learnMoreUrl} target="_blank" rel="noopener noreferrer">
                How to fix this →
              </a>
            )}
          </div>
        ))
      )}
    </div>,
    document.body
  );
}

// Wraps a metric <td> with hover-to-diagnose: on hover, lazily fetches the
// real Lighthouse findings behind that specific audit's score for this
// metric and shows them in a tooltip portaled to <body> (so it isn't clipped
// by the table's horizontal scroll container).
function MetricCell({ auditId, metricKey, className, children }) {
  const cellRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleEnter() {
    setHovered(true);
    if (cellRef.current) setRect(cellRef.current.getBoundingClientRect());
    if (diagnostics == null && !loading && auditId != null) {
      setLoading(true);
      loadAuditDiagnostics(auditId)
        .then(setDiagnostics)
        .finally(() => setLoading(false));
    }
  }

  const hasData = diagnostics != null;
  const entries = diagnostics?.[metricKey] ?? [];

  return (
    <td ref={cellRef} className={`${className} metric-cell`} onMouseEnter={handleEnter} onMouseLeave={() => setHovered(false)}>
      {children}
      {hovered && auditId != null && (
        <MetricTooltip anchorRect={rect} loading={loading} hasData={hasData} entries={entries} />
      )}
    </td>
  );
}

// Column definitions for the sortable header — key maps to a row field.
const REPORT_COLUMNS = [
  { key: "page", icon: <IconDocument />, label: "Page", className: "col-page", type: "text" },
  { key: "url", icon: <IconLink />, label: "URL", className: "col-url", type: "text" },
  { key: "fcp", icon: <IconStopwatch />, label: "First Contentful Paint (s)", type: "num" },
  { key: "lcp", icon: <IconImage />, label: "Largest Contentful Paint (s)", type: "num" },
  { key: "tbt", icon: <IconHand />, label: "Total Blocking Time (ms)", type: "num" },
  { key: "clsVal", icon: <IconLayers />, label: "Cumulative Layout Shift", type: "num" },
  { key: "si", icon: <IconActivity />, label: "Speed Index (s)", type: "num" },
  { key: "accessibility", icon: <IconWheelchair />, label: "Accessibility", type: "num" },
  { key: "bestPractices", icon: <IconAward />, label: "Best Practices", type: "num" },
  { key: "seo", icon: <IconSearch />, label: "SEO", type: "num" },
  { key: "pageLoad", icon: <IconStopwatch />, label: "Page Load Time (s)", type: "num" },
];

function ReportTable({ rows, searchable = false }) {
  const tableWrapRef = useRef(null);
  const tableRef = useRef(null);
  const stickyBarRef = useRef(null);
  const syncingRef = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const displayRows = useMemo(() => {
    let out = rows;
    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(r =>
        (r.page || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;   // nulls always last
        if (bv == null) return -1;
        if (typeof av === "string") return av.localeCompare(bv) * dir;
        return (av - bv) * dir;
      });
    }
    return out;
  }, [rows, query, sortKey, sortDir, searchable]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // Measure the table so the floating scrollbar mirror can size its track,
  // and only render it when the table actually overflows horizontally.
  useEffect(() => {
    function measure() {
      if (tableRef.current) setScrollWidth(tableRef.current.scrollWidth);
      if (tableWrapRef.current) setClientWidth(tableWrapRef.current.clientWidth);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (tableRef.current) ro.observe(tableRef.current);
    if (tableWrapRef.current) ro.observe(tableWrapRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [displayRows]);

  // Keep the floating scrollbar and the real table panned together.
  function handleTableScroll() {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (stickyBarRef.current && tableWrapRef.current) {
      syncingRef.current = true;
      stickyBarRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
    }
  }
  function handleStickyScroll() {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (tableWrapRef.current && stickyBarRef.current) {
      syncingRef.current = true;
      tableWrapRef.current.scrollLeft = stickyBarRef.current.scrollLeft;
    }
  }

  const overflowing = scrollWidth > clientWidth + 1;

  return (
    <div className="table-scroll-region">
    {searchable && (
      <div className="table-search-row">
        <div className="table-search">
          <IconSearch />
          <input
            type="text"
            placeholder="Search by page or URL…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <span className="table-search-count">
          {displayRows.length} of {rows.length} {rows.length === 1 ? "page" : "pages"}
        </span>
      </div>
    )}
    <section className="table-wrap" ref={tableWrapRef} onScroll={handleTableScroll}>
      <table ref={tableRef}>
        <thead>
          <tr className="col-row">
            <th style={{ width: 46 }}>#</th>
            {REPORT_COLUMNS.map(col => {
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  className={`${col.className || ""} sortable`}
                  onClick={() => toggleSort(col.key)}
                  title="Click to sort"
                >
                  <div className="th-inner">
                    {col.icon}<span>{col.label}</span>
                    <span className={`sort-ind ${active ? "active" : ""}`}>
                      {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayRows.length === 0 ? (
            <tr><td colSpan="12" style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
              {rows.length === 0 ? "No successful audits available." : "No pages match your search."}
            </td></tr>
          ) : displayRows.map((r, i) => (
            <tr key={r.auditId ?? r.websiteId}>
              <td className="col-idx"><span className="idx-badge">{i + 1}</span></td>
              <td className="col-page">
                <div className="page-row">
                  <IconDocument /><span>{r.page}</span>
                  {r.concurrentAudits > 1 && (
                    <span
                      className="noisy-badge"
                      title={`Ran alongside ${r.concurrentAudits - 1} other audit(s) at the same time — TBT, Speed Index, and performance score may be noisier than a solo run. Re-run this page alone for a trustworthy number.`}
                    >
                      ⚠
                    </span>
                  )}
                </div>
              </td>
              <td className="col-url">
                <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.url}>
                  <IconLink /><span>{r.url}</span>
                </a>
              </td>
              <MetricCell auditId={r.auditId} metricKey="fcp" className={grade.fcp(r.fcp)}>{fmt(r.fcp, 1, " s")}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="lcp" className={grade.lcp(r.lcp)}>{fmt(r.lcp, 1, " s")}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="tbt" className={grade.tbt(r.tbt)}>{fmtMs(r.tbt)}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="cls" className={grade.cls(r.clsVal)}>{r.clsVal == null ? "—" : r.clsVal.toFixed(3)}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="si" className={grade.si(r.si)}>{fmt(r.si, 1, " s")}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="accessibility" className={grade.score(r.accessibility)}>{r.accessibility == null ? "—" : r.accessibility + "%"}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="bestPractices" className={grade.score(r.bestPractices)}>{r.bestPractices == null ? "—" : r.bestPractices + "%"}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="seo" className={grade.score(r.seo)}>{r.seo == null ? "—" : r.seo + "%"}</MetricCell>
              <td className="muted">{r.pageLoad == null ? "—" : fmt(r.pageLoad, 2, " s")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
    {overflowing && (
      <div className="sticky-scrollbar" ref={stickyBarRef} onScroll={handleStickyScroll} aria-hidden="true">
        <div style={{ width: scrollWidth }} />
      </div>
    )}
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: "report", label: "Report" },
    { id: "history", label: "History" },
    { id: "compare", label: "Compare" }
  ];
  return (
    <nav className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${tab === t.id ? "active" : ""}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

const HISTORY_ALL = "__all__";

function HistoryTab({ audits }) {
  const pages = useMemo(() => {
    const map = new Map();
    audits.forEach(a => { if (!map.has(a.url)) map.set(a.url, a.page); });
    return [...map.entries()].map(([url, page]) => ({ url, page }));
  }, [audits]);

  const [selectedUrl, setSelectedUrl] = useState(HISTORY_ALL);
  useEffect(() => {
    if (selectedUrl !== HISTORY_ALL && !pages.some(p => p.url === selectedUrl) && pages.length) {
      setSelectedUrl(HISTORY_ALL);
    }
  }, [pages, selectedUrl]);

  const showAll = selectedUrl === HISTORY_ALL;
  const rows = audits
    .filter(a => showAll || a.url === selectedUrl)
    .sort((a, b) => new Date(b.auditedAt) - new Date(a.auditedAt));

  const historyRef = useRef(null);

  if (pages.length === 0) {
    return <p className="no-data-note">No completed audits yet.</p>;
  }

  const selectedPage = showAll ? "all-pages" : (pages.find(p => p.url === selectedUrl)?.page ?? "history");

  return (
    <div>
      <div className="tab-controls">
        <label className="tab-controls-label">Page:</label>
        <select className="tab-select" value={selectedUrl} onChange={e => setSelectedUrl(e.target.value)}>
          <option value={HISTORY_ALL}>All pages</option>
          {pages.map(p => <option key={p.url} value={p.url}>{p.page}</option>)}
        </select>
        <span className="bulk-audit-summary">{rows.length} audit{rows.length === 1 ? "" : "s"} recorded{showAll ? ` across ${pages.length} page${pages.length === 1 ? "" : "s"}` : ""}</span>
      </div>
      <ExportBar
        targetRef={historyRef}
        disabled={rows.length === 0}
        pdfFilename={`history-${selectedPage.replace(/[^a-z0-9]+/gi, "-")}.pdf`}
        onExcel={() => downloadExcel(`history-${selectedPage.replace(/[^a-z0-9]+/gi, "-")}.xlsx`, [
          { name: "History", rows: reportRowsToSheetRows(rows, { includeDate: true }) }
        ])}
        diagnosticsRows={rows}
        diagnosticsFilename={`history-${selectedPage.replace(/[^a-z0-9]+/gi, "-")}-diagnostics.pdf`}
      />
      <div ref={historyRef}>
        <ReportTable rows={rows} />
      </div>
    </div>
  );
}

const compareMetrics = [
  { key: "performance", label: "Performance Score", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "accessibility", label: "Accessibility", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "bestPractices", label: "Best Practices", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "seo", label: "SEO", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "fcp", label: "First Contentful Paint", better: "lower", fmt: v => fmt(v, 1, " s") },
  { key: "lcp", label: "Largest Contentful Paint", better: "lower", fmt: v => fmt(v, 1, " s") },
  { key: "tbt", label: "Total Blocking Time", better: "lower", fmt: v => fmtMs(v) },
  { key: "clsVal", label: "Cumulative Layout Shift", better: "lower", fmt: v => (v == null ? "—" : v.toFixed(3)) },
  { key: "si", label: "Speed Index", better: "lower", fmt: v => fmt(v, 1, " s") },
  { key: "pageLoad", label: "Page Load Time", better: "lower", fmt: v => fmt(v, 2, " s") }
];

function CompareTab({ audits }) {
  const options = useMemo(
    () => [...audits].sort((a, b) => new Date(b.auditedAt) - new Date(a.auditedAt)),
    [audits]
  );
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (selectedIds.length === 0 && options.length > 0) {
      setSelectedIds(options.slice(0, 2).map(a => String(a.auditId)));
    }
  }, [options, selectedIds.length]);

  if (options.length === 0) {
    return <p className="no-data-note">No completed audits yet.</p>;
  }
  if (options.length < 2) {
    return <p className="no-data-note">Need at least two completed audits to compare.</p>;
  }

  function optionLabel(a) {
    return `${a.page} — ${new Date(a.auditedAt).toLocaleString()}`;
  }

  function updateSelected(index, value) {
    setSelectedIds(prev => prev.map((id, i) => (i === index ? value : id)));
  }

  function addSelector() {
    const used = new Set(selectedIds);
    const next = options.find(a => !used.has(String(a.auditId)));
    setSelectedIds(prev => [...prev, next ? String(next.auditId) : ""]);
  }

  function removeSelector(index) {
    setSelectedIds(prev => prev.filter((_, i) => i !== index));
  }

  const columns = selectedIds
    .map(id => options.find(a => String(a.auditId) === id))
    .filter(Boolean);

  const compareRef = useRef(null);

  return (
    <div>
      <div className="tab-controls compare-controls">
        {selectedIds.map((id, i) => (
          <div className="compare-selector" key={i}>
            <select className="tab-select" value={id} onChange={e => updateSelected(i, e.target.value)}>
              <option value="">Select an audit…</option>
              {options.map(a => <option key={a.auditId} value={a.auditId}>{optionLabel(a)}</option>)}
            </select>
            {selectedIds.length > 2 && (
              <button className="compare-remove-btn" onClick={() => removeSelector(i)} title="Remove">×</button>
            )}
          </div>
        ))}
        {selectedIds.length < options.length && (
          <button className="compare-add-btn" onClick={addSelector}>+ Add audit</button>
        )}
      </div>
      {columns.length >= 2 && (
        <ExportBar
          targetRef={compareRef}
          pdfFilename="performance-comparison.pdf"
          onExcel={() => downloadExcel("performance-comparison.xlsx", [
            { name: "Comparison", rows: compareColumnsToSheetRows(compareMetrics, columns) }
          ])}
        />
      )}
      {columns.length < 2 ? (
        <p className="no-data-note">Select at least two audits to compare.</p>
      ) : (
        <div className="panel compare-panel" ref={compareRef}>
          <div className="panel-body">
            <div className="compare-table-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th></th>
                    {columns.map(col => (
                      <th key={col.auditId}>{col.page}<span className="compare-date">{new Date(col.auditedAt).toLocaleString()}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareMetrics.map(m => {
                    const values = columns.map(col => col[m.key]);
                    const nonNull = values.filter(v => v != null);
                    const best = nonNull.length > 1
                      ? (m.better === "higher" ? Math.max(...nonNull) : Math.min(...nonNull))
                      : null;
                    const tied = new Set(values).size <= 1;
                    return (
                      <tr key={m.key}>
                        <td className="compare-label">{m.label}</td>
                        {values.map((v, i) => (
                          <td key={i} className={best != null && v === best && !tied ? "compare-win" : undefined}>
                            {m.fmt(v)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewPanel({ rows }) {
  const bestFcp = minOf(rows.map(r => r.fcp));
  const avgFcp = avg(rows.map(r => r.fcp));
  const worstLcp = maxOf(rows.map(r => r.lcp));
  const highTbt = maxOf(rows.map(r => r.tbt));
  const highSi = maxOf(rows.map(r => r.si));
  const highPageLoad = maxOf(rows.map(r => r.pageLoad));

  const items = [
    { icon: <IconStopwatch />, bg: "icon-bg-green", val: fmt(bestFcp, 1, " s"), lbl: "Best FCP (Fastest)" },
    { icon: <IconStopwatch />, bg: "icon-bg-orange", val: fmt(avgFcp, 1, " s"), lbl: "Avg FCP" },
    { icon: <IconImage />, bg: "icon-bg-red", val: fmt(worstLcp, 1, " s"), lbl: "Worst LCP (Slowest)" },
    { icon: <IconHand />, bg: "icon-bg-red", val: fmtMs(highTbt), lbl: "Highest TBT" },
    { icon: <IconGauge />, bg: "icon-bg-navy", val: fmt(highSi, 1, " s"), lbl: "Highest Speed Index" },
    { icon: <IconStopwatch />, bg: "icon-bg-red", val: fmt(highPageLoad, 2, " s"), lbl: "Highest Page Load" }
  ];

  return (
    <div className="panel">
      <div className="panel-title">Performance Overview</div>
      <div className="panel-body">
        <div className="mini-stats">
          {items.map((it, i) => (
            <div className="mini-stat" key={i}>
              <div className={`icon ${it.bg}`}>{it.icon}</div>
              <div className="val">{it.val}</div>
              <div className="lbl">{it.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreDistributionPanel({ rows }) {
  const donuts = [
    { key: "accessibility", pct: avg(rows.map(r => r.accessibility)), color: "var(--acc-orange)", lbl: "Accessibility" },
    { key: "bestPractices", pct: avg(rows.map(r => r.bestPractices)), color: "var(--acc-green)", lbl: "Best Practices" },
    { key: "seo", pct: avg(rows.map(r => r.seo)), color: "var(--acc-blue)", lbl: "SEO" },
    { key: "performance", pct: avg(rows.map(r => r.performance)), color: "var(--acc-purple)", lbl: "Performance" }
  ];

  // Pages below the "good" threshold (90) for a metric — the ones worth a look.
  function needsAttention(key) {
    return rows
      .filter(r => r[key] != null && r[key] < 90)
      .sort((a, b) => a[key] - b[key])
      .map(r => ({
        label: r.page,
        value: `${r[key]}%`,
        tone: r[key] >= 50 ? "warn" : "bad",
      }));
  }

  return (
    <div className="panel">
      <div className="panel-title">Score Distribution</div>
      <div className="panel-body">
        <div className="donut-row">
          {donuts.map((d, i) => (
            <HoverStat
              className="donut-item donut-item-hover"
              key={i}
              title={`${d.lbl} — pages needing attention`}
              items={needsAttention(d.key)}
              emptyText={`All pages score 90+ on ${d.lbl} 🎉`}
            >
              <div className="donut" style={{ background: donutGradient(d.pct, d.color) }}>
                <span>{d.pct == null ? "—" : Math.round(d.pct) + "%"}</span>
              </div>
              <div className="lbl">{d.lbl}</div>
            </HoverStat>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatingPanel({ rows }) {
  const rated = rows.filter(r => r.pageLoad != null && !isNaN(r.pageLoad));
  const total = rated.length;
  const fastRows = rated.filter(r => r.pageLoad < 1).sort((a, b) => a.pageLoad - b.pageLoad);
  const moderateRows = rated.filter(r => r.pageLoad >= 1 && r.pageLoad <= 2).sort((a, b) => a.pageLoad - b.pageLoad);
  const slowRows = rated.filter(r => r.pageLoad > 2).sort((a, b) => b.pageLoad - a.pageLoad);

  const pct = n => (total ? Math.round((n / total) * 100) : 0);
  const fastPct = pct(fastRows.length);
  const moderatePct = pct(moderateRows.length);

  const toItems = (bucket, tone) => bucket.map(r => ({ label: r.page, value: fmt(r.pageLoad, 2, " s"), tone }));

  // Hover state for individual donut arcs.
  const { rect, show, scheduleHide, cancelHide } = useTooltipHover();
  const [activeArc, setActiveArc] = useState(null); // { title, items, emptyText }
  const enterArc = (e, seg) => {
    setActiveArc({ title: seg.title, items: toItems(seg.rows, seg.tone), emptyText: seg.empty });
    show(e.currentTarget);
  };

  const segments = [
    { key: "fast", rows: fastRows, tone: "good", color: "var(--good)", title: "Fast pages (< 1s)", empty: "No fast pages" },
    { key: "moderate", rows: moderateRows, tone: "warn", color: "var(--warn)", title: "Moderate pages (1–2s)", empty: "No moderate pages" },
    { key: "slow", rows: slowRows, tone: "bad", color: "var(--bad)", title: "Slow pages (> 2s)", empty: "No slow pages" },
  ];

  // Build SVG donut arcs. r chosen so the circumference is easy to slice.
  const R = 16, C = 2 * Math.PI * R;
  let cursor = 0;
  const arcs = segments.map(seg => {
    const frac = total ? seg.rows.length / total : 0;
    const len = frac * C;
    const arc = { ...seg, len, dasharray: `${len} ${C - len}`, dashoffset: -cursor * C };
    cursor += frac;
    return arc;
  });

  return (
    <div className="panel">
      <div className="panel-title">Performance Rating (Page Load Time)</div>
      <div className="rating-body">
        <div className="rating-donut-wrap">
          <svg viewBox="0 0 40 40" className="rating-svg">
            <g transform="rotate(-90 20 20)">
              {total === 0 && (
                <circle cx="20" cy="20" r={R} fill="none" strokeWidth="6" className="rating-arc-empty" />
              )}
              {arcs.filter(a => a.len > 0).map(a => (
                <circle
                  key={a.key}
                  cx="20" cy="20" r={R} fill="none"
                  stroke={a.color} strokeWidth="6"
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                  className="rating-arc"
                  onMouseEnter={e => enterArc(e, a)}
                  onMouseLeave={scheduleHide}
                />
              ))}
            </g>
          </svg>
          <div className="rating-donut-center">
            {total ? (
              <>
                <div className="pct">{fastPct}%</div>
                <div className="sub">Fast</div>
              </>
            ) : (
              <>
                <div className="pct no-data">No data</div>
                <div className="sub">yet</div>
              </>
            )}
          </div>
          {rect && activeArc && (
            <StatTooltip
              anchorRect={rect}
              title={activeArc.title}
              items={activeArc.items}
              emptyText={activeArc.emptyText}
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
            />
          )}
        </div>
        <div className="rating-legend">
          <div className="row">
            <span className="dot" style={{ background: "var(--good)" }} /><span className="txt">Fast (&lt; 1s)</span><span className="count">{total ? `${fastRows.length} pages (${fastPct}%)` : "—"}</span>
          </div>
          <div className="row">
            <span className="dot" style={{ background: "var(--warn)" }} /><span className="txt">Moderate (1s - 2s)</span><span className="count">{total ? `${moderateRows.length} pages (${moderatePct}%)` : "—"}</span>
          </div>
          <div className="row">
            <span className="dot" style={{ background: "var(--bad)" }} /><span className="txt">Slow (&gt; 2s)</span><span className="count">{total ? `${slowRows.length} pages (${pct(slowRows.length)}%)` : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Adapts our flat row shape (fcp in seconds, etc.) to the shape the AI
// assistant's fallback data-answer logic expects (audit/metric sub-objects,
// timings in ms) — see src/app/api/ai-assistant/route.ts.
function toAiRow(r) {
  return {
    url: r.url,
    audit: {
      performanceScore: r.performance,
      accessibilityScore: r.accessibility,
      bestPracticesScore: r.bestPractices,
      seoScore: r.seo
    },
    metric: {
      fcp: r.fcp != null ? r.fcp * 1000 : null,
      lcp: r.lcp != null ? r.lcp * 1000 : null,
      tbt: r.tbt,
      cls: r.clsVal,
      speedIndex: r.si != null ? r.si * 1000 : null,
      tti: r.pageLoad != null ? r.pageLoad * 1000 : null
    },
    categories: []
  };
}

function AIAssistantPanel({ rows }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ask me anything about the current audit data and I will answer using only the records shown here." }
  ]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages(current => [...current, { role: "user", content: trimmed }]);
    setLoading(true);
    setQuestion("");

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, rows: rows.map(toAiRow) })
      });
      const data = await response.json();
      setMessages(current => [...current, { role: "assistant", content: data.answer || "I could not generate an answer from the available data." }]);
    } catch {
      setMessages(current => [...current, { role: "assistant", content: "I could not reach the assistant service right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-assistant-float">
      <button className="ai-assistant-toggle" onClick={() => setOpen(v => !v)} type="button">
        <IconSparkles />
        <span>AI Assistant</span>
      </button>

      {open && (
        <div className="ai-assistant-panel">
          <div className="ai-assistant-header">
            <div>
              <h3>Data-based assistant</h3>
              <p>Answers from the current dashboard records only.</p>
            </div>
            <button type="button" className="ai-assistant-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="ai-assistant-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`ai-assistant-bubble ${message.role}`}>
                {message.content}
              </div>
            ))}
            {loading && <div className="ai-assistant-bubble assistant">Thinking…</div>}
          </div>

          <form className="ai-assistant-form" onSubmit={handleSubmit}>
            <input
              value={question}
              onChange={event => setQuestion(event.target.value)}
              placeholder="Ask about the latest scores, best URLs, or comparisons"
            />
            <button type="submit" disabled={loading}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Report — lets a user upload their own Excel template and get it
// filled in with the current audit data, instead of always exporting our
// fixed layout. We match the template's own header row (whatever it calls
// its columns) against a synonym list, so "URL" / "Page URL" / "Link" all
// resolve to the same field. Unrecognized columns are just left blank.
// ---------------------------------------------------------------------------
const TEMPLATE_FIELD_SYNONYMS = {
  page: ["page", "page name", "name"],
  url: ["url", "page url", "link", "website", "address"],
  fcp: ["fcp", "first contentful paint", "first contentful paint (s)"],
  lcp: ["lcp", "largest contentful paint", "largest contentful paint (s)"],
  tbt: ["tbt", "total blocking time", "total blocking time (ms)"],
  clsVal: ["cls", "cumulative layout shift"],
  si: ["speed index", "si", "speed index (s)"],
  performance: ["performance", "performance score", "performance (%)"],
  accessibility: ["accessibility", "accessibility score", "accessibility (%)"],
  bestPractices: ["best practices", "best practices score", "best practices (%)"],
  seo: ["seo", "seo score", "seo (%)"],
  pageLoad: ["page load", "page load (s)", "page load time"],
  auditedAt: ["audited at", "date", "audit date", "last audited"]
};

function matchTemplateField(header) {
  const norm = String(header ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!norm) return null;
  for (const [field, synonyms] of Object.entries(TEMPLATE_FIELD_SYNONYMS)) {
    if (synonyms.includes(norm)) return field;
  }
  return null;
}

function rowFieldValue(row, field) {
  if (field === "auditedAt") return row.auditedAt ? new Date(row.auditedAt).toLocaleString() : "";
  const v = row[field];
  return v == null ? "" : v;
}

// Finds the template's header row (first row with at least two recognizable
// column names), then appends one data row per audited page after whatever
// content already exists — never overwrites anything already in the file.
function fillTemplateWorkbook(workbook, rows) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

  let headerRowIndex = -1;
  let fieldMap = {};
  for (let r = 0; r < grid.length; r++) {
    const map = {};
    grid[r].forEach((cell, c) => {
      const field = matchTemplateField(cell);
      if (field) map[c] = field;
    });
    if (Object.keys(map).length >= 2) {
      headerRowIndex = r;
      fieldMap = map;
      break;
    }
  }
  if (headerRowIndex === -1) return null;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const startRow = Math.max(range.e.r + 1, headerRowIndex + 1);

  const dataRows = rows.map(row => {
    const line = [];
    Object.entries(fieldMap).forEach(([col, field]) => {
      line[Number(col)] = rowFieldValue(row, field);
    });
    return line;
  });

  XLSX.utils.sheet_add_aoa(sheet, dataRows, { origin: { r: startRow, c: 0 } });
  const newRange = XLSX.utils.decode_range(sheet["!ref"]);
  newRange.e.r = Math.max(newRange.e.r, startRow + dataRows.length - 1);
  sheet["!ref"] = XLSX.utils.encode_range(newRange);

  return workbook;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [allAudits, setAllAudits] = useState([]);
  const [inFlight, setInFlight] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("report");
  const reportRef = useRef(null);
  // null = all pages included (default/unfiltered); otherwise a Set of URLs.
  const [selectedPages, setSelectedPages] = useState(null);
  const visibleRows = useMemo(
    () => (selectedPages == null ? rows : rows.filter(r => selectedPages.has(r.url))),
    [rows, selectedPages]
  );

  useEffect(() => {
    let cancelled = false;

    function load() {
      loadDashboardRows()
        .then(data => {
          if (cancelled) return;
          setRows(data);
          setLastUpdated(new Date().toLocaleString());
          setError(null);
        })
        .catch(e => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
      loadInFlightAudits().then(data => { if (!cancelled) setInFlight(data); });
      loadAllAudits().then(data => { if (!cancelled) setAllAudits(data); });
    }

    load();
    const interval = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const showInitialLoading = loading && rows.length === 0 && !error;
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div className="page">
      <TopBar />
      <Hero rows={rows} lastUpdated={lastUpdated} />
      <TabBar tab={tab} setTab={setTab} />
      {tab === "report" && (
        <>
          <InFlightPanel items={inFlight} />
          <BulkAuditPanel />
          {error ? (
            <div style={{ color: "var(--bad)", textAlign: "center", padding: 20 }}>Failed to load data: {error}</div>
          ) : showInitialLoading ? (
            <LoadingSkeleton />
          ) : showEmpty ? (
            <EmptyState />
          ) : (
            <>
              <ExportBar
                targetRef={reportRef}
                disabled={visibleRows.length === 0}
                pdfFilename="performance-report.pdf"
                onExcel={() => downloadExcel("performance-report.xlsx", [
                  { name: "Report", rows: reportRowsToSheetRows(visibleRows) }
                ])}
                diagnosticsRows={visibleRows}
                diagnosticsFilename="website-performance-diagnostics.pdf"
                templateRows={visibleRows}
              >
                <PageFilter rows={rows} selected={selectedPages} onChange={setSelectedPages} />
              </ExportBar>
              <div ref={reportRef}>
                <ReportTable rows={visibleRows} searchable />
                <section className="summary-grid">
                  <OverviewPanel rows={visibleRows} />
                  <ScoreDistributionPanel rows={visibleRows} />
                  <RatingPanel rows={visibleRows} />
                </section>
              </div>
            </>
          )}
        </>
      )}
      {tab === "history" && <HistoryTab audits={allAudits} />}
      {tab === "compare" && <CompareTab audits={allAudits} />}
      <AIAssistantPanel rows={rows} />
      <ToastStack />
    </div>
  );
}
