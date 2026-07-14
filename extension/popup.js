const API_BASE = 'http://localhost:3000'

const toggle = document.getElementById('toggle')
const statusText = document.getElementById('statusText')
const listEl = document.getElementById('list')
const lastErrorEl = document.getElementById('lastError')
const brandOptions = document.getElementById('brandOptions')

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

async function fetchActiveBrand() {
  try {
    const res = await fetch(`${API_BASE}/api/active-brand`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      return data.brand || 'all'
    }
  } catch (e) {}
  return 'all'
}

async function setActiveBrand(brand) {
  try {
    await fetch(`${API_BASE}/api/active-brand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (e) {}
}

function updateBrandUI(active) {
  const btns = brandOptions.querySelectorAll('.brand-btn')
  btns.forEach((btn) => {
    const brand = btn.dataset.brand
    btn.classList.toggle('is-active', brand === active)
  })
}

brandOptions.addEventListener('click', async (e) => {
  const btn = e.target.closest('.brand-btn')
  if (!btn) return
  const brand = btn.dataset.brand
  updateBrandUI(brand)
  await setActiveBrand(brand)
})

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-reaudit]')
  if (!btn) return
  const url = btn.dataset.reaudit
  chrome.runtime.sendMessage({ type: 'manual-audit', url, bypassCooldown: true })
})

fetchActiveBrand().then((brand) => updateBrandUI(brand))

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
