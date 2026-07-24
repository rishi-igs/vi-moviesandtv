export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/app/_lib/prisma'

export async function GET() {
  const websites = await prisma.website.findMany({
    select: {
      id: true,
      url: true,
      title: true,
      createdAt: true,
      audits: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          performanceScore: true,
          accessibilityScore: true,
          bestPracticesScore: true,
          seoScore: true,
          createdAt: true,
          concurrentAudits: true,
          metrics: {
            take: 1,
            select: {
              fcp: true,
              lcp: true,
              cls: true,
              tbt: true,
              speedIndex: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(websites)
}
