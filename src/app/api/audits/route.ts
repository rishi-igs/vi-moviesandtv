export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/app/_lib/prisma'

export async function GET() {
  const audits = await prisma.audit.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      websiteId: true,
      performanceScore: true,
      accessibilityScore: true,
      bestPracticesScore: true,
      seoScore: true,
      createdAt: true,
      concurrentAudits: true,
      website: { select: { url: true } },
      metrics: {
        take: 1,
        select: { fcp: true, lcp: true, cls: true, tbt: true, speedIndex: true },
      },
    },
  })

  return NextResponse.json(audits)
}
