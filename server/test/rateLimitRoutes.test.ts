import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, VALID_SIGNUP } from './helpers'

describe('mutating API rate limit', () => {
  it('returns 429 after too many requests in the same window', async () => {
    let now = 1_000
    const { app } = createTestApp(() => now, { rateLimit: { windowMs: 1_000, max: 2 } })

    const first = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )
    const second = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )
    const limited = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )

    expect(first.status).toBe(401)
    expect(second.status).toBe(401)
    expect(limited.status).toBe(429)
    expect(limited.headers.get('retry-after')).toBe('1')
    await expect(limited.json()).resolves.toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again soon.' },
    })

    now += 1_001
    const afterWindow = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )
    expect(afterWindow.status).toBe(401)
  })

  it('uses tighter per-endpoint limits for sensitive paths', async () => {
    const { app } = createTestApp(() => 1_000, {
      rateLimit: {
        windowMs: 1_000,
        max: 10,
        overrides: {
          'POST:/api/auth/login': { windowMs: 1_000, max: 1 },
        },
      },
    })

    expect(
      (
        await app.request(
          '/api/auth/login',
          jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
        )
      ).status,
    ).toBe(401)
    expect(
      (
        await app.request(
          '/api/auth/login',
          jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
        )
      ).status,
    ).toBe(429)
  })
})
