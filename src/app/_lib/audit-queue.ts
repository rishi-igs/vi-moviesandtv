// Serializes Lighthouse runs across the whole server process. Lighthouse relies on
// global (per-process) performance.mark()/measure() calls internally, so two audits
// running concurrently corrupt each other's timing marks and crash with:
//   "The \"start lh:runner:gather\" performance mark has not been set"
// Queuing them one at a time avoids that, and avoids concurrent runs skewing each
// other's CPU-timing-based metrics (TBT, Speed Index, etc.).
//
// State lives on globalThis (same pattern as _lib/prisma.ts) because Next.js dev
// mode hot-reloads this module on file changes, which would otherwise silently
// reset the queue mid-flight and let two audits briefly run concurrently anyway.
type InFlightEntry = { url: string; startedAt: number }

const globalForAuditQueue = globalThis as unknown as {
  auditQueueTail?: Promise<unknown>
  auditInFlight?: Map<number, InFlightEntry>
}

if (!globalForAuditQueue.auditQueueTail) {
  globalForAuditQueue.auditQueueTail = Promise.resolve()
}
if (!globalForAuditQueue.auditInFlight) {
  globalForAuditQueue.auditInFlight = new Map<number, InFlightEntry>()
}

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const tail = globalForAuditQueue.auditQueueTail!
  const result = tail.then(task, task)
  globalForAuditQueue.auditQueueTail = result.then(
    () => undefined,
    () => undefined
  )
  return result
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
