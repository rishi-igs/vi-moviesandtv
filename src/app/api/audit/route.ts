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
      { message: 'Skipped — recently audited', website },
      { headers: corsHeaders }
    )
  }

  let audit
  try {
    const result = USE_PLAYWRIGHT
      ? await runLighthousePlaywright(normalizedUrl)
      : await runLighthouseDefault(normalizedUrl)

    audit = await prisma.audit.create({
      data: {
        websiteId: website.id,
        performanceScore: result.performance,
        accessibilityScore: result.accessibility,
        bestPracticesScore: result.bestPractices,
        seoScore: result.seo,
        metrics: {
          create: {
            fcp: result.fcp,
            lcp: result.lcp,
            cls: result.cls,
            tbt: result.tbt,
            speedIndex: result.speedIndex,
          },
        },
      },
      include: { metrics: true },
    })

    if (website?.title === website?.url) {
      await prisma.website.update({
        where: { id: website.id },
        data: { title: normalizedUrl },
      })
    }
  } catch (err) {
    console.error('Audit route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }

  return NextResponse.json({ website, audit }, { headers: corsHeaders })
}
