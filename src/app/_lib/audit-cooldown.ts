const COOLDOWN_MS = 5 * 60 * 1000

export function shouldSkipAudit(cache: Map<string, number>, url: string, now: number): boolean {
  const normalizedUrl = url.trim()
  const lastRun = cache.get(normalizedUrl)

  if (lastRun && now - lastRun < COOLDOWN_MS) {
    return true
  }

  cache.set(normalizedUrl, now)
  return false
}

export { COOLDOWN_MS }
