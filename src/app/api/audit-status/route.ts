export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getInFlightAudits } from '@/app/_lib/audit-queue'

export async function GET() {
  return NextResponse.json({ inFlight: getInFlightAudits() })
}
