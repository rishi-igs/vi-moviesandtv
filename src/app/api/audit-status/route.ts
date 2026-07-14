export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getInFlightAudits } from '@/app/_lib/audit-queue'
import { detectBrand } from '@/app/_lib/brand'

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get('brand')
  const inFlight = getInFlightAudits().filter(
    (entry) => !brand || brand === 'all' || detectBrand(entry.url) === brand,
  )
  return NextResponse.json({ inFlight })
}
