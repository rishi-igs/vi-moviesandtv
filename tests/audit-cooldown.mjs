import assert from 'node:assert/strict'
import { shouldSkipAudit } from '../src/app/_lib/audit-cooldown.ts'

const cache = new Map()
const now = 1_700_000_000_000
assert.equal(shouldSkipAudit(cache, 'https://example.com/page-a', now), false)
assert.equal(shouldSkipAudit(cache, 'https://example.com/page-a', now + 60_000), true)
assert.equal(shouldSkipAudit(cache, 'https://example.com/page-b', now + 60_000), false)
console.log('audit-cooldown checks passed')
