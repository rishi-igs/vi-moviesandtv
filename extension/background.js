// Shipped default so a fresh install works against the VM with zero setup —
// end users never need to open the popup's "Dashboard server URL" field.
// It's still overridable there (e.g. for local dev against your own machine).
const PRODUCTION_API_BASE = 'http://49.249.95.65:3030'

async function getApiBases() {
  const { apiBaseUrl } = await chrome.storage.local.get('apiBaseUrl')
  if (apiBaseUrl) return [apiBaseUrl.replace(/\/$/, '')]
  return [PRODUCTION_API_BASE]
}
const API_PATHS = ['/api/audit', '/api/audit-legacy']

// Generic tool now — any http(s) page can be audited, so this only rules out
// things that obviously can't be (browser-internal pages, the extension's
// own popup, etc.), not any fixed site list.
function isAuditableUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function postAuditRequest(url) {
  let lastError = null
  const apiBases = await getApiBases()

  for (const base of apiBases) {
    for (const path of API_PATHS) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(60000),
        })

        const text = await res.text()
        let data = null
        try {
          data = JSON.parse(text)
        } catch (parseErr) {
          console.warn(`[Lighthouse] Non-JSON response from ${base}${path} for ${url}: status=${res.status}`, parseErr)
        }

        if (res.ok) {
          return { base, path, res, data, text }
        }

        lastError = new Error(`HTTP ${res.status}`)
        lastError.base = base
        lastError.path = path
        lastError.status = res.status
        lastError.text = text
        console.warn(`[Lighthouse] Audit endpoint ${base}${path} returned ${res.status} for ${url}`)
      } catch (err) {
        lastError = err
        console.warn(`[Lighthouse] Network error to ${base}${path} for ${url}:`, err.message)
      }
    }
  }

  throw lastError || new Error('No audit endpoint available')
}

async function triggerAudit(url, tabId) {
  if (!isAuditableUrl(url)) return

  try {
    const { base, res, data, text } = await postAuditRequest(url)

    if (res.ok) {
      if (data) {
        console.log(`[Lighthouse] Audit queued for ${url} via ${base}`, data)

        chrome.storage.local.get('recentAudits', ({ recentAudits = [] }) => {
          recentAudits.unshift({ url, time: Date.now(), error: null })
          chrome.storage.local.set({ recentAudits: recentAudits.slice(0, 50) })
        })

        chrome.action.setBadgeText({ text: '✓', tabId })
        chrome.action.setBadgeBackgroundColor({ color: '#16a34a', tabId })
      } else {
        const snippet = text.slice(0, 200)
        console.warn(`[Lighthouse] Unexpected non-JSON success response for ${url} via ${base}`, snippet)
        try {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Lighthouse audit: unexpected response',
            message: `${new URL(url).hostname}: Non-JSON response (status ${res.status})`,
          })
        } catch (e) {}
        try {
          chrome.storage.local.set({ lastError: { url, msg: `Non-JSON response (status ${res.status})`, text: snippet, time: Date.now() } })
        } catch (e) {}
        chrome.storage.local.get('recentAudits', ({ recentAudits = [] }) => {
          recentAudits.unshift({ url, time: Date.now(), error: `Non-JSON response (status ${res.status})` })
          chrome.storage.local.set({ recentAudits: recentAudits.slice(0, 50) })
        })
        chrome.action.setBadgeText({ text: '✗', tabId })
        chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId })
      }
    } else {
      const errMsg = (data && data.error) ? data.error : `HTTP ${res.status}`
      console.warn(`[Lighthouse] Audit failed for ${url} via ${base}:`, errMsg)
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Lighthouse audit failed',
          message: `${new URL(url).hostname}: ${errMsg}`,
        })
      } catch (e) {}
      try {
        chrome.storage.local.set({ lastError: { url, msg: errMsg, text: text.slice(0,200), time: Date.now() } })
      } catch (e) {}
      chrome.action.setBadgeText({ text: '✗', tabId })
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId })
      chrome.storage.local.get('recentAudits', ({ recentAudits = [] }) => {
        recentAudits.unshift({ url, time: Date.now(), error: errMsg })
        chrome.storage.local.set({ recentAudits: recentAudits.slice(0, 50) })
      })
    }
  } catch (err) {
    console.warn(`[Lighthouse] Network error for ${url}:`, err?.message || err)
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Lighthouse network error',
        message: `${new URL(url).hostname}: ${err?.message || 'No endpoint responded'}`,
      })
    } catch (e) {}
    try {
      chrome.storage.local.set({ lastError: { url, msg: err?.message || 'No endpoint responded', time: Date.now() } })
    } catch (e) {}

    chrome.action.setBadgeText({ text: '✗', tabId })
    chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId })
  }
}

// Manual only — no auto-audit-on-navigate. The popup sends this after the
// user clicks "Audit Current Page" (or "Re-audit" on a past entry).
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (!message || message.type !== 'manual-audit' || !message.url) return
  if (!isAuditableUrl(message.url)) return
  const tabId = sender?.tab?.id ?? message.tabId
  triggerAudit(message.url, tabId)
})
