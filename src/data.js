// ---------------------------------------------------------------------------
// Data layer for the dashboard.
//
// Fetches live data from the Next.js app's /api/websites endpoint (proxied by
// Vite's dev server — see vite.config.js — so this stays same-origin and
// avoids CORS). That endpoint is backed by Prisma/Neon and returns each
// website with its latest audit + metrics. Only rows with a completed audit
// are shown; websites whose audit is still queued or failed are skipped.
// ---------------------------------------------------------------------------

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
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
        websiteId: site.id,
        page: hostnameOf(site.url),
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
        auditedAt: audit.createdAt
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
