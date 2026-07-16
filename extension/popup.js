const toggle = document.getElementById('toggle')
const statusText = document.getElementById('statusText')
const listEl = document.getElementById('list')
const lastErrorEl = document.getElementById('lastError')
const brandOptions = document.getElementById('brandOptions')
const serverInput = document.getElementById('serverInput')
const serverSave = document.getElementById('serverSave')
const serverSaved = document.getElementById('serverSaved')
const dashboardLink = document.getElementById('dashboardLink')

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

function updateBrandButtons(selectedBrand) {
  const buttons = brandOptions.querySelectorAll('.brand-btn')
  buttons.forEach((btn) => {
    const brand = btn.dataset.brand
    btn.classList.toggle('is-active', brand === selectedBrand)
  })
}

function applyDashboardLink(apiBaseUrl) {
  dashboardLink.href = apiBaseUrl || 'http://localhost:3000'
}

chrome.storage.local.get(['enabled', 'recentAudits', 'selectedBrand', 'apiBaseUrl'], ({ enabled, recentAudits, selectedBrand, apiBaseUrl }) => {
  toggle.checked = enabled !== false
  statusText.textContent = enabled !== false
    ? 'Auto-audit is enabled'
    : 'Auto-audit is paused'

  updateBrandButtons(selectedBrand || 'all')

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

toggle.addEventListener('change', () => {
  const enabled = toggle.checked
  chrome.storage.local.set({ enabled })
  statusText.textContent = enabled
    ? 'Auto-audit is enabled'
    : 'Auto-audit is paused'
})

brandOptions.addEventListener('click', (event) => {
  const btn = event.target.closest('.brand-btn')
  if (!btn) return
  const brand = btn.dataset.brand
  chrome.storage.local.set({ selectedBrand: brand })
  updateBrandButtons(brand)
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
  if (changes.recentAudits) renderAudits(changes.recentAudits.newValue)
  if (changes.enabled) {
    const enabled = changes.enabled.newValue
    toggle.checked = enabled !== false
    statusText.textContent = enabled !== false
      ? 'Auto-audit is enabled'
      : 'Auto-audit is paused'
  }
  if (changes.selectedBrand) {
    updateBrandButtons(changes.selectedBrand.newValue || 'all')
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
