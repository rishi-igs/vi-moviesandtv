'use client'

import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'

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
              <td className={grade.fcp(r.metric?.fcp ?? null)}>{fmt(r.metric?.fcp ?? null, 2, ' s')}</td>
              <td className={grade.lcp(r.metric?.lcp ?? null)}>{fmt(r.metric?.lcp ?? null, 2, ' s')}</td>
              <td className={grade.tbt(r.metric?.tbt ?? null)}>{fmtMs(r.metric?.tbt ?? null)}</td>
              <td className={grade.cls(r.metric?.cls ?? null)}>{r.metric?.cls == null ? '—' : r.metric.cls.toFixed(3)}</td>
              <td className={grade.si(r.metric?.speedIndex ?? null)}>{fmt(r.metric?.speedIndex ?? null, 2, ' s')}</td>
              <td className={grade.score(r.audit?.accessibilityScore ?? null)}>{r.audit?.accessibilityScore == null ? '—' : r.audit.accessibilityScore + '%'}</td>
              <td className={grade.score(r.audit?.bestPracticesScore ?? null)}>{r.audit?.bestPracticesScore == null ? '—' : r.audit.bestPracticesScore + '%'}</td>
              <td className={grade.score(r.audit?.seoScore ?? null)}>{r.audit?.seoScore == null ? '—' : r.audit.seoScore + '%'}</td>
              <td className="muted">{'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function PerformanceOverview({ rows }: { rows: any[] }) {
  const allMetrics = rows.map(r => r.metric).filter(m => m)

  const fcps = allMetrics.map(m => m.fcp).filter((v): v is number => typeof v === 'number')
  const lcps = allMetrics.map(m => m.lcp).filter((v): v is number => typeof v === 'number')
  const tbts = allMetrics.map(m => m.tbt).filter((v): v is number => typeof v === 'number')
  const speedIndices = allMetrics.map(m => m.speedIndex).filter((v): v is number => typeof v === 'number')

  const bestFcp = fcps.length > 0 ? Math.min(...fcps) : null
  const avgFcp = fcps.length > 0 ? fcps.reduce((a, b) => a + b, 0) / fcps.length : null
  const worstLcp = lcps.length > 0 ? Math.max(...lcps) : null
  const highestTbt = tbts.length > 0 ? Math.max(...tbts) : null
  const highestSi = speedIndices.length > 0 ? Math.max(...speedIndices) : null
  const highestPageLoad = speedIndices.length > 0 ? Math.max(...speedIndices) : null

  return (
    <section className="overview-section">
      <h2>Performance Overview</h2>
      <div className="overview-grid">
        <div className="overview-card">
          <div className="overview-icon"><IconStopwatch /></div>
          <div className="overview-value">{bestFcp === null ? '—' : bestFcp.toFixed(2) + ' s'}</div>
          <div className="overview-label">Best FCP (Fastest)</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconStopwatch /></div>
          <div className="overview-value">{avgFcp === null ? '—' : avgFcp.toFixed(2) + ' s'}</div>
          <div className="overview-label">Avg FCP</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconImage /></div>
          <div className="overview-value">{worstLcp === null ? '—' : worstLcp.toFixed(2) + ' s'}</div>
          <div className="overview-label">Worst LCP (Slowest)</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconHand /></div>
          <div className="overview-value">{highestTbt === null ? '—' : Math.round(highestTbt) + ' ms'}</div>
          <div className="overview-label">Highest TBT</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconActivity /></div>
          <div className="overview-value">{highestSi === null ? '—' : highestSi.toFixed(2) + ' s'}</div>
          <div className="overview-label">Highest Speed Index</div>
        </div>
        <div className="overview-card">
          <div className="overview-icon"><IconClock /></div>
          <div className="overview-value">{highestPageLoad === null ? '—' : (highestPageLoad / 1000).toFixed(2) + ' s'}</div>
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
  const performanceScores = allAudits.map(a => a.performanceScore).filter((v): v is number => typeof v === 'number')

  const avgAccessibility = accessibilityScores.length > 0 ? Math.round(accessibilityScores.reduce((a, b) => a + b, 0) / accessibilityScores.length) : 0
  const avgBestPractices = bestPracticesScores.length > 0 ? Math.round(bestPracticesScores.reduce((a, b) => a + b, 0) / bestPracticesScores.length) : 0
  const avgSeo = seoScores.length > 0 ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length) : 0
  const avgPerformance = performanceScores.length > 0 ? Math.round(performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length) : 0

  return (
    <section className="distribution-section">
      <h2>Score Distribution</h2>
      <div className="distribution-grid">
        <div className="pie-card">
          <svg viewBox="0 0 100 100" className="pie-chart">
            <circle cx="50" cy="50" r="45" fill="white" stroke={avgAccessibility >= 90 ? '#1a8a3d' : avgAccessibility >= 50 ? '#d9860b' : '#d92d20'} strokeWidth="40" opacity="0.8" />
          </svg>
          <div className="pie-label">{avgAccessibility}%</div>
          <div className="pie-title">Accessibility</div>
        </div>
        <div className="pie-card">
          <svg viewBox="0 0 100 100" className="pie-chart">
            <circle cx="50" cy="50" r="45" fill="white" stroke={avgBestPractices >= 90 ? '#1a8a3d' : avgBestPractices >= 50 ? '#d9860b' : '#d92d20'} strokeWidth="40" opacity="0.8" />
          </svg>
          <div className="pie-label">{avgBestPractices}%</div>
          <div className="pie-title">Best Practices</div>
        </div>
        <div className="pie-card">
          <svg viewBox="0 0 100 100" className="pie-chart">
            <circle cx="50" cy="50" r="45" fill="white" stroke={avgSeo >= 90 ? '#1a8a3d' : avgSeo >= 50 ? '#d9860b' : '#d92d20'} strokeWidth="40" opacity="0.8" />
          </svg>
          <div className="pie-label">{avgSeo}%</div>
          <div className="pie-title">SEO</div>
        </div>
        <div className="pie-card">
          <svg viewBox="0 0 100 100" className="pie-chart">
            <circle cx="50" cy="50" r="45" fill="white" stroke={avgPerformance >= 90 ? '#1a8a3d' : avgPerformance >= 50 ? '#d9860b' : '#d92d20'} strokeWidth="40" opacity="0.8" />
          </svg>
          <div className="pie-label">{avgPerformance}%</div>
          <div className="pie-title">Performance</div>
        </div>
      </div>
    </section>
  )
}

function PerformanceRating({ rows }: { rows: any[] }) {
  const allMetrics = rows.map(r => r.metric).filter(m => m)
  const speedIndices = allMetrics.map(m => m.speedIndex).filter((v): v is number => typeof v === 'number')

  const fast = speedIndices.filter(v => v < 1000).length
  const moderate = speedIndices.filter(v => v >= 1000 && v < 2000).length
  const slow = speedIndices.filter(v => v >= 2000).length
  const total = speedIndices.length

  const fastPercent = total > 0 ? Math.round((fast / total) * 100) : 0
  const moderatePercent = total > 0 ? Math.round((moderate / total) * 100) : 0
  const slowPercent = total > 0 ? Math.round((slow / total) * 100) : 0

  return (
    <section className="rating-section">
      <h2>Performance Rating (Page Load Time)</h2>
      <div className="rating-container">
        <div className="rating-chart">
          <svg viewBox="0 0 200 120" className="rating-pie">
            <circle cx="60" cy="60" r="40" fill="white" stroke="#1a8a3d" strokeWidth="25" opacity="0.8" />
          </svg>
          <div className="rating-center">{fastPercent}%</div>
          <div className="rating-legend">
            <div className="rating-item">
              <span className="rating-dot" style={{ backgroundColor: '#1a8a3d' }}></span>
              <span className="rating-text">Fast (&lt; 1s)</span>
              <span className="rating-count">{fast} pages (60%)</span>
            </div>
            <div className="rating-item">
              <span className="rating-dot" style={{ backgroundColor: '#d9860b' }}></span>
              <span className="rating-text">Moderate (1s - 2s)</span>
              <span className="rating-count">{moderate} pages (33%)</span>
            </div>
            <div className="rating-item">
              <span className="rating-dot" style={{ backgroundColor: '#d92d20' }}></span>
              <span className="rating-text">Slow (&gt; 2s)</span>
              <span className="rating-count">{slow} pages (7%)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [rows, setRows] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState('—')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/websites')
        if (res.ok) {
          const websites = await res.json()
          const rowData = websites
            .filter((site: any) => site.url && site.url.includes('kirloskarpumps.com'))
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
              }
            })
            .filter((row: any) => row.audit && row.metric)
          
          setRows(rowData)
          setLastUpdated(new Date().toLocaleString())
        }
      } catch (error) {
        console.error('Failed to load websites:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate page load statistics from speedIndex
  const speedIndices = rows
    .map((row) => row.metric?.speedIndex)
    .filter((value): value is number => typeof value === 'number')
  
  const bestPageLoad = speedIndices.length > 0 ? Math.min(...speedIndices) : null
  const worstPageLoad = speedIndices.length > 0 ? Math.max(...speedIndices) : null
  const avgPageLoad = speedIndices.length > 0 ? speedIndices.reduce((sum, val) => sum + val, 0) / speedIndices.length : null

  return (
    <div className="page">
      <BrandBar />
      {loading ? (
        <div style={{ color: '#98a2b3', textAlign: 'center', padding: 20, marginTop: 20 }}>Loading audits...</div>
      ) : (
        <>
          <Hero rows={rows} lastUpdated={lastUpdated} bestPageLoad={bestPageLoad} worstPageLoad={worstPageLoad} avgPageLoad={avgPageLoad} />
          <ReportTable rows={rows} />
          <PerformanceOverview rows={rows} />
          <ScoreDistribution rows={rows} />
          <PerformanceRating rows={rows} />
        </>
      )}
    </div>
  )
}
