import fs from 'fs'
import os from 'os'
import path from 'path'
import lighthouse from 'lighthouse'
import type { LighthouseAuditIssue, LighthouseCategoryBreakdown, LighthouseResult } from '@/app/_types'
import { extractDiagnostics } from '@/app/_lib/lighthouse-diagnostics'
import { chromium } from 'playwright'
import net from 'net'

const USER_DATA_DIR_PREFIX = 'lighthouse-user-data-'

function createUserDataDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), USER_DATA_DIR_PREFIX))
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, () => {
      // @ts-ignore
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

async function killBrowserServer(server: any) {
  try {
    if (server && typeof server.close === 'function') await server.close()
    else if (server && server.process) server.process.kill('SIGKILL')
  } catch (err) {
    console.warn('Failed to kill Playwright server', err)
  }
}

export async function runLighthouseAudit(url: string): Promise<LighthouseResult> {
  const userDataDir = createUserDataDir()
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`

  const port = await getFreePort()

  const args = [
    `--remote-debugging-port=${port}`,
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
    '--disable-sync',
  ]

  let browserServer: any
  // quick reachability check to avoid launching a browser for interstitial pages
  async function checkReachable(targetUrl: string) {
    return new Promise<void>((resolve, reject) => {
      try {
        const parsed = new URL(targetUrl)
        const mod = parsed.protocol === 'https:' ? require('https') : require('http')
        const req = mod.request({ method: 'HEAD', host: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname || '/' }, (res: any) => {
          if (res.statusCode && res.statusCode < 400) return resolve()
          return reject(new Error(`URL not reachable, status ${res.statusCode}`))
        })
        req.setTimeout(5000, () => {
          req.destroy()
          reject(new Error('URL reachability check timed out'))
        })
        req.on('error', (err: any) => reject(err))
        req.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  try {
    try {
      await checkReachable(url)
    } catch (err) {
      console.warn('Playwright pre-check: target URL unreachable:', err)
      // continue anyway; Lighthouse will surface the browser interstitial if present
    }

    browserServer = await chromium.launchServer({ args, headless: true })

    const result = await lighthouse(url, {
      logLevel: 'info',
      output: 'json',
      port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    }, {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
        throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
      },
    })

    if (!result?.lhr) throw new Error('Lighthouse returned no result')

    const { lhr } = result

    const categories: LighthouseCategoryBreakdown[] = ['performance', 'accessibility', 'best-practices', 'seo'].map((categoryKey) => {
      const category = lhr.categories[categoryKey]
      const issues: LighthouseAuditIssue[] = Object.values(lhr.audits)
        .filter((audit) => audit?.score !== null && audit.score < 1)
        .map((audit) => ({
          id: audit.id,
          title: audit.title || 'Unnamed audit',
          description: audit.description || null,
          score: audit.score != null ? Math.round(audit.score * 100) : null,
          severity: audit.scoreDisplayMode === 'binary' ? 'warning' : 'info',
          explanation: audit.explanation || null,
          displayValue: audit.displayValue || null,
          selector: null,
          htmlSnippet: null,
          recommendation: null,
          documentationUrl: null,
          estimatedImpact: audit.score === null ? 'Low' : audit.score < 0.5 ? 'High' : 'Medium',
          category: categoryKey,
        }))
      return {
        category: categoryKey,
        score: category?.score != null ? Math.round(category.score * 100) : null,
        issues,
      }
    })

    return {
      url,
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
      lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
      fcp: lhr.audits['first-contentful-paint']?.numericValue ?? null,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
      tbt: lhr.audits['total-blocking-time']?.numericValue ?? null,
      speedIndex: lhr.audits['speed-index']?.numericValue ?? null,
      diagnostics: extractDiagnostics(lhr),
    }
  } finally {
    try {
      await killBrowserServer(browserServer)
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch {}
  }
}
