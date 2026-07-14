// Tracks the current bulk-audit batch on the server, so progress survives a
// browser refresh or closed tab — the client submits the URL list once and
// the server drives the whole batch to completion regardless of who's
// watching. Only one batch runs at a time (matches this tool's actual usage:
// a single tester, not concurrent independent batches).
export type BatchItemStatus = 'queued' | 'running' | 'done' | 'skipped' | 'error'
export type BatchItem = { url: string; status: BatchItemStatus; message?: string }
export type Batch = { id: string; items: BatchItem[]; createdAt: number; completedAt?: number }

const globalForBatch = globalThis as unknown as { auditBatch?: Batch }

export function getCurrentBatch(): Batch | null {
  return globalForBatch.auditBatch ?? null
}

export function isBatchActive(): boolean {
  const b = globalForBatch.auditBatch
  if (!b) return false
  return b.items.some(it => it.status === 'queued' || it.status === 'running')
}

export function startBatch(urls: string[]): Batch {
  const batch: Batch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    items: urls.map(url => ({ url, status: 'queued' })),
    createdAt: Date.now(),
  }
  globalForBatch.auditBatch = batch
  return batch
}

export function updateBatchItem(batchId: string, index: number, patch: Partial<BatchItem>): void {
  const b = globalForBatch.auditBatch
  if (!b || b.id !== batchId) return
  b.items[index] = { ...b.items[index], ...patch }
}

export function markBatchComplete(batchId: string): void {
  const b = globalForBatch.auditBatch
  if (!b || b.id !== batchId) return
  b.completedAt = Date.now()
}
