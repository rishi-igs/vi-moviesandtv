import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipAudit } from '../src/app/_lib/audit-cooldown.ts'

test('skips repeated requests for the same URL within the cooldown window', () => {
  const cache = new Map<string, number>()
  const now = 1_700_000_000_000

  assert.equal(shouldSkipAudit(cache, 'https://example.com/page-a', now), false)
  assert.equal(shouldSkipAudit(cache, 'https://example.com/page-a', now + 60_000), true)
})

test('allows different URLs to be audited during the same cooldown window', () => {
  const cache = new Map<string, number>()
  const now = 1_700_000_000_000

  assert.equal(shouldSkipAudit(cache, 'https://example.com/page-a', now), false)
  assert.equal(shouldSkipAudit(cache, 'https://example.com/page-b', now + 60_000), false)
})
