const toggle = document.getElementById('toggle')
const statusText = document.getElementById('statusText')
const listEl = document.getElementById('list')
const lastErrorEl = document.getElementById('lastError')

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

chrome.storage.local.get(['enabled', 'recentAudits'], ({ enabled, recentAudits }) => {
  toggle.checked = enabled !== false
  statusText.textContent = enabled !== false
    ? 'Auto-audit is enabled'
    : 'Auto-audit is paused'
  renderAudits(recentAudits)
  // load last error
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

toggle.addEventListener('change', () => {
  const enabled = toggle.checked
  chrome.storage.local.set({ enabled })
  statusText.textContent = enabled
    ? 'Auto-audit is enabled'
    : 'Auto-audit is paused'
})

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.recentAudits) renderAudits(changes.recentAudits.newValue)
  if (changes.enabled) {
    const enabled = changes.enabled.newValue
    toggle.checked = enabled !== false
    statusText.textContent = enabled !== false
      ? 'Auto-audit is enabled'
      : 'Auto-audit is paused'
  }
  if (changes.lastError) {
    const lastError = changes.lastError.newValue
    if (lastError && lastError.msg) {
      lastErrorEl.style.display = 'block'
      const time = new Date(lastError.time).toLocaleTimeString()
      lastErrorEl.textContent = `${time} — ${lastError.msg}`
    } else {
      lastErrorEl.style.display = 'none'
    }
  }
})
