export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/_lib/prisma'
import { runLighthouseAudit as runLighthouseDefault } from '@/app/_lib/lighthouse-runner'

const USE_PLAYWRIGHT = process.env.USE_PLAYWRIGHT === '1'

async function runLighthousePlaywright(url: string) {
  const module = await import('@/app/_lib/playwright-runner')
  return module.runLighthouseAudit(url)
}

const COOLDOWN_MS = 5 * 60 * 1000

// Lighthouse relies on global `performance.mark`/`measure` calls internally,
// so running two audits concurrently in the same Node process corrupts each
// other's timing marks (surfaces as errors like "lh:runner:gather mark has
// not been set"). Serialize actual Lighthouse runs through this queue while
// still letting each HTTP request respond immediately.
let auditQueue: Promise<unknown> = Promise.resolve()

function enqueueAudit<T>(task: () => Promise<T>): Promise<T> {
  const result = auditQueue.then(task, task)
  auditQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400, headers: corsHeaders })
  }

  let auditUrl: URL
  try {
    auditUrl = new URL(url)
  } catch {
    try {
      auditUrl = new URL(`https://${url}`)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400, headers: corsHeaders })
    }
  }

  const normalizedUrl = auditUrl.toString()
  let website = await prisma.website.findUnique({ where: { url: normalizedUrl } })
  if (!website) {
    try {
      website = await prisma.website.create({ data: { url: normalizedUrl, title: normalizedUrl } })
    } catch (err) {
      if ((err as { code?: string })?.code !== 'P2002') throw err
      website = await prisma.website.findUnique({ where: { url: normalizedUrl } })
    }
  }
  if (!website) {
    return NextResponse.json({ error: 'Failed to create website' }, { status: 500, headers: corsHeaders })
  }

  const lastAudit = await prisma.audit.findFirst({
    where: { websiteId: website.id },
    orderBy: { createdAt: 'desc' },
  })

  if (lastAudit && Date.now() - new Date(lastAudit.createdAt).getTime() < COOLDOWN_MS) {
    return NextResponse.json(
      { message: 'Skipped — recently audited', website, audit: lastAudit },
      { headers: corsHeaders }
    )
  }

  // Create the pending row and respond immediately so the caller's HTTP round
  // trip stays fast — the Lighthouse run itself can take 10-60s and must not
  // block the response (a slow response here is what let earlier-visited
  // pages get dropped when the caller navigated away before it finished).
  const audit = await prisma.audit.create({
    data: { websiteId: website.id, status: 'pending' },
  })

  void runAuditInBackground(website, normalizedUrl, audit.id)

  return NextResponse.json({ website, audit }, { status: 202, headers: corsHeaders })
}

async function runAuditInBackground(
  website: { id: number; url: string; title: string | null },
  normalizedUrl: string,
  auditId: number
) {
  try {
    const result = await enqueueAudit(() =>
      USE_PLAYWRIGHT ? runLighthousePlaywright(normalizedUrl) : runLighthouseDefault(normalizedUrl)
    )

    await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: 'complete',
        performanceScore: result.performance,
        accessibilityScore: result.accessibility,
        bestPracticesScore: result.bestPractices,
        seoScore: result.seo,
        error: null,
        metrics: {
          create: {
            fcp: result.fcp,
            lcp: result.lcp,
            cls: result.cls,
            tbt: result.tbt,
            speedIndex: result.speedIndex,
            tti: result.tti,
          },
        },
      },
    })

    if (website.title === website.url) {
      await prisma.website.update({
        where: { id: website.id },
        data: { title: normalizedUrl },
      })
    }
  } catch (err) {
    console.error(`Background audit failed for ${normalizedUrl} (audit #${auditId}):`, err)
    try {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' },
      })
    } catch (updateErr) {
      console.error(`Failed to persist failure for audit #${auditId}:`, updateErr)
    }
  }
}
