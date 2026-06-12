import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

describe('POST /api/auth/logout', () => {
  it('deletes the session row, clears the cookie, and invalidates /api/me', async () => {
    const { app, db } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)

    const logout = await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } })
    expect(logout.status).toBe(204)
    expect(logout.headers.get('set-cookie') ?? '').toMatch(/vsl_session=;|vsl_session=""/)
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 })

    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(401)
  })

  it('is idempotent: logging out without a session still returns 204', async () => {
    const { app } = createTestApp()
    expect((await app.request('/api/auth/logout', { method: 'POST' })).status).toBe(204)
  })
})
