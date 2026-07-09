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
        select: {
          id: true,
          status: true,
          error: true,
          performanceScore: true,
          accessibilityScore: true,
          bestPracticesScore: true,
          seoScore: true,
          createdAt: true,
          metrics: {
            take: 1,
            select: {
              fcp: true,
              lcp: true,
              cls: true,
              tbt: true,
              speedIndex: true,
              tti: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(websites)
}
