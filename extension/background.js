const API_BASES = ['http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:3001', 'http://localhost:3000']
const API_PATHS = ['/api/audit', '/api/audit-legacy']
const COOLDOWN_MS = 5 * 60 * 1000 // 5 min between same URL

// Only audit the VI site and its subdomains — host_permissions/content_scripts
// restrict where content scripts run, but NOT what webNavigation events the
// background worker sees, so this check is the real gate against auditing
// whatever else the tester happens to be browsing.
const TARGET_HOST_SUFFIX = 'myvi.in'

function isTargetHost(url) {
  try {
    const hostname = new URL(url).hostname
    return hostname === TARGET_HOST_SUFFIX || hostname.endsWith(`.${TARGET_HOST_SUFFIX}`)
  } catch (e) {
    return false
  }
}


// Ensure the auditing toggle defaults to ON for new installs
function ensureEnabledDefault() {
  chrome.storage.local.get('enabled', ({ enabled }) => {
    if (enabled === undefined) chrome.storage.local.set({ enabled: true })
  })
}

try { chrome.runtime.onStartup.addListener(ensureEnabledDefault) } catch {}
ensureEnabledDefault()

// Update badge based on enabled state
async function updateBadgeForEnabled(enabled) {
  try {
    if (enabled) {
      await chrome.action.setBadgeText({ text: 'ON' })
      await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' })
    } else {
      await chrome.action.setBadgeText({ text: '' })
    }
  } catch (e) {
    // ignore in older browsers
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) updateBadgeForEnabled(changes.enabled.newValue !== false)
})
// initialize badge
chrome.storage.local.get('enabled', ({ enabled }) => updateBadgeForEnabled(enabled !== false))

async function postAuditRequest(url) {
  let lastError = null

  for (const base of API_BASES) {
    for (const path of API_PATHS) {
      try {
        const res = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          // The API call is synchronous — it waits for the full Lighthouse
          // run to finish before responding (15-25s+ typical, longer if
          // AUDIT_POOL_SIZE serializes this behind other in-flight audits).
          // 8s was way too short and aborted every real audit before the
          // server could finish, surfacing as a false "network error".
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
  if (!url || !url.startsWith('http')) return

  try {
    const { base, res, data, text } = await postAuditRequest(url)

    // If request succeeded but returned non-JSON, we still have body text
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
        // Successful status but non-JSON body — record as an error
        const snippet = text.slice(0, 200)
        console.warn(`[Lighthouse] Unexpected non-JSON success response for ${url} via ${base}`, snippet)
        // surface notification and save last error for popup
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

async function shouldAudit(url) {
  const { enabled, auditHistory = {} } = await chrome.storage.local.get([
    'enabled',
    'auditHistory',
  ])

  if (enabled === false) return false

  if (!isTargetHost(url)) return false

  const lastRun = auditHistory[url]
  if (lastRun && Date.now() - lastRun < COOLDOWN_MS) return false

  auditHistory[url] = Date.now()
  await chrome.storage.local.set({ auditHistory })
  return true
}

// Handle manual audits (bypass cooldown optionally)
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (!message || !message.type) return
  if (message.type === 'manual-audit' && message.url) {
    const tabId = sender?.tab?.id
    if (!isTargetHost(message.url)) return
    if (message.bypassCooldown) {
      // update auditHistory to allow immediate run
      const { auditHistory = {} } = await chrome.storage.local.get('auditHistory')
      delete auditHistory[message.url]
      await chrome.storage.local.set({ auditHistory })
      triggerAudit(message.url, tabId)
      return
    }
    if (await shouldAudit(message.url)) triggerAudit(message.url, tabId)
    return
  }
})

async function onTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (!tab.url.startsWith('http')) return
  if (tab.url.startsWith('http://localhost') || tab.url.startsWith('http://127.0.0.1')) return

  if (await shouldAudit(tab.url)) {
    triggerAudit(tab.url, tabId)
  }
}

async function handleNavigation(url, tabId) {
  if (!url || !url.startsWith('http')) return
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) return

  if (await shouldAudit(url)) {
    triggerAudit(url, tabId)
  }
}

async function onNavigationCompleted(details) {
  if (details.frameId !== 0) return
  await handleNavigation(details.url, details.tabId)
}

async function onNavigationCommitted(details) {
  if (details.frameId !== 0) return
  await handleNavigation(details.url, details.tabId)
}

chrome.tabs.onUpdated.addListener(onTabUpdated)
chrome.webNavigation.onCompleted.addListener(onNavigationCompleted)
chrome.webNavigation.onHistoryStateUpdated.addListener(onNavigationCompleted)
chrome.webNavigation.onCommitted.addListener(onNavigationCommitted)
chrome.webNavigation.onReferenceFragmentUpdated.addListener(onNavigationCompleted)

// Listen for SPA navigation messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (!message || message.type !== 'spa-navigate' || !message.url) return
  const tabId = sender?.tab?.id
  if (message.url.startsWith('http://localhost') || message.url.startsWith('http://127.0.0.1')) return
  await handleNavigation(message.url, tabId)
})
