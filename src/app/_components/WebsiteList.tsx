'use client'

import Link from 'next/link'

interface Metric {
  fcp: number | null
  lcp: number | null
  cls: number | null
  tbt: number | null
  speedIndex: number | null
}

interface Audit {
  performanceScore: number | null
  createdAt: string
  metrics: Metric[]
}

interface Website {
  id: number
  url: string
  title: string | null
  createdAt: string
  audits: Audit[]
}

export default function WebsiteList({ websites }: { websites: Website[] }) {
  if (websites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No websites tested yet. Enter a URL above to get started.
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {websites.map((site) => {
        const lastAudit = site.audits[0]
        const latestMetric = lastAudit?.metrics?.[0]
        const score = lastAudit?.performanceScore ?? null

        return (
          <Link
            key={site.id}
            href={`/websites/${site.id}`}
            className="group block overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.24em] text-sky-500">Website</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-900 truncate">
                  {site.title || site.url}
                </h3>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{site.url}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Performance</p>
                <p className={`mt-2 text-3xl font-bold ${
                  score === null
                    ? 'text-slate-500'
                    : score >= 90
                    ? 'text-emerald-600'
                    : score >= 50
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}>
                  {score ?? '—'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">FCP</p>
                <p className="mt-2 font-medium">
                  {latestMetric?.fcp != null ? `${(latestMetric.fcp / 1000).toFixed(2)}s` : '—'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">LCP</p>
                <p className="mt-2 font-medium">
                  {latestMetric?.lcp != null ? `${(latestMetric.lcp / 1000).toFixed(2)}s` : '—'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">CLS</p>
                <p className="mt-2 font-medium">
                  {latestMetric?.cls != null ? latestMetric.cls.toFixed(3) : '—'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">TBT</p>
                <p className="mt-2 font-medium">
                  {latestMetric?.tbt != null ? `${(latestMetric.tbt / 1000).toFixed(2)}s` : '—'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
              <span>{new Date(site.createdAt).toLocaleDateString()}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">View details</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
