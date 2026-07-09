import type { DiagnosticEntry, MetricDiagnostics } from '@/app/_types'

// Lighthouse's full report (lhr) contains dozens of individual audits, each
// explaining one specific thing that affects load performance (render-
// blocking resources, unoptimized images, main-thread JS cost, etc.) — real,
// page-specific findings, not generic advice. We only keep the ones relevant
// to each of the 5 metrics we track, and only their title/description/score/
// displayValue (skip the heavy `details.items` — DOM node paths, trace data —
// which can be hundreds of KB per audit and isn't useful in a hover tooltip).
const METRIC_AUDIT_IDS: Record<string, string[]> = {
  fcp: ['first-contentful-paint', 'server-response-time', 'render-blocking-resources', 'font-display'],
  lcp: [
    'largest-contentful-paint',
    'largest-contentful-paint-element',
    'render-blocking-resources',
    'server-response-time',
    'preload-lcp-image',
    'uses-optimized-images',
  ],
  tbt: [
    'total-blocking-time',
    'mainthread-work-breakdown',
    'bootup-time',
    'unused-javascript',
    'third-party-summary',
    'long-tasks',
  ],
  cls: ['cumulative-layout-shift', 'layout-shift-elements', 'non-composited-animations', 'unsized-images'],
  si: ['speed-index', 'render-blocking-resources', 'uses-optimized-images', 'unminified-javascript', 'unminified-css'],
}

// Accessibility, Best Practices, and SEO each have dozens of individual
// checks (color contrast, alt text, aria-*, meta tags, etc.) — too many to
// hand-pick like the performance metrics above. Instead we pull every audit
// belonging to the category and keep only the ones that didn't fully pass:
// those are the actual, specific reasons the score isn't 100.
const CATEGORY_KEYS: Record<string, string> = {
  accessibility: 'accessibility',
  bestPractices: 'best-practices',
  seo: 'seo',
}
const MAX_CATEGORY_ISSUES = 8

// Lighthouse audit descriptions use markdown links like "[Learn more](url)" —
// strip to plain text since the tooltip isn't a markdown renderer.
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function extractCategoryIssues(
  lhr: { audits?: Record<string, any>; categories?: Record<string, any> },
  categoryKey: string
): DiagnosticEntry[] {
  const category = lhr.categories?.[categoryKey]
  const audits = lhr.audits ?? {}
  if (!category?.auditRefs) return []

  const entries: DiagnosticEntry[] = []
  for (const ref of category.auditRefs) {
    const audit = audits[ref.id]
    if (!audit || typeof audit.score !== 'number' || audit.score === 1) continue
    entries.push({
      id: ref.id,
      title: audit.title ?? ref.id,
      description: stripMarkdownLinks(audit.description ?? ''),
      score: audit.score,
      displayValue: audit.displayValue || undefined,
    })
  }

  // Worst issues first, capped so the tooltip stays readable.
  entries.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  return entries.slice(0, MAX_CATEGORY_ISSUES)
}

export function extractDiagnostics(lhr: {
  audits?: Record<string, any>
  categories?: Record<string, any>
}): MetricDiagnostics {
  const result: MetricDiagnostics = {}
  const audits = lhr.audits ?? {}

  for (const [metric, auditIds] of Object.entries(METRIC_AUDIT_IDS)) {
    const entries: DiagnosticEntry[] = []
    for (const id of auditIds) {
      const audit = audits[id]
      if (!audit || audit.scoreDisplayMode === 'notApplicable') continue
      entries.push({
        id,
        title: audit.title ?? id,
        description: stripMarkdownLinks(audit.description ?? ''),
        score: typeof audit.score === 'number' ? audit.score : null,
        displayValue: audit.displayValue || undefined,
      })
    }
    result[metric] = entries
  }

  for (const [metric, categoryKey] of Object.entries(CATEGORY_KEYS)) {
    result[metric] = extractCategoryIssues(lhr, categoryKey)
  }

  return result
}
