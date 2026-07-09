import { fork, ChildProcess } from 'child_process'
import path from 'path'
import type { LighthouseResult } from '@/app/_types'

// Bounded concurrency: at most AUDIT_POOL_SIZE Lighthouse audits run at once,
// each in its own persistent worker process (scripts/audit-worker.js), each
// with its own warm Chrome instance reused across jobs (avoids the ~2-5s
// cold-launch cost on every single audit). Lighthouse relies on
// process-global performance.mark()/measure() calls internally, so two
// audits in the SAME process corrupt each other's timing marks — giving each
// concurrent audit its own process avoids that entirely.
//
// Trade-off: more parallel audits means more CPU/RAM contention between the
// concurrent headless Chrome instances, which can make the CPU-timing-based
// metrics (TBT, Speed Index) noisier than running fully serialized. Tune via
// AUDIT_POOL_SIZE in .env — default is 1 (fully serialized, most accurate).
//
// Caveat: if the Next.js dev server process is killed forcefully (e.g. a
// tree-kill-less taskkill on Windows) rather than exiting normally, these
// worker processes (and their warm Chrome instances) can be left running as
// orphans. Check for stray node/chrome processes if that happens.
const POOL_SIZE = Math.max(1, Number(process.env.AUDIT_POOL_SIZE) || 1)

type PooledResult = LighthouseResult & {
  // How many audits (including this one) were running at once, sampled at
  // both the start and end of this run and taking the higher of the two.
  // 1 = ran alone. 2+ = ran under CPU contention; its CPU-timing metrics
  // (TBT, Speed Index, performance score) may be noisier than a solo run.
  concurrentAudits: number
}

type PendingJob = {
  resolve: (result: PooledResult) => void
  reject: (err: Error) => void
  concurrentAtStart: number
}

type WorkerHandle = {
  proc: ChildProcess
  busy: boolean
  ready: boolean
}

type QueuedJob = {
  url: string
  resolve: (result: PooledResult) => void
  reject: (err: Error) => void
}

const globalForPool = globalThis as unknown as {
  auditWorkers?: WorkerHandle[]
  auditPendingJobs?: Map<string, PendingJob>
  auditJobQueue?: QueuedJob[]
  auditJobCounter?: number
}

if (!globalForPool.auditWorkers) globalForPool.auditWorkers = []
if (!globalForPool.auditPendingJobs) globalForPool.auditPendingJobs = new Map()
if (!globalForPool.auditJobQueue) globalForPool.auditJobQueue = []
if (globalForPool.auditJobCounter == null) globalForPool.auditJobCounter = 0

function busyCount(): number {
  return globalForPool.auditWorkers!.filter(w => w.busy).length
}

function spawnWorker(): WorkerHandle {
  const workerPath = path.join(process.cwd(), 'scripts', 'audit-worker.js')
  const proc = fork(workerPath, [], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] })
  const handle: WorkerHandle = { proc, busy: false, ready: false }

  proc.on('message', (msg: { ready?: boolean; id?: string; ok?: boolean; result?: LighthouseResult; error?: string }) => {
    if (msg && msg.ready) {
      handle.ready = true
      dispatchNext()
      return
    }
    if (msg && msg.id) {
      const pending = globalForPool.auditPendingJobs!.get(msg.id)
      if (!pending) return
      globalForPool.auditPendingJobs!.delete(msg.id)
      const concurrentAtEnd = busyCount() // still includes this worker; busy cleared just below
      handle.busy = false
      const concurrentAudits = Math.max(pending.concurrentAtStart, concurrentAtEnd)
      if (msg.ok && msg.result) pending.resolve({ ...msg.result, concurrentAudits })
      else pending.reject(new Error(msg.error || 'Audit worker failed'))
      dispatchNext()
    }
  })

  proc.on('exit', () => {
    const idx = globalForPool.auditWorkers!.indexOf(handle)
    if (idx !== -1) globalForPool.auditWorkers!.splice(idx, 1)
    // Replace it so the pool stays at POOL_SIZE, unless we're just shrinking
    // down from a stale worker count left over from a previous hot-reload.
    if (globalForPool.auditWorkers!.length < POOL_SIZE) {
      globalForPool.auditWorkers!.push(spawnWorker())
    }
  })

  return handle
}

function ensurePool(): void {
  while (globalForPool.auditWorkers!.length < POOL_SIZE) {
    globalForPool.auditWorkers!.push(spawnWorker())
  }
}

function dispatchNext(): void {
  const queue = globalForPool.auditJobQueue!
  if (queue.length === 0) return
  const idleWorker = globalForPool.auditWorkers!.find(w => w.ready && !w.busy)
  if (!idleWorker) return

  const job = queue.shift()!
  idleWorker.busy = true
  const concurrentAtStart = busyCount() // includes idleWorker, just marked busy
  const id = String(++globalForPool.auditJobCounter!)
  globalForPool.auditPendingJobs!.set(id, { resolve: job.resolve, reject: job.reject, concurrentAtStart })
  idleWorker.proc.send({ id, url: job.url })
}

export function runInPool(url: string): Promise<PooledResult> {
  ensurePool()
  return new Promise((resolve, reject) => {
    globalForPool.auditJobQueue!.push({ url, resolve, reject })
    dispatchNext()
  })
}
