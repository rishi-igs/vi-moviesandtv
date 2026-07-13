// ---------------------------------------------------------------------------
// Data layer for the dashboard.
//
// Fetches live data from the Next.js app's /api/websites endpoint (proxied by
// Vite's dev server — see vite.config.js — so this stays same-origin and
// avoids CORS). That endpoint is backed by Prisma/Neon and returns each
// website with its latest audit + metrics. Only rows with a completed audit
// are shown; websites whose audit is still queued or failed are skipped.
// ---------------------------------------------------------------------------

// Just the path (the URL column already shows the full hostname), so
// different pages on the same site (e.g. /originals vs /search) are
// distinguishable without repeating the domain on every row.
function pageLabelOf(url) {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path === "/" ? "Home" : path;
  } catch (e) {
    return url;
  }
}

function detectBrand(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "myvi.in" || hostname.endsWith(".myvi.in")) return "vi";
    if (hostname === "redbull.com" || hostname.endsWith(".redbull.com")) return "redbull";
    return null;
  } catch { return null; }
}

export async function loadDashboardRows(opts) {
  const brand = opts?.brand;
  const res = await fetch("/api/websites", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load live data (HTTP ${res.status})`);
  }
  const websites = await res.json();

  return websites
    .map((site) => {
      const audit = site.audits?.[0];
      const metric = audit?.metrics?.[0];
      if (!audit || !metric) return null;

      return {
        auditId: audit.id,
        websiteId: site.id,
        page: pageLabelOf(site.url),
        url: site.url,
        fcp: metric.fcp != null ? metric.fcp / 1000 : null,
        lcp: metric.lcp != null ? metric.lcp / 1000 : null,
        tbt: metric.tbt ?? null,
        clsVal: metric.cls ?? null,
        si: metric.speedIndex != null ? metric.speedIndex / 1000 : null,
        accessibility: audit.accessibilityScore,
        bestPractices: audit.bestPracticesScore,
        seo: audit.seoScore,
        performance: audit.performanceScore,
        pageLoad: metric.speedIndex != null ? metric.speedIndex / 1000 : null,
        auditedAt: audit.createdAt,
        concurrentAudits: audit.concurrentAudits ?? null,
        brand: detectBrand(site.url),
      };
    })
    .filter(Boolean)
    .filter(r => !brand || brand === "all" || r.brand === brand)
    .sort((a, b) => new Date(b.auditedAt) - new Date(a.auditedAt));
}

// Server-truth "what's auditing right now" — backed by the server's in-memory
// queue, not client state, so it survives a page refresh.
export async function loadInFlightAudits() {
  const res = await fetch("/api/audit-status", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.inFlight ?? [];
}

// The current/most recent bulk-audit batch. The server drives the batch to
// completion itself, so polling this reflects true progress even after a
// refresh or a closed tab.
export async function loadCurrentBatch() {
  const res = await fetch("/api/audit-batch", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.batch ?? null;
}

// Full audit history across every website — powers the History and Compare tabs.
export async function loadAllAudits(opts) {
  const brand = opts?.brand;
  const res = await fetch("/api/audits", { cache: "no-store" });
  if (!res.ok) return [];
  const audits = await res.json();

  return audits
    .map((a) => {
      const metric = a.metrics?.[0];
      if (!metric) return null;

      return {
        auditId: a.id,
        websiteId: a.websiteId,
        page: pageLabelOf(a.website.url),
        url: a.website.url,
        fcp: metric.fcp != null ? metric.fcp / 1000 : null,
        lcp: metric.lcp != null ? metric.lcp / 1000 : null,
        tbt: metric.tbt ?? null,
        clsVal: metric.cls ?? null,
        si: metric.speedIndex != null ? metric.speedIndex / 1000 : null,
        accessibility: a.accessibilityScore,
        bestPractices: a.bestPracticesScore,
        seo: a.seoScore,
        performance: a.performanceScore,
        pageLoad: metric.speedIndex != null ? metric.speedIndex / 1000 : null,
        auditedAt: a.createdAt,
        concurrentAudits: a.concurrentAudits ?? null,
        brand: detectBrand(a.website.url),
      };
    })
    .filter(Boolean)
    .filter(a => !brand || brand === "all" || a.brand === brand);
}

// Real per-audit Lighthouse findings for the hover-diagnosis tooltip, fetched
// lazily (only when a metric cell is actually hovered) and cached per audit
// so repeated hovers don't re-fetch.
const diagnosticsCache = new Map();

export async function loadAuditDiagnostics(auditId) {
  if (diagnosticsCache.has(auditId)) return diagnosticsCache.get(auditId);
  const res = await fetch(`/api/audits/${auditId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const diagnostics = data.diagnostics ?? null;
  diagnosticsCache.set(auditId, diagnostics);
  return diagnostics;
}

export async function startBulkAudit(urls) {
  const res = await fetch("/api/audit-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.batch;
}
