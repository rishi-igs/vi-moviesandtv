export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/app/_lib/prisma'

// Fetched lazily (on hover), not embedded in the polled list endpoints —
// diagnostics are only relevant to whichever cell the user is looking at,
// and keeping them out of /api/websites and /api/audits keeps those cheap
// to poll every few seconds.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid audit id' }, { status: 400 })
  }

  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { diagnostics: true },
  })

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  return NextResponse.json({ diagnostics: audit.diagnostics ?? null })
}
