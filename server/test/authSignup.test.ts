import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

describe('POST /api/auth/signup', () => {
  it('creates an account, sets a session cookie, and returns the user', async () => {
    const { app, db } = createTestApp(() => 1_000)
    const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))

    expect(res.status).toBe(201)
    const { user } = (await res.json()) as { user: { id: string; email: string; displayName: string; createdAt: number } }
    expect(user.email).toBe('ada@example.com')
    expect(user.displayName).toBe('Ada')
    expect(user.createdAt).toBe(1_000)
    expect(user).not.toHaveProperty('passwordHash')

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('vsl_session=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Path=/')

    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 1 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 1 })
    // The cookie carries the raw token; the DB must only hold a hash of it.
    const token = sessionCookie(res).split('=')[1]
    const row = db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string }
    expect(token).not.toContain(row.token_hash)
  })

  it('sets Secure on the session cookie when secureCookies is enabled', async () => {
    const { app } = createTestApp(() => 1_000, { secureCookies: true })
    const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))

    expect(res.status).toBe(201)
    expect(res.headers.get('set-cookie')).toContain('Secure')
  })

  it('rejects a duplicate email with 409, case-insensitively', async () => {
    const { app } = createTestApp()
    await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const res = await app.request(
      '/api/auth/signup',
      jsonRequest('POST', { ...VALID_SIGNUP, email: 'ADA@example.com', displayName: 'Other' }),
    )
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('EMAIL_TAKEN')
  })

  it('rejects invalid input with 400 and INVALID_INPUT', async () => {
    const { app } = createTestApp()
    const res = await app.request(
      '/api/auth/signup',
      jsonRequest('POST', { email: 'nope', displayName: 'Ada', password: 'hunter22hunter22' }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('rejects a non-JSON body with 400', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/auth/signup', { method: 'POST', body: 'not json' })
    expect(res.status).toBe(400)
  })
})
