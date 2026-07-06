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
    <div className="space-y-3">
      {websites.map((site) => {
        const lastAudit = site.audits[0]
        const latestMetric = lastAudit?.metrics?.[0]
        return (
          <Link
            key={site.id}
            href={`/websites/${site.id}`}
            className="block bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">
                  {site.title || site.url}
                </p>
                <p className="text-sm text-gray-500 truncate">{site.url}</p>
              </div>
              <div className="ml-4 flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(site.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {lastAudit && (
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        (lastAudit.performanceScore ?? 0) >= 90
                          ? 'text-green-600'
                          : (lastAudit.performanceScore ?? 0) >= 50
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}
                    >
                      {lastAudit.performanceScore ?? '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      FCP {latestMetric?.fcp != null ? `${(latestMetric.fcp / 1000).toFixed(2)}s` : '—'} ·
                      LCP {latestMetric?.lcp != null ? `${(latestMetric.lcp / 1000).toFixed(2)}s` : '—'} ·
                      CLS {latestMetric?.cls != null ? latestMetric.cls.toFixed(3) : '—'} ·
                      TBT {latestMetric?.tbt != null ? `${(latestMetric.tbt / 1000).toFixed(2)}s` : '—'} ·
                      PLT {latestMetric?.speedIndex != null ? `${(latestMetric.speedIndex / 1000).toFixed(2)}s` : '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
