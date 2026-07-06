(function () {
  let lastUrl = location.href

  function notify() {
    const url = location.href
    if (url === lastUrl) return
    lastUrl = url
    try {
      chrome.runtime.sendMessage({ type: 'spa-navigate', url })
    } catch (e) {
      // ignore
    }
  }

  // Monkey-patch history methods
  const _pushState = history.pushState
  history.pushState = function () {
    _pushState.apply(this, arguments)
    notify()
  }

  const _replaceState = history.replaceState
  history.replaceState = function () {
    _replaceState.apply(this, arguments)
    notify()
  }

  window.addEventListener('popstate', notify)
  window.addEventListener('hashchange', notify)

  // Also observe DOM mutations that may indicate navigation in some frameworks
  const observer = new MutationObserver(() => notify())
  observer.observe(document, { childList: true, subtree: true })

  // Poll for URL changes in case navigation occurs outside normal browser events
  const intervalId = setInterval(notify, 1000)

  // initial notify in case content script loads after navigation
  notify()

  window.addEventListener('beforeunload', () => clearInterval(intervalId))
})()
