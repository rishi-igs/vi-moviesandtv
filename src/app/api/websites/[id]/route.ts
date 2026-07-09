export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/_lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number.parseInt(params.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const website = await prisma.website.findUnique({
    where: { id },
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
              tti: true,
              tbt: true,
              speedIndex: true,
            },
          },
          categories: {
            select: {
              id: true,
              category: true,
              score: true,
              issues: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  score: true,
                  severity: true,
                  explanation: true,
                  displayValue: true,
                  selector: true,
                  htmlSnippet: true,
                  recommendation: true,
                  documentationUrl: true,
                  estimatedImpact: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 })
  }

  return NextResponse.json(website)
}
