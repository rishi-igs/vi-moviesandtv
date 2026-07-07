// Serializes Lighthouse runs across the whole server process. Lighthouse relies on
// global (per-process) performance.mark()/measure() calls internally, so two audits
// running concurrently corrupt each other's timing marks and crash with:
//   "The \"start lh:runner:gather\" performance mark has not been set"
// Queuing them one at a time avoids that, and avoids concurrent runs skewing each
// other's CPU-timing-based metrics (TBT, Speed Index, etc.).
let tail: Promise<unknown> = Promise.resolve()

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = tail.then(task, task)
  tail = result.then(
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
const inFlightWebsiteIds = new Set<number>()

export function tryStartAudit(websiteId: number): boolean {
  if (inFlightWebsiteIds.has(websiteId)) return false
  inFlightWebsiteIds.add(websiteId)
  return true
}

export function finishAudit(websiteId: number): void {
  inFlightWebsiteIds.delete(websiteId)
}
