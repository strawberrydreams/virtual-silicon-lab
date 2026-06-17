import { describe, expect, it } from 'vitest'
import { createRateLimiter } from '../src/rateLimit'

describe('createRateLimiter', () => {
  it('prunes stale buckets during checks', () => {
    let now = 1_000
    const limiter = createRateLimiter({ windowMs: 1_000, max: 10 }, () => now)

    limiter.check('a')
    limiter.check('b')
    expect(limiter.size()).toBe(2)

    now = 2_001
    limiter.check('c')

    expect(limiter.size()).toBe(1)
  })
})
