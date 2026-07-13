(function () {
  const STORAGE_KEY = 'lighthouse-brand-filter'
  let currentBrand = localStorage.getItem(STORAGE_KEY) || 'all'

  function syncBrand() {
    const brand = localStorage.getItem(STORAGE_KEY) || 'all'
    if (brand === currentBrand) return
    currentBrand = brand
    try {
      chrome.runtime.sendMessage({ type: 'set-brand', brand })
    } catch (e) {
      // ignore
    }
  }

  syncBrand()

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) syncBrand()
  })

  const intervalId = setInterval(syncBrand, 2000)

  window.addEventListener('beforeunload', () => clearInterval(intervalId))
})()
