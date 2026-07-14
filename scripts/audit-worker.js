// Worker: runs Lighthouse audits against a headless Chrome instance. Spawned
// and kept alive by src/app/_lib/audit-pool.ts (via child_process.fork, one
// per AUDIT_POOL_SIZE slot) so multiple audits can run in isolated processes —
// Lighthouse relies on process-global performance.mark()/measure() calls, so
// two audits in the SAME process corrupt each other's timing.
//
// Chrome is launched ONCE per worker and reused across every job it handles,
// instead of cold-launching a fresh browser per audit (~2-5s saved each time).
// Lighthouse already clears cache/cookies/storage as part of its own run
// (visible in its logs as "Cleaning origin data" / "Cleaning browser cache"),
// so reusing one browser across sequential audits doesn't leak state between
// them.
//
// Two modes:
//   - Persistent (default when forked with an IPC channel): launches Chrome
//     once, then handles {id, url} job messages until told to shut down.
//   - Standalone CLI (`node audit-worker.js <url>`): runs one audit and
//     exits, useful for debugging outside the pool.
//
// Written as plain JS run directly by `node` (no TS/esbuild transform) on
// purpose: running this through esbuild (e.g. via tsx) breaks Lighthouse's
// in-browser benchmark eval — esbuild injects a `__name` helper into the
// compiled output that Lighthouse's own code sends into the browser page to
// run there, where that helper was never defined, causing
// "ReferenceError: __name is not defined". Next.js's bundler (SWC) doesn't
// have this problem, which is why the normal single-audit path is unaffected.
//
// This intentionally duplicates the extraction logic in
// src/app/_lib/lighthouse-runner.ts and lighthouse-diagnostics.ts — keep
// changes to metric/diagnostic extraction in sync across both if they change.
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const https = require('https')
const lighthouse = require('lighthouse').default
const chromeLauncher = require('chrome-launcher')

const METRIC_AUDIT_IDS = {
  fcp: ['first-contentful-paint', 'server-response-time', 'render-blocking-resources', 'font-display'],
  lcp: [
    'largest-contentful-paint',
    'largest-contentful-paint-element',
    'render-blocking-resources',
    'server-response-time',
    'preload-lcp-image',
    'uses-optimized-images',
  ],
  tbt: [
    'total-blocking-time',
    'mainthread-work-breakdown',
    'bootup-time',
    'unused-javascript',
    'third-party-summary',
    'long-tasks',
  ],
  cls: ['cumulative-layout-shift', 'layout-shift-elements', 'non-composited-animations', 'unsized-images'],
  si: ['speed-index', 'render-blocking-resources', 'uses-optimized-images', 'unminified-javascript', 'unminified-css'],
}
const CATEGORY_KEYS = { accessibility: 'accessibility', bestPractices: 'best-practices', seo: 'seo' }
const MAX_CATEGORY_ISSUES = 8

// Self-terminate if idle this long, so a warm Chrome instance doesn't sit
// around forever consuming RAM if the pool goes unused for a while.
const IDLE_SHUTDOWN_MS = 15 * 60 * 1000

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/

function extractLearnMoreUrl(text) {
  const match = (text || '').match(LINK_PATTERN)
  return match ? match[2] : undefined
}

function stripMarkdownLinks(text) {
  return (text || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function extractCategoryIssues(lhr, categoryKey) {
  const category = lhr.categories && lhr.categories[categoryKey]
  const audits = lhr.audits || {}
  if (!category || !category.auditRefs) return []
  const entries = []
  for (const ref of category.auditRefs) {
    const audit = audits[ref.id]
    if (!audit || typeof audit.score !== 'number' || audit.score === 1) continue
    entries.push({
      id: ref.id,
      title: audit.title || ref.id,
      description: stripMarkdownLinks(audit.description),
      score: audit.score,
      displayValue: audit.displayValue || undefined,
      learnMoreUrl: extractLearnMoreUrl(audit.description),
    })
  }
  entries.sort((a, b) => (a.score || 0) - (b.score || 0))
  return entries.slice(0, MAX_CATEGORY_ISSUES)
}

function extractDiagnostics(lhr) {
  const result = {}
  const audits = lhr.audits || {}
  for (const metric of Object.keys(METRIC_AUDIT_IDS)) {
    const entries = []
    for (const id of METRIC_AUDIT_IDS[metric]) {
      const audit = audits[id]
      if (!audit || audit.scoreDisplayMode === 'notApplicable') continue
      entries.push({
        id,
        title: audit.title || id,
        description: stripMarkdownLinks(audit.description),
        score: typeof audit.score === 'number' ? audit.score : null,
        displayValue: audit.displayValue || undefined,
        learnMoreUrl: extractLearnMoreUrl(audit.description),
      })
    }
    result[metric] = entries
  }
  for (const metric of Object.keys(CATEGORY_KEYS)) {
    result[metric] = extractCategoryIssues(lhr, CATEGORY_KEYS[metric])
  }
  return result
}

async function launchChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lighthouse-user-data-'))
  const chrome = await chromeLauncher.launch({
    userDataDir,
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-extensions',
      '--disable-sync',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--no-default-browser-check',
      '--ignore-certificate-errors',
      '--allow-insecure-localhost',
      '--noerrdialogs',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })
  return { chrome, userDataDir }
}

async function killChromeInstance(chrome) {
  try {
    if (typeof chrome.kill === 'function') {
      await chrome.kill()
      return
    }
  } catch (error) {
    console.warn('ChromeLauncher.kill failed, falling back to process.kill:', error)
  }
  try {
    if (chrome.process) chrome.process.kill('SIGKILL')
  } catch (fallbackError) {
    console.warn('Fallback chrome.process.kill failed:', fallbackError)
  }
}

function checkReachable(targetUrl) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl)
      const mod = parsed.protocol === 'https:' ? https : http
      const req = mod.request(
        {
          method: 'HEAD',
          host: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname || '/',
        },
        res => {
          if (res.statusCode && res.statusCode < 400) return resolve()
          return reject(new Error('URL not reachable, status ' + res.statusCode))
        }
      )
      req.setTimeout(5000, () => {
        req.destroy()
        reject(new Error('URL reachability check timed out'))
      })
      req.on('error', err => reject(err))
      req.end()
    } catch (err) {
      reject(err)
    }
  })
}

async function runAuditAgainst(chrome, url) {
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url

  try {
    await checkReachable(url)
  } catch (err) {
    console.warn('Lighthouse pre-check: target URL unreachable:', err)
  }

  const result = await lighthouse(
    url,
    {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    },
    {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
        throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
      },
    }
  )

  if (!result || !result.lhr) throw new Error('Lighthouse returned no result')
  const lhr = result.lhr

  return {
    url,
    performance: Math.round(((lhr.categories.performance && lhr.categories.performance.score) || 0) * 100),
    accessibility: Math.round(((lhr.categories.accessibility && lhr.categories.accessibility.score) || 0) * 100),
    bestPractices: Math.round(((lhr.categories['best-practices'] && lhr.categories['best-practices'].score) || 0) * 100),
    seo: Math.round(((lhr.categories.seo && lhr.categories.seo.score) || 0) * 100),
    lcp: (lhr.audits['largest-contentful-paint'] && lhr.audits['largest-contentful-paint'].numericValue) ?? null,
    fcp: (lhr.audits['first-contentful-paint'] && lhr.audits['first-contentful-paint'].numericValue) ?? null,
    cls: (lhr.audits['cumulative-layout-shift'] && lhr.audits['cumulative-layout-shift'].numericValue) ?? null,
    tbt: (lhr.audits['total-blocking-time'] && lhr.audits['total-blocking-time'].numericValue) ?? null,
    speedIndex: (lhr.audits['speed-index'] && lhr.audits['speed-index'].numericValue) ?? null,
    diagnostics: extractDiagnostics(lhr),
  }
}

async function runPersistentWorker() {
  const { chrome, userDataDir } = await launchChrome()
  let idleTimer = null

  async function shutdown() {
    if (idleTimer) clearTimeout(idleTimer)
    try {
      await killChromeInstance(chrome)
    } catch (err) {
      console.warn('Lighthouse cleanup error:', err)
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch (err) {
      console.warn('Failed to remove Chrome user data dir:', err)
    }
    process.exit(0)
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(shutdown, IDLE_SHUTDOWN_MS)
  }

  process.on('disconnect', shutdown)
  process.on('SIGTERM', shutdown)

  process.on('message', async msg => {
    if (!msg || !msg.id || !msg.url) return
    if (idleTimer) clearTimeout(idleTimer)
    try {
      const result = await runAuditAgainst(chrome, msg.url)
      process.send({ id: msg.id, ok: true, result })
    } catch (err) {
      process.send({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
    resetIdleTimer()
  })

  resetIdleTimer()
  process.send({ ready: true })
}

async function runOnce(url) {
  const { chrome, userDataDir } = await launchChrome()
  try {
    const result = await runAuditAgainst(chrome, url)
    process.stdout.write(JSON.stringify({ ok: true, result }))
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }))
    process.exitCode = 1
  } finally {
    try {
      await killChromeInstance(chrome)
    } catch (err) {
      console.warn('Lighthouse cleanup error:', err)
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch (err) {
      console.warn('Failed to remove Chrome user data dir:', err)
    }
  }
}

const cliUrl = process.argv[2]
if (cliUrl) {
  runOnce(cliUrl)
} else if (process.send) {
  runPersistentWorker()
} else {
  process.stdout.write(JSON.stringify({ ok: false, error: 'Usage: node audit-worker.js <url>, or fork() for persistent mode' }))
  process.exit(1)
}
