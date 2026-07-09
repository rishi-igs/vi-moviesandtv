export interface LighthouseAuditIssue {
  id: string
  title: string
  description: string | null
  score: number | null
  severity: string | null
  explanation: string | null
  displayValue: string | null
  selector: string | null
  htmlSnippet: string | null
  recommendation: string | null
  documentationUrl: string | null
  estimatedImpact: string | null
  category: string
}

export interface LighthouseCategoryBreakdown {
  category: string
  score: number | null
  issues: LighthouseAuditIssue[]
}

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
  tti: number | null
  categories: LighthouseCategoryBreakdown[]
}

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
    tti: number | null
  } | null
}
