'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ScoreCard from '@/app/_components/ScoreCard'

interface Metric {
  fcp: number | null
  lcp: number | null
  cls: number | null
  tbt: number | null
  speedIndex: number | null
}

interface Audit {
  id: number
  performanceScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  seoScore: number | null
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

export default function WebsiteDetail() {
  const params = useParams()
  const [website, setWebsite] = useState<Website | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/websites/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setWebsite)
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <p className="text-center py-10 text-gray-400">Loading...</p>
  if (!website) return <p className="text-center py-10 text-red-500">Website not found</p>

  const latest = website.audits[0]
  const latestMetric = latest?.metrics?.[0]

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <Link href="/" className="text-sky-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5">
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start xl:gap-10">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Website Details</p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">
              {website.title || website.url}
            </h1>
            <p className="mt-3 text-sm text-slate-500 break-all">{website.url}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-2xl bg-slate-100 px-3 py-2">Created {new Date(website.createdAt).toLocaleDateString()}</span>
              <span className="rounded-2xl bg-slate-100 px-3 py-2">Total audits {website.audits.length}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ScoreCard label="Performance" score={latest?.performanceScore ?? null} />
            <ScoreCard label="Accessibility" score={latest?.accessibilityScore ?? null} />
            <ScoreCard label="Best Practices" score={latest?.bestPracticesScore ?? null} />
            <ScoreCard label="SEO" score={latest?.seoScore ?? null} />
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Core Web Vitals</h2>
              <p className="mt-1 text-sm text-slate-500">Key page performance metrics for this site.</p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5">
              Latest audit score {latest?.performanceScore ?? '—'}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-3xl bg-white p-4 text-center shadow-sm shadow-slate-900/5">
              <p className="text-sm text-slate-500">FCP</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {latestMetric?.fcp != null ? `${(latestMetric.fcp / 1000).toFixed(2)}s` : '—'}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-center shadow-sm shadow-slate-900/5">
              <p className="text-sm text-slate-500">LCP</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {latestMetric?.lcp != null ? `${(latestMetric.lcp / 1000).toFixed(2)}s` : '—'}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-center shadow-sm shadow-slate-900/5">
              <p className="text-sm text-slate-500">CLS</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {latestMetric?.cls != null ? latestMetric.cls.toFixed(3) : '—'}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-center shadow-sm shadow-slate-900/5">
              <p className="text-sm text-slate-500">TBT</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {latestMetric?.tbt != null ? `${(latestMetric.tbt / 1000).toFixed(2)}s` : '—'}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 text-center shadow-sm shadow-slate-900/5">
              <p className="text-sm text-slate-500">Page Load</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">
                {latestMetric?.speedIndex != null ? `${(latestMetric.speedIndex / 1000).toFixed(2)}s` : '—'}
              </p>
            </div>
          </div>
        </div>

        {website.audits.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Audit History</h2>
                <p className="text-sm text-slate-500">Latest audits with score summary.</p>
              </div>
            </div>
            <div className="space-y-3">
              {website.audits.map((audit) => (
                <div
                  key={audit.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{new Date(audit.createdAt).toLocaleString()}</p>
                      <p className="mt-1 text-sm text-slate-700">
                        Score: <span className="font-semibold">{audit.performanceScore ?? '—'}</span> / <span className="font-semibold">{audit.accessibilityScore ?? '—'}</span> / <span className="font-semibold">{audit.bestPracticesScore ?? '—'}</span> / <span className="font-semibold">{audit.seoScore ?? '—'}</span>
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      audit.performanceScore === null
                        ? 'bg-slate-100 text-slate-600'
                        : audit.performanceScore >= 90
                        ? 'bg-emerald-100 text-emerald-700'
                        : audit.performanceScore >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {audit.performanceScore === null ? 'Failed' : 'Completed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
