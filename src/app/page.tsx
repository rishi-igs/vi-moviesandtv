'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'

const STORAGE_KEY = 'lighthouse-websites-cache'

type CachedData = { rows: any[]; lastUpdated: string }

function loadCachedRows(): CachedData {
  if (typeof window === 'undefined') return { rows: [], lastUpdated: '—' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { rows: [], lastUpdated: '—' }
    return JSON.parse(raw) as CachedData
  } catch {
    return { rows: [], lastUpdated: '—' }
  }
}

function saveCachedRows(rows: any[], lastUpdated: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, lastUpdated }))
  } catch {
    // ignore storage failures
  }
}

// ---------------------------------------------------------------------------
// Icons (inline SVG components)
// ---------------------------------------------------------------------------
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const IconGauge = () => <svg {...svgProps}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>
const IconDocument = () => <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
const IconLink = () => <svg {...svgProps}><path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-1.93 1.93a5 5 0 0 0 7.07 7.07L13.5 18.5" /></svg>
const IconStopwatch = () => <svg {...svgProps}><path d="M10 2h4" /><path d="M12 14v-4" /><circle cx="12" cy="14" r="8" /></svg>
const IconImage = () => <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
const IconHand = () => <svg {...svgProps}><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>
const IconLayers = () => <svg {...svgProps}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
const IconActivity = () => <svg {...svgProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
const IconBarChart = () => <svg {...svgProps}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>
const IconGlobe = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
const IconClock = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
const IconSparkles = () => <svg {...svgProps}><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z" /><path d="m19 15 0.7 2.3L22 18l-2.3 0.7L19 21l-0.7-2.3L16 18l2.3-0.7L19 15Z" /><path d="m5 15 0.7 2.3L8 18l-2.3 0.7L5 21l-0.7-2.3L2 18l2.3-0.7L5 15Z" /></svg>

// ---------------------------------------------------------------------------
// Grade helpers
// ---------------------------------------------------------------------------
const grade = {
  fcp: (s: number | null) => s == null ? 'muted' : s <= 1.8 ? 'good' : s <= 3.0 ? 'warn' : 'bad',
  lcp: (s: number | null) => s == null ? 'muted' : s <= 2.5 ? 'good' : s <= 4.0 ? 'warn' : 'bad',
  tbt: (ms: number | null) => ms == null ? 'muted' : ms <= 200 ? 'good' : ms <= 600 ? 'warn' : 'bad',
  cls: (v: number | null) => v == null ? 'muted' : v <= 0.1 ? 'good' : v <= 0.25 ? 'warn' : 'bad',
  si: (s: number | null) => s == null ? 'muted' : s <= 3.4 ? 'good' : s <= 5.8 ? 'warn' : 'bad',
  score: (v: number | null) => v == null ? 'muted' : v >= 90 ? 'good' : v >= 50 ? 'warn' : 'bad'
}

const fmt = (v: number | null, digits = 1, suffix = '') => v == null || isNaN(v) ? '—' : v.toFixed(digits) + suffix
const fmtMs = (v: number | null) => v == null || isNaN(v) ? '—' : Math.round(v) + ' ms'
// CLS is shown as a bare "0" when it rounds to zero rather than "0.000"
const fmtCls = (v: number | null) => {
  if (v == null || isNaN(v)) return '—'
  const rounded = v.toFixed(3)
  return rounded === '0.000' ? '0' : rounded
}
// Lighthouse stores FCP/LCP/Speed Index/TTI as milliseconds — convert to seconds for display
const msToSec = (v: number | null | undefined) => v == null || isNaN(v) ? null : v / 1000

// Page-load-time (TTI) rating buckets, in milliseconds
const PLT_FAST_MS = 1000   // < 1s
const PLT_SLOW_MS = 2000   // > 2s

function getCategoryLabel(category: string) {
  switch (category) {
    case 'performance': return 'Performance'
    case 'accessibility': return 'Accessibility'
    case 'best-practices': return 'Best Practices'
    case 'seo': return 'SEO'
    default: return category
  }
}

function getCategoryScore(row: any, category: string) {
  if (!row?.audit) return null
  switch (category) {
    case 'performance': return row.audit.performanceScore ?? null
    case 'accessibility': return row.audit.accessibilityScore ?? null
    case 'best-practices': return row.audit.bestPracticesScore ?? null
    case 'seo': return row.audit.seoScore ?? null
    default: return null
  }
}

function getCategoryDetails(row: any, category: string) {
  return (row?.categories || []).find((item: any) => item.category === category) || null
}

function resolveIssues(source: any): any[] {
  if (!source) return []
  if (Array.isArray(source)) return source
  if (typeof source === 'string') {
    try {
      return resolveIssues(JSON.parse(source))
    } catch {
      return []
    }
  }
  if (typeof source !== 'object') return []

  const lookupKeys = ['issues', 'details', 'items', 'violations', 'entries', 'nodes', 'findings']
  for (const key of lookupKeys) {
    const value = source[key]
    if (Array.isArray(value) && value.length > 0) return value
  }

  for (const value of Object.values(source)) {
    const nested = resolveIssues(value)
    if (nested.length > 0) return nested
  }

  return []
}

function getPointsLost(score: number | null) {
  return score == null ? 100 : Math.max(0, 100 - score)
}

// URLs audited by the bulk "Load" button for quick end-to-end testing.
const BULK_TARGETS = [
  'https://moviesandtv.myvi.in/',
  'https://moviesandtv.myvi.in/sports',
  'https://moviesandtv.myvi.in/originals',
  'https://moviesandtv.myvi.in/home',
  'https://moviesandtv.myvi.in/movies',
]

// ---------------------------------------------------------------------------
// Donut charts
// ---------------------------------------------------------------------------
// Single-value ring: a grey track with one coloured arc filling `pct` percent.
function DonutRing({ pct, color, title }: { pct: number; color: string; title: string }) {
  const safe = Math.max(0, Math.min(100, pct))
  return (
    <div className="donut-card">
      <div className="donut-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e8ecf3" strokeWidth="11" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="11"
            pathLength={100} strokeDasharray={`${safe} ${100 - safe}`} strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="donut-center">{Math.round(safe)}%</div>
      </div>
      <div className="donut-title">{title}</div>
    </div>
  )
}

// Multi-segment ring built from an ordered list of { value, color } slices.
function SegmentedDonut({ segments, total, centerTop, centerBottom }: { segments: { value: number; color: string }[]; total: number; centerTop: string; centerBottom: string }) {
  let cumulative = 0
  return (
    <div className="rating-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e8ecf3" strokeWidth="14" />
        {total > 0 && segments.map((seg, i) => {
          const pct = (seg.value / total) * 100
          const offset = cumulative
          cumulative += pct
          if (seg.value === 0) return null
          return (
            <circle
              key={i} cx="50" cy="50" r="42" fill="none" stroke={seg.color} strokeWidth="14"
              pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          )
        })}
      </svg>
      <div className="rating-center">
        <span className="rating-center-top">{centerTop}</span>
        <span className="rating-center-bottom">{centerBottom}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function BrandBar() {
  return (
    <header className="brand-bar">
      <img className="logo-left" src="/Assets/images.png" alt="VI movies & tv" />
      <div className="brand-stripe"><span className="s1" /><span className="s2" /><span className="s3" /></div>
      <img className="logo-right" src="/Assets/IGS_Main_Logo.BJcAJana_1NGxFy.webp" alt="IGS Engineering Quality" />
    </header>
  )
}

function HeroStats({ count, bestPageLoad, worstPageLoad, avgPageLoad }: { count: number; bestPageLoad: number | null; worstPageLoad: number | null; avgPageLoad: number | null }) {
  return (
    <div className="hero-stats">
      <div className="stat-card">
        <div className="icon icon-bg-blue"><IconDocument /></div>
        <div><div className="val">{count}</div><div className="lbl">Pages Tested</div></div>
      </div>
      <div className="stat-card">
        <div className="icon icon-bg-gray"><IconStopwatch /></div>
        <div><div className="val">{bestPageLoad === null ? '—' : (bestPageLoad / 1000).toFixed(2) + 's'}</div><div className="lbl">Best Page Load</div></div>
      </div>
      <div className="stat-card">
        <div className="icon icon-bg-gray"><IconStopwatch /></div>
        <div><div className="val">{worstPageLoad === null ? '—' : (worstPageLoad / 1000).toFixed(2) + 's'}</div><div className="lbl">Worst Page Load</div></div>
      </div>
      <div className="stat-card">
        <div className="icon icon-bg-gray"><IconBarChart /></div>
        <div><div className="val">{avgPageLoad === null ? '—' : (avgPageLoad / 1000).toFixed(2) + 's'}</div><div className="lbl">Avg Page Load</div></div>
      </div>
    </div>
  )
}

function Hero({ rows, lastUpdated, bestPageLoad, worstPageLoad, avgPageLoad }: { rows: any[], lastUpdated: string; bestPageLoad: number | null; worstPageLoad: number | null; avgPageLoad: number | null }) {
  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-icon"><IconGauge /></div>
        <div>
          <h1>
            WEBSITE PERFORMANCE REPORT
            <span className="live-badge"><span className="dot" />LIVE</span>
          </h1>
          <div className="hero-sub">
            <span><IconGlobe /></span><span>Environment: Browsing History Audit</span>
            <span><IconClock /></span><span>Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </div>
      <HeroStats count={rows.length} bestPageLoad={bestPageLoad} worstPageLoad={worstPageLoad} avgPageLoad={avgPageLoad} />
    </section>
  )
}

function HistoryMetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="history-item-metric">
      <span className="history-item-label">{label}</span>
      <span className="history-item-value">{value}</span>
    </div>
  )
}

function HistoryPanel({ url, history }: { url: string; history: any[] }) {
  return (
    <div className="history-panel">
      <div className="history-heading">Previous audits for {url}</div>
      {history?.length ? (
        <div className="history-list">
          {history.map((audit: any) => (
            <div key={audit.id} className="history-item">
              <div className="history-item-top">
                <span>{new Date(audit.createdAt).toLocaleString()}</span>
                <span className={grade.score(audit.performanceScore ?? null)}>{audit.performanceScore == null ? '—' : `${audit.performanceScore}%`}</span>
              </div>
              <div className="history-item-grid">
                <HistoryMetricItem label="FCP" value={fmt(msToSec(audit.metric?.fcp), 1, ' s')} />
                <HistoryMetricItem label="LCP" value={fmt(msToSec(audit.metric?.lcp), 1, ' s')} />
                <HistoryMetricItem label="TBT" value={fmtMs(audit.metric?.tbt ?? null)} />
                <HistoryMetricItem label="CLS" value={fmtCls(audit.metric?.cls ?? null)} />
                <HistoryMetricItem label="Speed Index" value={fmt(msToSec(audit.metric?.speedIndex), 1, ' s')} />
                <HistoryMetricItem label="Accessibility" value={audit.accessibilityScore == null ? '—' : `${audit.accessibilityScore}%`} />
                <HistoryMetricItem label="Best Practices" value={audit.bestPracticesScore == null ? '—' : `${audit.bestPracticesScore}%`} />
                <HistoryMetricItem label="SEO" value={audit.seoScore == null ? '—' : `${audit.seoScore}%`} />
                <HistoryMetricItem label="Page Load" value={fmt(msToSec(audit.metric?.tti), 2, ' s')} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="history-empty">No previous audits yet.</div>
      )}
    </div>
  )
}

function ReportTable({ rows, showHistory, onPreviewInsight, onOpenInsight }: { rows: any[]; showHistory: boolean; onPreviewInsight: (row: any, category: string) => void; onOpenInsight: (row: any, category: string) => void }) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr className="group-row">
            <th></th><th></th><th></th>
            <th colSpan={6}>Performance</th>
            <th></th><th></th><th></th><th></th>
          </tr>
          <tr className="col-row">
            <th style={{ width: 40 }}>#</th>
            <th className="col-page"><div className="th-inner"><IconDocument /><span>Page</span></div></th>
            <th className="col-url"><div className="th-inner"><IconLink /><span>URL</span></div></th>
            <th><div className="th-inner"><IconStopwatch /><span>First Contentful Paint (s)</span></div></th>
            <th><div className="th-inner"><IconImage /><span>Largest Contentful Paint (s)</span></div></th>
            <th><div className="th-inner"><IconHand /><span>Total Blocking Time (ms)</span></div></th>
            <th><div className="th-inner"><IconLayers /><span>Cumulative Layout Shift</span></div></th>
            <th><div className="th-inner"><IconActivity /><span>Speed Index (s)</span></div></th>
            <th><div className="th-inner"><IconBarChart /><span>Performance Score</span></div></th>
            <th><div className="th-inner"><IconBarChart /><span>Accessibility</span></div></th>
            <th><div className="th-inner"><IconBarChart /><span>Best Practices</span></div></th>
            <th><div className="th-inner"><IconBarChart /><span>SEO</span></div></th>
            <th><div className="th-inner"><IconStopwatch /><span>Page Load Time (s)</span></div></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={12} style={{ textAlign: 'center', padding: 24, color: '#98a2b3' }}>No successful audits available.</td></tr>
          ) : rows.map((r, i) => (
            <Fragment key={r.id}>
              <tr>
                <td className="col-idx"><span className="idx-badge">{i + 1}</span></td>
                <td className="col-page"><div className="page-row"><IconDocument /><span>{r.pageName}</span></div></td>
                <td className="col-url">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.url}>
                    <IconLink /><span>{r.url}</span>
                  </a>
                </td>
                {r.status === 'pending' ? (
                  <td colSpan={13} className="muted" style={{ textAlign: 'center' }}>Auditing…</td>
                ) : r.status === 'failed' ? (
                  <td colSpan={13} className="bad" style={{ textAlign: 'center' }} title={r.audit?.error || 'Audit failed'}>
                    Failed{r.audit?.error ? `: ${r.audit.error}` : ''}
                  </td>
                ) : (
                  <>
                    <td className={grade.fcp(msToSec(r.metric?.fcp))}>{fmt(msToSec(r.metric?.fcp), 1, ' s')}</td>
                    <td className={grade.lcp(msToSec(r.metric?.lcp))}>{fmt(msToSec(r.metric?.lcp), 1, ' s')}</td>
                    <td className={grade.tbt(r.metric?.tbt ?? null)}>{fmtMs(r.metric?.tbt ?? null)}</td>
                    <td className={grade.cls(r.metric?.cls ?? null)}>{fmtCls(r.metric?.cls ?? null)}</td>
                    <td className={grade.si(msToSec(r.metric?.speedIndex))}>{fmt(msToSec(r.metric?.speedIndex), 1, ' s')}</td>
                    <td>
                      <button
                        type="button"
                        className={`score-pill ${grade.score(r.audit?.performanceScore ?? null)}`}
                        onMouseEnter={() => onPreviewInsight(r, 'performance')}
                        onMouseLeave={() => onPreviewInsight(r, '')}
                        onClick={() => onOpenInsight(r, 'performance')}
                      >
                        {r.audit?.performanceScore == null ? '—' : `${r.audit.performanceScore}%`}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`score-pill ${grade.score(r.audit?.accessibilityScore ?? null)}`}
                        onMouseEnter={() => onPreviewInsight(r, 'accessibility')}
                        onMouseLeave={() => onPreviewInsight(r, '')}
                        onClick={() => onOpenInsight(r, 'accessibility')}
                      >
                        {r.audit?.accessibilityScore == null ? '—' : `${r.audit.accessibilityScore}%`}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`score-pill ${grade.score(r.audit?.bestPracticesScore ?? null)}`}
                        onMouseEnter={() => onPreviewInsight(r, 'best-practices')}
                        onMouseLeave={() => onPreviewInsight(r, '')}
                        onClick={() => onOpenInsight(r, 'best-practices')}
                      >
                        {r.audit?.bestPracticesScore == null ? '—' : `${r.audit.bestPracticesScore}%`}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`score-pill ${grade.score(r.audit?.seoScore ?? null)}`}
                        onMouseEnter={() => onPreviewInsight(r, 'seo')}
                        onMouseLeave={() => onPreviewInsight(r, '')}
                        onClick={() => onOpenInsight(r, 'seo')}
                      >
                        {r.audit?.seoScore == null ? '—' : `${r.audit.seoScore}%`}
                      </button>
                    </td>
                    <td className={r.metric?.tti == null ? 'muted' : ''}>{fmt(msToSec(r.metric?.tti), 2, ' s')}</td>
                  </>
                )}
              </tr>
              {showHistory && (
                <tr key={`${r.id}-history`}>
                  <td colSpan={12} className="history-cell">
                    <HistoryPanel url={r.url} history={r.history || []} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function PerformanceOverview({ rows }: { rows: any[] }) {
  const allMetrics = rows.map(r => r.metric).filter(m => m)

  // All raw values are milliseconds (except CLS); convert to seconds for display.
  const fcps = allMetrics.map(m => m.fcp).filter((v): v is number => typeof v === 'number')
  const lcps = allMetrics.map(m => m.lcp).filter((v): v is number => typeof v === 'number')
  const tbts = allMetrics.map(m => m.tbt).filter((v): v is number => typeof v === 'number')
  const speedIndices = allMetrics.map(m => m.speedIndex).filter((v): v is number => typeof v === 'number')
  const pageLoads = allMetrics.map(m => m.tti).filter((v): v is number => typeof v === 'number')

  const bestFcp = fcps.length > 0 ? Math.min(...fcps) : null
  const avgFcp = fcps.length > 0 ? fcps.reduce((a, b) => a + b, 0) / fcps.length : null
  const worstLcp = lcps.length > 0 ? Math.max(...lcps) : null
  const highestTbt = tbts.length > 0 ? Math.max(...tbts) : null
  const highestSi = speedIndices.length > 0 ? Math.max(...speedIndices) : null
  const highestPageLoad = pageLoads.length > 0 ? Math.max(...pageLoads) : null

  const sec = (ms: number | null) => ms === null ? '—' : (ms / 1000).toFixed(2) + ' s'

  return (
    <section className="overview-section">
      <h2>Performance Overview</h2>
      <div className="overview-grid">
        <div className="overview-card">
          <div className="overview-icon"><IconStopwatch /></div>
          <div className="overview-value">{sec(bestFcp)}</div>
          <div className="overview-label">Best FCP (Fastest)</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconStopwatch /></div>
          <div className="overview-value">{sec(avgFcp)}</div>
          <div className="overview-label">Avg FCP</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconImage /></div>
          <div className="overview-value">{sec(worstLcp)}</div>
          <div className="overview-label">Worst LCP (Slowest)</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconHand /></div>
          <div className="overview-value">{highestTbt === null ? '—' : Math.round(highestTbt) + ' ms'}</div>
          <div className="overview-label">Highest TBT</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconActivity /></div>
          <div className="overview-value">{sec(highestSi)}</div>
          <div className="overview-label">Highest Speed Index</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconClock /></div>
          <div className="overview-value">{sec(highestPageLoad)}</div>
          <div className="overview-label">Highest Page Load</div>
        </div>
      </div>
    </section>
  )
}

function ScoreDistribution({ rows }: { rows: any[] }) {
  const allAudits = rows.map(r => r.audit).filter(a => a)

  const accessibilityScores = allAudits.map(a => a.accessibilityScore).filter((v): v is number => typeof v === 'number')
  const bestPracticesScores = allAudits.map(a => a.bestPracticesScore).filter((v): v is number => typeof v === 'number')
  const seoScores = allAudits.map(a => a.seoScore).filter((v): v is number => typeof v === 'number')

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  const avgAccessibility = avg(accessibilityScores)
  const avgBestPractices = avg(bestPracticesScores)
  const avgSeo = avg(seoScores)

  // Share of pages whose page-load time (TTI) is under 1 second.
  const pageLoads = rows.map(r => r.metric?.tti).filter((v): v is number => typeof v === 'number')
  const under1s = pageLoads.filter(v => v < PLT_FAST_MS).length
  const pctUnder1s = pageLoads.length > 0 ? Math.round((under1s / pageLoads.length) * 100) : 0

  return (
    <section className="distribution-section">
      <h2>Score Distribution</h2>
      <div className="distribution-grid">
        <DonutRing pct={avgAccessibility} color="var(--acc-orange)" title="Accessibility" />
        <DonutRing pct={avgBestPractices} color="var(--acc-green)" title="Best Practices" />
        <DonutRing pct={avgSeo} color="var(--acc-blue)" title="SEO" />
        <DonutRing pct={pctUnder1s} color="var(--acc-purple)" title="Page Load (Time < 1s)" />
      </div>
    </section>
  )
}

function PerformanceRating({ rows }: { rows: any[] }) {
  const pageLoads = rows.map(r => r.metric?.tti).filter((v): v is number => typeof v === 'number')

  const fast = pageLoads.filter(v => v < PLT_FAST_MS).length
  const moderate = pageLoads.filter(v => v >= PLT_FAST_MS && v < PLT_SLOW_MS).length
  const slow = pageLoads.filter(v => v >= PLT_SLOW_MS).length
  const total = pageLoads.length

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0
  const fastPercent = pct(fast)

  const legend = [
    { color: '#1a8a3d', label: 'Fast (< 1s)', count: fast },
    { color: '#d9860b', label: 'Moderate (1s - 2s)', count: moderate },
    { color: '#d92d20', label: 'Slow (> 2s)', count: slow },
  ]

  return (
    <section className="rating-section">
      <h2>Performance Rating (Page Load Time)</h2>
      <div className="rating-container">
        <div className="rating-legend">
          {legend.map((item) => (
            <div className="rating-item" key={item.label}>
              <span className="rating-dot" style={{ backgroundColor: item.color }}></span>
              <span className="rating-text">{item.label}</span>
              <span className="rating-count">{item.count} page{item.count === 1 ? '' : 's'} ({pct(item.count)}%)</span>
            </div>
          ))}
        </div>
        <SegmentedDonut
          segments={legend.map(l => ({ value: l.count, color: l.color }))}
          total={total}
          centerTop={`${fastPercent}%`}
          centerBottom="Fast"
        />
      </div>
    </section>
  )
}

function InsightPreview({ insight }: { insight: any }) {
  if (!insight) return null

  return (
    <div className="insight-preview-card">
      <div className="insight-preview-header">
        <div>
          <div className="insight-preview-label">{insight.label}</div>
          <div className="insight-preview-url">{insight.url}</div>
        </div>
        <div className={`insight-score-pill ${grade.score(insight.score ?? null)}`}>{insight.score == null ? '—' : `${insight.score}%`}</div>
      </div>
      <div className="insight-preview-meta">
        <span>Points lost: {getPointsLost(insight.score)}%</span>
        <span>{insight.issues.length} issues</span>
      </div>
      <div className="insight-preview-list">
        {(insight.issues || []).slice(0, 4).map((issue: any) => (
          <div key={issue.id} className="insight-preview-item">
            <strong>{issue.title}</strong>
            <span>{issue.severity || 'needs attention'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InsightDrawer({ insight, issue, onSelectIssue, onClose }: { insight: any; issue: any; onSelectIssue: (issueId: string) => void; onClose: () => void }) {
  if (!insight) return null

  const issues = resolveIssues(insight.issues?.length ? insight.issues : insight.raw || insight)
  const activeIssue = issue || issues[0] || null

  return (
    <div className="insight-drawer-backdrop" onClick={onClose}>
      <aside className="insight-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="insight-drawer-header">
          <div>
            <div className="insight-drawer-label">{insight.label}</div>
            <h3>{insight.url}</h3>
          </div>
          <button type="button" className="insight-drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="insight-drawer-summary">
          <div className={`insight-score-pill ${grade.score(insight.score ?? null)}`}>{insight.score == null ? '—' : `${insight.score}%`}</div>
          <div>
            <div className="insight-drawer-kicker">Points lost</div>
            <div className="insight-drawer-value">{getPointsLost(insight.score)}%</div>
          </div>
          <div>
            <div className="insight-drawer-kicker">Issues</div>
            <div className="insight-drawer-value">{issues.length}</div>
          </div>
        </div>

        <div className="insight-drawer-body">
          <div className="insight-issue-list">
            {issues.length > 0 ? issues.map((item: any, index: number) => (
              <button
                key={item.id ?? item.ruleId ?? index}
                type="button"
                className={`insight-issue-item ${activeIssue?.id === item.id ? 'is-active' : ''}`}
                onClick={() => onSelectIssue(item.id ?? item.ruleId ?? String(index))}
              >
                <span>{item.title || item.ruleId || item.id || `Issue ${index + 1}`}</span>
                <small>{item.severity || item.impact || item.type || 'needs attention'}</small>
              </button>
            )) : (
              <div className="insight-empty">
                No audit issues were found for this category.
              </div>
            )}
          </div>

          {activeIssue ? (
            <div className="insight-issue-detail">
              <h4>{activeIssue.title || activeIssue.ruleId || activeIssue.id || 'Issue details'}</h4>
              <p>{activeIssue.description || activeIssue.explanation || activeIssue.message || 'Lighthouse flagged this issue and it is contributing to the overall category score.'}</p>
              <div className="insight-detail-grid">
                <div><label>Why it matters</label><div>{activeIssue.explanation || activeIssue.description || 'This issue reduces confidence in the experience and can harm usability, accessibility, or SEO.'}</div></div>
                <div><label>Estimated impact</label><div>{activeIssue.estimatedImpact || activeIssue.impact || 'Medium'}</div></div>
                <div><label>Selector</label><div>{activeIssue.selector || activeIssue.node || activeIssue.target || 'No specific selector available'}</div></div>
                <div><label>Display value</label><div>{activeIssue.displayValue || activeIssue.value || '—'}</div></div>
              </div>
              <div className="insight-detail-block">
                <label>Suggested fix</label>
                <div>{activeIssue.recommendation || activeIssue.fix || 'Review the failing element and update the implementation to satisfy the Lighthouse audit guidance.'}</div>
              </div>
              <div className="insight-detail-block">
                <label>HTML snippet</label>
                <pre>{activeIssue.htmlSnippet || activeIssue.snippet || activeIssue.node || '<!-- No snippet available -->'}</pre>
              </div>
              {activeIssue.documentationUrl ? (
                <a className="insight-doc-link" href={activeIssue.documentationUrl} target="_blank" rel="noreferrer">Open Lighthouse documentation</a>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function AIAssistantPanel({ rows }: { rows: any[] }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Ask me anything about the current audit data and I will answer using only the records shown here.' },
  ])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return

    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setLoading(true)
    setQuestion('')

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, rows }),
      })

      const data = await response.json()
      setMessages((current) => [...current, { role: 'assistant', content: data.answer || 'I could not generate an answer from the available data.' }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'I could not reach the assistant service right now. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-assistant-wrap">
      <button className="ai-assistant-toggle" onClick={() => setOpen((value) => !value)} type="button">
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
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about the latest scores, best URLs, or comparisons"
            />
            <button type="submit" disabled={loading}>Send</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [rows, setRows] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState('—')
  const [loading, setLoading] = useState(true)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkResults, setBulkResults] = useState<{ url: string; ok: boolean; msg: string }[] | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonSelection, setComparisonSelection] = useState<string[]>([])
  const [hoveredInsight, setHoveredInsight] = useState<any>(null)
  const [selectedInsight, setSelectedInsight] = useState<any>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const fetchWebsites = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch('/api/websites')
      if (res.ok) {
        const data = await res.json()
        setWebsites(data)
      }
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebsites()
    // Poll in the background so newly-completed audits (e.g. from the Chrome
    // extension auditing whatever you're browsing) show up without a manual
    // refresh. Silent — no loading spinner on each tick.
    const interval = setInterval(() => fetchWebsites({ silent: true }), 10000)
    return () => clearInterval(interval)
  }, [fetchWebsites])

  const handleAuditComplete = useCallback(() => {
    fetchWebsites()
  }, [fetchWebsites])

  const reportRows = useMemo(() => {
    return websites
      .map((site) => {
        const latestAudit = site.audits?.[0]
        const metric = latestAudit?.metrics?.[0]
        const pageName = site.url ? new URL(site.url).pathname.replace(/\/$/, '') || '/' : site.title || site.url
        return {
          id: site.id,
          title: site.title || pageName,
          url: site.url,
          audit: latestAudit,
          metric,
          pageName,
        }
      })
    )
    setBulkResults(results)
    setBulkRunning(false)
    loadData()
  }, [loadData])

  const handlePreviewInsight = useCallback((row: any, category: string) => {
    if (!category) {
      setHoveredInsight(null)
      return
    }

    const details = getCategoryDetails(row, category)
    const issues = resolveIssues(details)
    const score = getCategoryScore(row, category)

    setHoveredInsight({
      label: getCategoryLabel(category),
      url: row.url,
      score,
      issues,
      raw: details,
    })
  }, [])

  const handleOpenInsight = useCallback((row: any, category: string) => {
    const details = getCategoryDetails(row, category)
    const issues = resolveIssues(details)
    const score = getCategoryScore(row, category)

    setSelectedInsight({
      label: getCategoryLabel(category),
      url: row.url,
      score,
      issues,
      raw: details,
    })
    setSelectedIssueId(issues[0]?.id ?? issues[0]?.ruleId ?? null)
  }, [])

  const toggleComparisonSelection = useCallback((url: string) => {
    setComparisonSelection((current) => {
      if (current.includes(url)) {
        return current.filter((item) => item !== url)
      }
      if (current.length >= 3) {
        return current
      }
      return [...current, url]
    })
  }, [])

  const comparisonRows = rows.filter((row) => comparisonSelection.includes(row.url))

  // Calculate page load statistics from page-load time (TTI)
  const pageLoads = rows
    .map((row) => row.metric?.tti)
    .filter((value): value is number => typeof value === 'number')

  const bestPageLoad = pageLoadTimes.length ? Math.min(...pageLoadTimes) : null
  const worstPageLoad = pageLoadTimes.length ? Math.max(...pageLoadTimes) : null
  const avgPageLoad = pageLoadTimes.length ? pageLoadTimes.reduce((sum, value) => sum + value, 0) / pageLoadTimes.length : null

  const totalSites = websites.length
  const latestAudit = reportRows[0]?.audit
  const lastAuditedAt = latestAudit ? new Date(latestAudit.createdAt) : null

  let reportContent = null
  if (loading) {
    reportContent = <p className="text-center text-slate-500 py-12">Loading audits...</p>
  } else if (reportRows.length === 0) {
    reportContent = <p className="text-center text-slate-500 py-12">No Lighthouse Performance Tracker audit data available yet.</p>
  } else {
    reportContent = (
      <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-slate-50 shadow-inner shadow-slate-900/5">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
          <thead>
            <tr className="bg-slate-950 text-slate-100">
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">#</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">Page</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">URL - Prod - v1.16.2</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">FCP (s)</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">LCP (s)</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">TBT (ms)</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">CLS</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">Speed Index (s)</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">Accessibility</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">Best Practices</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">SEO</th>
              <th className="sticky top-0 border-b border-slate-800 bg-slate-950 px-4 py-3">Page Load Time (s)</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, index) => (
              <tr key={row.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                <td className="border-b border-slate-200 px-4 py-4 text-slate-700">{index + 1}</td>
                <td className="border-b border-slate-200 px-4 py-4 font-medium text-slate-900">{row.pageName}</td>
                <td className="border-b border-slate-200 px-4 py-4 text-slate-600 break-all max-w-[260px]">{row.url}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatSeconds(row.metric?.fcp ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatSeconds(row.metric?.lcp ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{row.metric?.tbt === undefined || row.metric?.tbt === null ? '—' : Math.round(row.metric.tbt)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatCls(row.metric?.cls ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatSeconds(row.metric?.speedIndex ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatScore(row.audit?.accessibilityScore ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatScore(row.audit?.bestPracticesScore ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatScore(row.audit?.seoScore ?? null)}</td>
                <td className="border-b border-slate-200 px-4 py-4">{formatSeconds(row.metric?.speedIndex ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="rounded-[32px] border border-slate-800 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Website Performance Report - PROD</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl text-white">Lighthouse Performance Tracker</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Lighthouse performance snapshot for the Lighthouse Performance Tracker website, including latest site audits, load metrics, and accessibility insights.
              </p>
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-3 xl:w-[380px]">
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-slate-950/20">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pages Tested</p>
                <p className="mt-4 text-3xl font-semibold text-white">{totalSites}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-slate-950/20">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Best Page Load</p>
                <p className="mt-4 text-3xl font-semibold text-emerald-300">{formatSeconds(bestPageLoad)}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl shadow-slate-950/20">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Worst Page Load</p>
                <p className="mt-4 text-3xl font-semibold text-rose-300">{formatSeconds(worstPageLoad)}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-950/90 p-5 text-sm text-slate-400 ring-1 ring-slate-800">
              <p className="uppercase tracking-[0.24em] text-slate-500">Environment</p>
              <p className="mt-3 text-lg text-white">Production</p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 p-5 text-sm text-slate-400 ring-1 ring-slate-800">
              <p className="uppercase tracking-[0.24em] text-slate-500">Report Version</p>
              <p className="mt-3 text-lg text-white">v1.16.2</p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 p-5 text-sm text-slate-400 ring-1 ring-slate-800">
              <p className="uppercase tracking-[0.24em] text-slate-500">Average Load</p>
              <p className="mt-3 text-lg text-white">{formatSeconds(avgPageLoad)}</p>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/70">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Run a Lighthouse Performance Tracker audit</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Enter any Lighthouse Performance Tracker page URL to save the latest Lighthouse report.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <UrlInput onAuditComplete={handleAuditComplete} />
            </div>
          </section>

          <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-sm shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Recent audit summary</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Latest audit</p>
                <p className="mt-3 text-2xl font-semibold text-white">{lastAuditedAt ? lastAuditedAt.toLocaleString() : 'No audits yet'}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Latest score</p>
                <p className="mt-3 text-2xl font-semibold text-white">{formatScore(latestAudit?.performanceScore)}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pages stored</p>
                <p className="mt-3 text-2xl font-semibold text-white">{totalSites}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Data target</p>
                <p className="mt-3 text-2xl font-semibold text-white">Lighthouse Performance Tracker</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lighthouse Performance Tracker page performance</h2>
              <p className="mt-2 text-sm text-slate-500">
                Recent audited pages for Lighthouse Performance Tracker with Lighthouse metrics and load performance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-200">Production</span>
              <span className="rounded-full border border-slate-400/20 bg-slate-100/5 px-3 py-1 text-sm font-medium text-slate-300">v1.16.2</span>
            </div>
          </div>

          {reportContent}
        </section>
      </div>
      {loading ? (
        <div style={{ color: '#98a2b3', textAlign: 'center', padding: 20, marginTop: 20 }}>Loading audits...</div>
      ) : (
        <>
          <Hero rows={rows} lastUpdated={lastUpdated} bestPageLoad={bestPageLoad} worstPageLoad={worstPageLoad} avgPageLoad={avgPageLoad} />
          {hoveredInsight ? <InsightPreview insight={hoveredInsight} /> : null}
          <AIAssistantPanel rows={rows} />
          {showComparison && (
            <section className="comparison-card">
              <div className="comparison-head">
                <div>
                  <h3>Compare URLs</h3>
                  <p>Select up to 3 URLs to compare their latest results.</p>
                </div>
                <span className="comparison-pill">{comparisonSelection.length}/3 selected</span>
              </div>
              <div className="comparison-selector">
                {rows.map((row) => {
                  const checked = comparisonSelection.includes(row.url)
                  return (
                    <label key={row.id} className={`comparison-chip ${checked ? 'is-selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleComparisonSelection(row.url)}
                        disabled={!checked && comparisonSelection.length >= 3}
                      />
                      <div>
                        <div className="comparison-chip-title">{row.pageName}</div>
                        <div className="comparison-chip-url">{row.url}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {comparisonRows.length > 0 ? (
                <div className="comparison-table-wrap">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        {comparisonRows.map((row) => (
                          <th key={row.id}>{row.pageName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="comparison-metric-label">FCP</td>{comparisonRows.map((row) => <td key={row.id}>{fmt(msToSec(row.metric?.fcp), 1, ' s')}</td>)}</tr>
                      <tr><td className="comparison-metric-label">LCP</td>{comparisonRows.map((row) => <td key={row.id}>{fmt(msToSec(row.metric?.lcp), 1, ' s')}</td>)}</tr>
                      <tr><td className="comparison-metric-label">TBT</td>{comparisonRows.map((row) => <td key={row.id}>{fmtMs(row.metric?.tbt ?? null)}</td>)}</tr>
                      <tr><td className="comparison-metric-label">CLS</td>{comparisonRows.map((row) => <td key={row.id}>{fmtCls(row.metric?.cls ?? null)}</td>)}</tr>
                      <tr><td className="comparison-metric-label">Speed Index</td>{comparisonRows.map((row) => <td key={row.id}>{fmt(msToSec(row.metric?.speedIndex), 1, ' s')}</td>)}</tr>
                      <tr><td className="comparison-metric-label">Accessibility</td>{comparisonRows.map((row) => <td key={row.id}>{row.audit?.accessibilityScore == null ? '—' : `${row.audit.accessibilityScore}%`}</td>)}</tr>
                      <tr><td className="comparison-metric-label">Best Practices</td>{comparisonRows.map((row) => <td key={row.id}>{row.audit?.bestPracticesScore == null ? '—' : `${row.audit.bestPracticesScore}%`}</td>)}</tr>
                      <tr><td className="comparison-metric-label">SEO</td>{comparisonRows.map((row) => <td key={row.id}>{row.audit?.seoScore == null ? '—' : `${row.audit.seoScore}%`}</td>)}</tr>
                      <tr><td className="comparison-metric-label">Page Load</td>{comparisonRows.map((row) => <td key={row.id}>{fmt(msToSec(row.metric?.tti), 2, ' s')}</td>)}</tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="comparison-empty">Choose up to 3 URLs to compare their latest audit values.</div>
              )}
            </section>
          )}
          <ReportTable rows={rows} showHistory={showHistory} onPreviewInsight={handlePreviewInsight} onOpenInsight={handleOpenInsight} />
          <InsightDrawer
            insight={selectedInsight}
            issue={selectedInsight?.issues?.find((item: any) => item.id === selectedIssueId) || null}
            onSelectIssue={setSelectedIssueId}
            onClose={() => {
              setSelectedInsight(null)
              setSelectedIssueId(null)
            }}
          />
          <div className="bottom-panels">
            <PerformanceOverview rows={rows} />
            <ScoreDistribution rows={rows} />
            <PerformanceRating rows={rows} />
          </div>
        </>
      )}
    </div>
  )
}
