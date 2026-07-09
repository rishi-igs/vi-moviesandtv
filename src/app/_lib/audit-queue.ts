// Tracks which websites have an audit currently queued or running, across the
// whole server process. Actual audit execution/concurrency is handled by
// _lib/audit-pool.ts (each audit runs in its own child process, bounded by
// AUDIT_POOL_SIZE); this module is only the per-website dedup guard.
//
// State lives on globalThis (same pattern as _lib/prisma.ts) because Next.js dev
// mode hot-reloads this module on file changes, which would otherwise silently
// reset it mid-flight and let duplicate audits for the same site slip through.
type InFlightEntry = { url: string; startedAt: number }

const globalForAuditQueue = globalThis as unknown as {
  auditInFlight?: Map<number, InFlightEntry>
}

if (!globalForAuditQueue.auditInFlight) {
  globalForAuditQueue.auditInFlight = new Map<number, InFlightEntry>()
}

// Tracks websites with an audit currently queued or running. The cooldown check in
// the audit route reads the last-completed-audit timestamp from the database, which
// leaves a race window: two requests for the same site arriving close together can
// both see "no recent audit" before either has written its result, so both proceed.
// This in-memory guard closes that window by rejecting a second request for the same
// website outright while the first is still in flight.
export function tryStartAudit(websiteId: number, url: string): boolean {
  const inFlight = globalForAuditQueue.auditInFlight!
  if (inFlight.has(websiteId)) return false
  inFlight.set(websiteId, { url, startedAt: Date.now() })
  return true
}

export function finishAudit(websiteId: number): void {
  globalForAuditQueue.auditInFlight!.delete(websiteId)
}

// Server-truth snapshot of what's currently auditing, so the UI can show live
// progress that survives a page refresh instead of relying on client state.
export function getInFlightAudits(): (InFlightEntry & { websiteId: number })[] {
  return [...globalForAuditQueue.auditInFlight!.entries()].map(([websiteId, entry]) => ({
    websiteId,
    ...entry,
  }))
}
