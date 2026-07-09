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

export async function loadDashboardRows() {
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
        // Matches the Next.js app's behavior: there's no distinct "page load
        // time" field anywhere in the pipeline, so Speed Index is reused here
        // for visual consistency between the two dashboards.
        pageLoad: metric.speedIndex != null ? metric.speedIndex / 1000 : null,
        auditedAt: audit.createdAt,
        // 1 = ran alone. 2+ = ran under CPU contention from other concurrent
        // audits — TBT/Speed Index/performance score may be noisier than a
        // solo run. null = predates this tracking.
        concurrentAudits: audit.concurrentAudits ?? null
      };
    })
    .filter(Boolean)
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

// Full audit history across every website (not just the latest per site) —
// powers the History and Compare tabs.
export async function loadAllAudits() {
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
        concurrentAudits: a.concurrentAudits ?? null
      };
    })
    .filter(Boolean);
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
