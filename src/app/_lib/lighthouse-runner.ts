import fs from 'fs'
import os from 'os'
import path from 'path'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import type { LighthouseAuditIssue, LighthouseCategoryBreakdown, LighthouseResult } from '@/app/_types'
import { extractDiagnostics } from '@/app/_lib/lighthouse-diagnostics'
import http from 'http'
import https from 'https'

const USER_DATA_DIR_PREFIX = 'lighthouse-user-data-'

function createUserDataDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), USER_DATA_DIR_PREFIX))
}

async function killChromeInstance(chrome: chromeLauncher.LaunchedChrome): Promise<void> {
  try {
    if (typeof chrome.kill === 'function') {
      await chrome.kill()
      return
    }
  } catch (error) {
    console.warn('ChromeLauncher.kill failed, falling back to process.kill:', error)
  }

  try {
    chrome.process?.kill('SIGKILL')
  } catch (fallbackError) {
    console.warn('Fallback chrome.process.kill failed:', fallbackError)
  }
}

export async function runLighthouseAudit(url: string): Promise<LighthouseResult> {
  const userDataDir = createUserDataDir()
  // Ensure URL includes a protocol. Default to http:// if missing.
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`
  }

  // Quick reachability check to provide clearer errors for interstitial pages
  // (e.g. chrome-error://chromewebdata/) before launching Chrome.
  async function checkReachable(targetUrl: string) {
    return new Promise<void>((resolve, reject) => {
      try {
        const parsed = new URL(targetUrl)
        const mod = parsed.protocol === 'https:' ? https : http
        const req = mod.request({ method: 'HEAD', host: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname || '/' }, (res) => {
          if (res.statusCode && res.statusCode < 400) return resolve()
          return reject(new Error(`URL not reachable, status ${res.statusCode}`))
        })
        req.setTimeout(5000, () => {
          req.destroy()
          reject(new Error('URL reachability check timed out'))
        })
        req.on('error', (err) => reject(err))
        req.end()
      } catch (err) {
        reject(err)
      }
    })
  }

  try {
    await checkReachable(url)
  } catch (err) {
    console.warn('Lighthouse pre-check: target URL unreachable:', err)
    // proceed anyway; Lighthouse will surface the browser interstitial if present
  }
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

  try {
    const result = await lighthouse(url, {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    }, {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
        throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
      },
    })

    if (!result?.lhr) {
      throw new Error('Lighthouse returned no result')
    }

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
  } catch (error) {
    console.error('Lighthouse runner error:', error)
    throw error
  } finally {
    try {
      await killChromeInstance(chrome)
    } catch (cleanupError) {
      console.warn('Lighthouse cleanup error:', cleanupError)
    }

    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.warn('Failed to remove Chrome user data dir:', cleanupError)
    }
  }
}
