export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const API_KEY = process.env.AI_API_KEY
const MODEL = 'gpt-4o-mini'

function summarizeRows(rows: any[]) {
  if (!rows?.length) return 'No audit rows available.'

  return rows
    .map((row, index) => {
      const audit = row.audit || {}
      const metric = row.metric || {}
      const fcp = metric.fcp != null ? `${(metric.fcp / 1000).toFixed(2)}s` : '—'
      const lcp = metric.lcp != null ? `${(metric.lcp / 1000).toFixed(2)}s` : '—'
      const tbt = metric.tbt != null ? `${Math.round(metric.tbt)}ms` : '—'
      const cls = metric.cls != null ? metric.cls.toFixed(3) : '—'
      const speedIndex = metric.speedIndex != null ? `${(metric.speedIndex / 1000).toFixed(2)}s` : '—'
      const pageLoad = metric.tti != null ? `${(metric.tti / 1000).toFixed(2)}s` : '—'
      const issueSummary = (row.categories || [])
        .map((category: any) => {
          const issues = (category.issues || []).slice(0, 4).map((issue: any) => `${issue.title} (${issue.severity || 'info'})`).join('; ')
          return `${category.category}: score=${category.score ?? '—'}; issues=${issues || 'none'}`
        })
        .join(' | ')

      return `${index + 1}. ${row.url} | performance=${audit.performanceScore ?? '—'} | accessibility=${audit.accessibilityScore ?? '—'} | bestPractices=${audit.bestPracticesScore ?? '—'} | seo=${audit.seoScore ?? '—'} | fcp=${fcp} | lcp=${lcp} | tbt=${tbt} | cls=${cls} | speedIndex=${speedIndex} | pageLoad=${pageLoad} | issues=${issueSummary}`
    })
    .join('\n')
}

function getMetricValue(row: any, metricKey: string) {
  const audit = row?.audit || {}
  const metric = row?.metric || {}

  const map: Record<string, number | null> = {
    performance: audit.performanceScore ?? null,
    accessibility: audit.accessibilityScore ?? null,
    'best practices': audit.bestPracticesScore ?? null,
    seo: audit.seoScore ?? null,
    fcp: metric.fcp ?? null,
    lcp: metric.lcp ?? null,
    tbt: metric.tbt ?? null,
    cls: metric.cls ?? null,
    'speed index': metric.speedIndex ?? null,
    'page load': metric.tti ?? null,
  }

  return map[metricKey] ?? null
}

function formatMetricValue(metricKey: string, value: number | null) {
  if (value == null) return '—'
  if (['fcp', 'lcp', 'speed index', 'page load'].includes(metricKey)) return `${(value / 1000).toFixed(2)}s`
  if (metricKey === 'tbt') return `${Math.round(value)}ms`
  if (metricKey === 'cls') return value.toFixed(3)
  return `${value}`
}

function getMetricKey(question: string) {
  const normalized = question.toLowerCase()
  if (normalized.includes('accessibility')) return 'accessibility'
  if (normalized.includes('best practice')) return 'best practices'
  if (normalized.includes('seo')) return 'seo'
  if (normalized.includes('fcp')) return 'fcp'
  if (normalized.includes('lcp')) return 'lcp'
  if (normalized.includes('tbt')) return 'tbt'
  if (normalized.includes('cls')) return 'cls'
  if (normalized.includes('speed index')) return 'speed index'
  if (normalized.includes('page load')) return 'page load'
  if (normalized.includes('performance')) return 'performance'
  return 'performance'
}

function extractMetrics(question: string) {
  const normalized = question.toLowerCase()
  const metrics: string[] = []

  if (normalized.includes('accessibility')) metrics.push('accessibility')
  if (normalized.includes('best practice')) metrics.push('best practices')
  if (normalized.includes('seo')) metrics.push('seo')
  if (normalized.includes('performance')) metrics.push('performance')
  if (normalized.includes('fcp')) metrics.push('fcp')
  if (normalized.includes('lcp')) metrics.push('lcp')
  if (normalized.includes('tbt')) metrics.push('tbt')
  if (normalized.includes('cls')) metrics.push('cls')
  if (normalized.includes('speed index')) metrics.push('speed index')
  if (normalized.includes('page load')) metrics.push('page load')

  return metrics.length ? metrics : ['performance']
}

function extractLimit(question: string) {
  const normalized = question.toLowerCase()
  const topMatch = /top\s*(\d+)/.exec(normalized)
  if (topMatch) return Number(topMatch[1])
  const threeMatch = /(3|three)\s+urls?/.exec(normalized)
  if (threeMatch) return 3
  return 3
}

function getComparisonScore(row: any, metrics: string[]) {
  let total = 0
  let count = 0

  metrics.forEach((metricKey) => {
    const value = getMetricValue(row, metricKey)
    if (value == null) return

    const lowerBetter = ['fcp', 'lcp', 'tbt', 'cls', 'speed index', 'page load']
    total += lowerBetter.includes(metricKey) ? -Number(value) : Number(value)
    count += 1
  })

  return count > 0 ? total / count : Number.NEGATIVE_INFINITY
}

function buildComparisonAnswer(question: string, rows: any[]) {
  const metrics = extractMetrics(question)
  const limit = extractLimit(question)
  const rowsWithData = rows.filter((row) => row?.url)

  if (!rowsWithData.length) {
    return 'No audit data is currently available to answer that question.'
  }

  const ranked = rowsWithData
    .map((row) => ({ row, score: getComparisonScore(row, metrics) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score)

  const topRows = ranked.slice(0, Math.min(limit, ranked.length))

  if (!topRows.length) {
    return 'I do not have enough comparison data to rank the URLs.'
  }

  const metricLabel = metrics.join(' and ')
  const details = topRows.map((entry, index) => {
    const values = metrics.map((metricKey) => `${metricKey}: ${formatMetricValue(metricKey, getMetricValue(entry.row, metricKey))}`).join(', ')
    return `${index + 1}. ${entry.row.url} — ${values}`
  }).join(' | ')

  return `Here are the top ${topRows.length} URLs for ${metricLabel}: ${details}`
}

function generateDataAnswer(question: string, rows: any[]) {
  const normalized = question.toLowerCase()
  const rowsWithData = rows.filter((row) => row?.url)

  if (!rowsWithData.length) {
    return 'No audit data is currently available to answer that question.'
  }

  if (normalized.includes('compare') || normalized.includes('comparison')) {
    return buildComparisonAnswer(question, rowsWithData)
  }

  if (normalized.includes('average') || normalized.includes('avg')) {
    const metricKey = getMetricKey(question)
    const values = rowsWithData
      .map((row) => getMetricValue(row, metricKey))
      .filter((value): value is number => value != null)

    if (!values.length) return `I do not have enough ${metricKey} values to calculate an average.`
    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    return `The average ${metricKey} across ${rowsWithData.length} URLs is ${formatMetricValue(metricKey, average)}.`
  }

  if (normalized.includes('best') || normalized.includes('highest') || normalized.includes('top')) {
    const metricKey = getMetricKey(question)
    const ranked = rowsWithData
      .map((row) => ({ row, value: getMetricValue(row, metricKey) }))
      .filter((entry) => entry.value != null)
      .sort((a, b) => {
        if (['fcp', 'lcp', 'tbt', 'cls', 'speed index', 'page load'].includes(metricKey)) {
          return (a.value as number) - (b.value as number)
        }
        return (b.value as number) - (a.value as number)
      })

    if (!ranked.length) return `I do not have enough ${metricKey} values to identify the best result.`
    const best = ranked[0]
    return `${best.row.url} has the best ${metricKey} result at ${formatMetricValue(metricKey, best.value)}.`
  }

  if (normalized.includes('worst') || normalized.includes('lowest') || normalized.includes('slowest')) {
    const metricKey = getMetricKey(question)
    const ranked = rowsWithData
      .map((row) => ({ row, value: getMetricValue(row, metricKey) }))
      .filter((entry) => entry.value != null)
      .sort((a, b) => {
        if (['fcp', 'lcp', 'tbt', 'cls', 'speed index', 'page load'].includes(metricKey)) {
          return (b.value as number) - (a.value as number)
        }
        return (a.value as number) - (b.value as number)
      })

    if (!ranked.length) return `I do not have enough ${metricKey} values to identify the worst result.`
    const worst = ranked[0]
    return `${worst.row.url} has the weakest ${metricKey} result at ${formatMetricValue(metricKey, worst.value)}.`
  }

  const firstRow = rowsWithData[0]
  return `I can answer based on the current dashboard data. For example, ${firstRow.url} currently shows performance ${firstRow.audit?.performanceScore ?? '—'}, accessibility ${firstRow.audit?.accessibilityScore ?? '—'}, and page load ${formatMetricValue('page load', firstRow.metric?.tti ?? null)}.`
}

export async function POST(request: Request) {
  try {
    const { question, rows } = await request.json()

    const fallbackAnswer = generateDataAnswer(question, rows || [])

    const prompt = `You are a Lighthouse analysis assistant. Explain the issue breakdowns in plain English, prioritize the most impactful fixes, and reference the category details from the provided audit data. Do not use outside knowledge.\n\nUser question: ${question}\n\nAudit data:\n${summarizeRows(rows || [])}\n\nRespond concisely and clearly, citing the most relevant issues and suggested fixes.`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You answer using only the provided audit data.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const answer = data.choices?.[0]?.message?.content?.trim()
        if (answer) return NextResponse.json({ answer })
      }
    } catch {
      // fall through to the deterministic data-based answer below
    }

    return NextResponse.json({ answer: fallbackAnswer })
  } catch {
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 })
  }
}
