import type { Prisma } from '@prisma/client'
import { prisma } from '@/app/_lib/prisma'
import { runInPool } from '@/app/_lib/audit-pool'
import { tryStartAudit, finishAudit } from '@/app/_lib/audit-queue'

const COOLDOWN_MS = 5 * 60 * 1000

export type AuditOutcome =
  | { status: 'error'; error: string; httpStatus: number }
  | { status: 'skipped'; message: string; website: unknown }
  | { status: 'done'; website: unknown; audit: unknown }

// Shared by the single-URL /api/audit route and the /api/audit-batch runner,
// so both go through identical validation, cooldown, and dedup logic.
export async function runAuditForUrl(rawUrl: string): Promise<AuditOutcome> {
  let auditUrl: URL
  try {
    auditUrl = new URL(rawUrl)
  } catch {
    try {
      auditUrl = new URL(`https://${rawUrl}`)
    } catch {
      return { status: 'error', error: 'Invalid URL', httpStatus: 400 }
    }
  }

  const normalizedUrl = auditUrl.toString()
  let website = await prisma.website.findUnique({ where: { url: normalizedUrl } })
  if (!website) {
    try {
      website = await prisma.website.create({ data: { url: normalizedUrl, title: normalizedUrl } })
    } catch (err) {
      if ((err as { code?: string })?.code !== 'P2002') throw err
      website = await prisma.website.findUnique({ where: { url: normalizedUrl } })
    }
  }
  if (!website) {
    return { status: 'error', error: 'Failed to create website', httpStatus: 500 }
  }

  const lastAudit = await prisma.audit.findFirst({
    where: { websiteId: website.id },
    orderBy: { createdAt: 'desc' },
  })

  if (lastAudit && Date.now() - new Date(lastAudit.createdAt).getTime() < COOLDOWN_MS) {
    return { status: 'skipped', message: 'Skipped — recently audited', website }
  }

  if (!tryStartAudit(website.id, normalizedUrl)) {
    return { status: 'skipped', message: 'Skipped — audit already in progress', website }
  }

  try {
    const result = await runInPool(normalizedUrl)

    const audit = await prisma.audit.create({
      data: {
        websiteId: website.id,
        performanceScore: result.performance,
        accessibilityScore: result.accessibility,
        bestPracticesScore: result.bestPractices,
        seoScore: result.seo,
        // MetricDiagnostics is a plain, genuinely JSON-serializable object
        // (Record<string, DiagnosticEntry[]>), but TS's structural typing
        // doesn't recognize it as assignable to Prisma's generated
        // InputJsonValue union without this cast — no runtime behavior
        // change, purely satisfies the type checker.
        diagnostics: result.diagnostics as unknown as Prisma.InputJsonValue,
        concurrentAudits: result.concurrentAudits,
        metrics: {
          create: {
            fcp: result.fcp,
            lcp: result.lcp,
            cls: result.cls,
            tbt: result.tbt,
            speedIndex: result.speedIndex,
          },
        },
      },
      include: { metrics: true },
    })

    if (website.title === website.url) {
      await prisma.website.update({ where: { id: website.id }, data: { title: normalizedUrl } })
    }

    return { status: 'done', website, audit }
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      httpStatus: 500,
    }
  } finally {
    finishAudit(website.id)
  }
}
