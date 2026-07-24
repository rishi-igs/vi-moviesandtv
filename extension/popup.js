const auditBtn = document.getElementById('auditBtn')
const statusText = document.getElementById('statusText')
const listEl = document.getElementById('list')
const lastErrorEl = document.getElementById('lastError')
const serverInput = document.getElementById('serverInput')
const serverSave = document.getElementById('serverSave')
const serverSaved = document.getElementById('serverSaved')
const dashboardLink = document.getElementById('dashboardLink')

const PRODUCTION_API_BASE = 'http://49.249.95.65:3030'

function formatTime(ts) {
  const ago = Math.round((Date.now() - ts) / 1000)
  if (ago < 60) return `${ago}s ago`
  if (ago < 3600) return `${Math.round(ago / 60)}m ago`
  return `${Math.round(ago / 3600)}h ago`
}

function renderAudits(audits) {
  if (!audits || audits.length === 0) {
    listEl.innerHTML = '<div class="empty">No audits yet</div>'
    return
  }

  listEl.innerHTML = audits.slice(0, 15).map((a) => `
    <div class="item">
      <span class="item-url" title="${a.url}">${a.url}</span>
      ${a.error
        ? '<span class="item-error">Failed</span>'
        : '<span class="item-ok">OK</span>'}
      <span class="item-time">${formatTime(a.time)}</span>
      <button data-reaudit="${a.url}" style="margin-left:8px;font-size:11px">Re-audit</button>
    </div>
  `).join('')
}

function applyDashboardLink(apiBaseUrl) {
  dashboardLink.href = apiBaseUrl || PRODUCTION_API_BASE
}

function requestAudit(url, tabId) {
  chrome.runtime.sendMessage({ type: 'manual-audit', url, tabId })
  statusText.textContent = `Auditing ${new URL(url).hostname}…`
}

auditBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.url) return
    requestAudit(tab.url, tab.id)
  })
})

listEl.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-reaudit]')
  if (!btn) return
  requestAudit(btn.dataset.reaudit)
})

chrome.storage.local.get(['recentAudits', 'apiBaseUrl'], ({ recentAudits, apiBaseUrl }) => {
  serverInput.value = apiBaseUrl || ''
  applyDashboardLink(apiBaseUrl)

  renderAudits(recentAudits)

  chrome.storage.local.get('lastError', ({ lastError }) => {
    if (lastError && lastError.msg) {
      lastErrorEl.style.display = 'block'
      const time = new Date(lastError.time).toLocaleTimeString()
      lastErrorEl.textContent = `${time} — ${lastError.msg}`
    } else {
      lastErrorEl.style.display = 'none'
    }
  })
})

serverSave.addEventListener('click', () => {
  const raw = serverInput.value.trim().replace(/\/$/, '')
  const done = () => {
    applyDashboardLink(raw)
    serverSaved.style.display = 'block'
    setTimeout(() => { serverSaved.style.display = 'none' }, 1500)
  }
  if (raw) {
    chrome.storage.local.set({ apiBaseUrl: raw }, done)
  } else {
    chrome.storage.local.remove('apiBaseUrl', done)
  }
})

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.recentAudits) {
    renderAudits(changes.recentAudits.newValue)
    statusText.textContent = ''
  }
  if (changes.lastError) {
    const lastError = changes.lastError.newValue
    if (lastError && lastError.msg) {
      lastErrorEl.style.display = 'block'
      const time = new Date(lastError.time).toLocaleTimeString()
      lastErrorEl.textContent = `${time} — ${lastError.msg}`
      statusText.textContent = ''
    } else {
      lastErrorEl.style.display = 'none'
    }
  }
})
