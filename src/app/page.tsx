'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import UrlInput from '@/app/_components/UrlInput'

function formatSeconds(value: number | null) {
  if (value == null) return '—'
  return `${(value / 1000).toFixed(2)}s`
}

function formatScore(value: number | null) {
  return value == null ? '—' : `${value}%`
}

function formatCls(value: number | null) {
  return value == null ? '—' : value.toFixed(3)
}

export default function Home() {
  const [websites, setWebsites] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchWebsites = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/websites')
        if (res.ok) {
          const data = await res.json()
          setWebsites(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchWebsites()
  }, [])

  const handleAuditComplete = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/websites')
      if (res.ok) {
        const data = await res.json()
        setWebsites(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

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
      .filter((row) => row.audit && row.metric)
  }, [websites])

  const pageLoadTimes = reportRows
    .map((row) => row.metric?.speedIndex)
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
    reportContent = <p className="text-center text-slate-500 py-12">No kirloskarpumps audit data available yet.</p>
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
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl text-white">kirloskarpumps</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Lighthouse performance snapshot for the kirloskarpumps website, including latest site audits, load metrics, and accessibility insights.
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
                <h2 className="text-xl font-semibold text-slate-900">Run a kirloskarpumps audit</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Enter any kirloskarpumps page URL to save the latest Lighthouse report.
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
                <p className="mt-3 text-2xl font-semibold text-white">kirloskarpumps</p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">kirloskarpumps page performance</h2>
              <p className="mt-2 text-sm text-slate-500">
                Recent audited pages for kirloskarpumps with Lighthouse metrics and load performance.
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
    </main>
  )
}
