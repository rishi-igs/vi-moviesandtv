'use client'

import { useEffect, useState } from 'react'

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

function ReportTable({ rows }: { rows: any[] }) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr className="group-row">
            <th></th><th></th><th></th>
            <th colSpan={5}>Performance</th>
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
            <tr key={r.id}>
              <td className="col-idx"><span className="idx-badge">{i + 1}</span></td>
              <td className="col-page"><div className="page-row"><IconDocument /><span>{r.pageName}</span></div></td>
              <td className="col-url">
                <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.url}>
                  <IconLink /><span>{r.url}</span>
                </a>
              </td>
              {r.status === 'pending' ? (
                <td colSpan={9} className="muted" style={{ textAlign: 'center' }}>Auditing…</td>
              ) : r.status === 'failed' ? (
                <td colSpan={9} className="bad" style={{ textAlign: 'center' }} title={r.audit?.error || 'Audit failed'}>
                  Failed{r.audit?.error ? `: ${r.audit.error}` : ''}
                </td>
              ) : (
                <>
                  <td className={grade.fcp(msToSec(r.metric?.fcp))}>{fmt(msToSec(r.metric?.fcp), 1, ' s')}</td>
                  <td className={grade.lcp(msToSec(r.metric?.lcp))}>{fmt(msToSec(r.metric?.lcp), 1, ' s')}</td>
                  <td className={grade.tbt(r.metric?.tbt ?? null)}>{fmtMs(r.metric?.tbt ?? null)}</td>
                  <td className={grade.cls(r.metric?.cls ?? null)}>{fmtCls(r.metric?.cls ?? null)}</td>
                  <td className={grade.si(msToSec(r.metric?.speedIndex))}>{fmt(msToSec(r.metric?.speedIndex), 1, ' s')}</td>
                  <td className={grade.score(r.audit?.accessibilityScore ?? null)}>{r.audit?.accessibilityScore == null ? '—' : r.audit.accessibilityScore + '%'}</td>
                  <td className={grade.score(r.audit?.bestPracticesScore ?? null)}>{r.audit?.bestPracticesScore == null ? '—' : r.audit.bestPracticesScore + '%'}</td>
                  <td className={grade.score(r.audit?.seoScore ?? null)}>{r.audit?.seoScore == null ? '—' : r.audit.seoScore + '%'}</td>
                  <td className={r.metric?.tti == null ? 'muted' : ''}>{fmt(msToSec(r.metric?.tti), 2, ' s')}</td>
                </>
              )}
            </tr>
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

export default function Home() {
  const [rows, setRows] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState('—')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const cached = loadCachedRows()
    if (cached.rows.length > 0) {
      setRows(cached.rows)
      setLastUpdated(cached.lastUpdated)
      setLoading(false)
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/websites')
        if (res.ok && !cancelled) {
          const websites = await res.json()
          const rowData = websites
            .filter((site: any) => site.url && site.url.includes('moviesandtv.myvi.in'))
            .map((site: any) => {
              const latestAudit = site.audits?.[0]
              const metric = latestAudit?.metrics?.[0]
              const pageName = site.url ? new URL(site.url).pathname.replace(/\/$/, '') || '/' : site.title || site.url
              return {
                id: site.id,
                pageName,
                url: site.url,
                audit: latestAudit,
                metric,
                status: latestAudit?.status ?? 'pending',
              }
            })

          const updatedAt = new Date().toLocaleString()
          setRows(rowData)
          setLastUpdated(updatedAt)
          saveCachedRows(rowData, updatedAt)
          if (!cancelled) setLoading(false)
        }
      } catch (error) {
        console.error('Failed to load websites:', error)
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Calculate page load statistics from page-load time (TTI)
  const pageLoads = rows
    .map((row) => row.metric?.tti)
    .filter((value): value is number => typeof value === 'number')

  const bestPageLoad = pageLoads.length > 0 ? Math.min(...pageLoads) : null
  const worstPageLoad = pageLoads.length > 0 ? Math.max(...pageLoads) : null
  const avgPageLoad = pageLoads.length > 0 ? pageLoads.reduce((sum, val) => sum + val, 0) / pageLoads.length : null

  return (
    <div className="page">
      <BrandBar />
      {loading ? (
        <div style={{ color: '#98a2b3', textAlign: 'center', padding: 20, marginTop: 20 }}>Loading audits...</div>
      ) : (
        <>
          <Hero rows={rows} lastUpdated={lastUpdated} bestPageLoad={bestPageLoad} worstPageLoad={worstPageLoad} avgPageLoad={avgPageLoad} />
          <ReportTable rows={rows} />
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
