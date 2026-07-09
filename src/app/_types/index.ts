export interface LighthouseResult {
  url: string
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  lcp: number | null
  fcp: number | null
  cls: number | null
  tbt: number | null
  speedIndex: number | null
  diagnostics: MetricDiagnostics
}

export interface DiagnosticEntry {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
}

// Keyed by metric: fcp | lcp | tbt | cls | si
export type MetricDiagnostics = Record<string, DiagnosticEntry[]>

export interface WebsiteWithAudits {
  id: number
  url: string
  title: string | null
  createdAt: Date
  audits: AuditWithMetrics[]
}

export interface AuditWithMetrics {
  id: number
  performanceScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  seoScore: number | null
  createdAt: Date
  metrics: {
    fcp: number | null
    lcp: number | null
    cls: number | null
    tbt: number | null
    speedIndex: number | null
  } | null
}
