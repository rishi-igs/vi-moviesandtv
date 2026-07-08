export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runAuditForUrl } from '@/app/_lib/run-audit'
import {
  getCurrentBatch,
  isBatchActive,
  startBatch,
  updateBatchItem,
  markBatchComplete,
} from '@/app/_lib/audit-batch'

export async function GET() {
  return NextResponse.json({ batch: getCurrentBatch() })
}

export async function POST(request: NextRequest) {
  const { urls } = await request.json()

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'urls must be a non-empty array' }, { status: 400 })
  }

  if (isBatchActive()) {
    return NextResponse.json(
      { error: 'A batch is already running', batch: getCurrentBatch() },
      { status: 409 }
    )
  }

  const cleaned = [...new Set(urls.map((u: string) => String(u).trim()).filter(Boolean))]
  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'urls must be a non-empty array' }, { status: 400 })
  }

  const batch = startBatch(cleaned)

  // Fire-and-forget: this keeps running in the Node process after the
  // response is sent, regardless of whether the client stays connected.
  ;(async () => {
    for (let i = 0; i < batch.items.length; i++) {
      updateBatchItem(batch.id, i, { status: 'running' })
      const outcome = await runAuditForUrl(batch.items[i].url)
      if (outcome.status === 'done') {
        updateBatchItem(batch.id, i, { status: 'done', message: 'Audited' })
      } else if (outcome.status === 'skipped') {
        updateBatchItem(batch.id, i, { status: 'skipped', message: outcome.message })
      } else {
        updateBatchItem(batch.id, i, { status: 'error', message: outcome.error })
      }
    }
    markBatchComplete(batch.id)
  })()

  return NextResponse.json({ batch })
}
