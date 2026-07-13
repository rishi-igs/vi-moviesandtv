export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/_lib/prisma'

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get('brand')

  const where = brand && brand !== 'all'
    ? { brand }
    : {}

  const websites = await prisma.website.findMany({
    where,
    select: {
      id: true,
      url: true,
      title: true,
      brand: true,
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
