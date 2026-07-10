export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runAuditForUrl } from '@/app/_lib/run-audit'

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
