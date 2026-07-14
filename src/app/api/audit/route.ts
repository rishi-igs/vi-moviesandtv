export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runAuditForUrl } from '@/app/_lib/run-audit'

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

  const outcome = await runAuditForUrl(url)

  if (outcome.status === 'error') {
    return NextResponse.json({ error: outcome.error }, { status: outcome.httpStatus, headers: corsHeaders })
  }
  if (outcome.status === 'skipped') {
    return NextResponse.json(
      { message: outcome.message, website: outcome.website },
      { headers: corsHeaders }
    )
  }
  return NextResponse.json({ website: outcome.website, audit: outcome.audit }, { headers: corsHeaders })
}
