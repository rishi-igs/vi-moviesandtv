import fs from 'fs'
import os from 'os'
import path from 'path'
import lighthouse from 'lighthouse'
import type { LighthouseResult } from './types'
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

  // Launch Chromium via Playwright with a remote debugging port
  const args = [
    `--remote-debugging-port=${port}`,
    '--no-sandbox',
    '--disable-gpu',
    '--no-first-run',
    '--disable-extensions',
    '--disable-sync',
  ]

  let browserServer: any
  try {
    browserServer = await chromium.launchServer({ args, headless: true })

    const result = await lighthouse(url, {
      logLevel: 'info',
      output: 'json',
      port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    })

    if (!result?.lhr) throw new Error('Lighthouse returned no result')

    const { lhr } = result

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
