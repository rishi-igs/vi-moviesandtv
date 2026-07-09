import { spawn } from 'child_process'
import path from 'path'
import type { LighthouseResult } from '@/app/_types'

// Bounded concurrency: at most AUDIT_POOL_SIZE Lighthouse audits run at once,
// each in its own Node child process (scripts/audit-worker.js). Lighthouse
// relies on process-global performance.mark()/measure() calls internally, so
// two audits in the SAME process corrupt each other's timing marks — giving
// each concurrent audit its own process avoids that entirely, unlike just
// running multiple Chrome tabs in one process.
//
// Trade-off: more parallel audits means more CPU/RAM contention between the
// concurrent headless Chrome instances, which can make the CPU-timing-based
// metrics (TBT, Speed Index) noisier than running fully serialized. Tune via
// AUDIT_POOL_SIZE in .env — start low (2-3) and raise it only if the machine
// has headroom.
const POOL_SIZE = Math.max(1, Number(process.env.AUDIT_POOL_SIZE) || 2)

const globalForPool = globalThis as unknown as {
  auditPoolActive?: number
  auditPoolWaiters?: (() => void)[]
}
if (globalForPool.auditPoolActive == null) globalForPool.auditPoolActive = 0
if (!globalForPool.auditPoolWaiters) globalForPool.auditPoolWaiters = []

function acquireSlot(): Promise<void> {
  if (globalForPool.auditPoolActive! < POOL_SIZE) {
    globalForPool.auditPoolActive!++
    return Promise.resolve()
  }
  return new Promise(resolve => globalForPool.auditPoolWaiters!.push(resolve))
}

function releaseSlot(): void {
  globalForPool.auditPoolActive!--
  const next = globalForPool.auditPoolWaiters!.shift()
  if (next) {
    globalForPool.auditPoolActive!++
    next()
  }
}

function runWorker(url: string): Promise<LighthouseResult> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(process.cwd(), 'scripts', 'audit-worker.js')
    const child = spawn(process.execPath, [workerPath, url])

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => (stdout += d))
    child.stderr.on('data', d => (stderr += d))

    child.on('close', () => {
      try {
        const parsed = JSON.parse(stdout.trim())
        if (parsed.ok) resolve(parsed.result as LighthouseResult)
        else reject(new Error(parsed.error || 'Audit worker failed'))
      } catch {
        reject(new Error(stderr.trim() || 'Audit worker produced no output'))
      }
    })
    child.on('error', reject)
  })
}

export type PooledResult = LighthouseResult & {
  // How many audits (including this one) were running at once, sampled at
  // both the start and end of this run and taking the higher of the two.
  // 1 = ran alone. 2+ = ran under CPU contention; its CPU-timing metrics
  // (TBT, Speed Index, performance score) may be noisier than a solo run.
  concurrentAudits: number
}

export async function runInPool(url: string): Promise<PooledResult> {
  await acquireSlot()
  const concurrentAtStart = globalForPool.auditPoolActive!
  try {
    const result = await runWorker(url)
    const concurrentAtEnd = globalForPool.auditPoolActive!
    return { ...result, concurrentAudits: Math.max(concurrentAtStart, concurrentAtEnd) }
  } finally {
    releaseSlot()
  }
}
