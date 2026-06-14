import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

describe('DELETE /api/me', () => {
  it('deletes the account with password confirmation and clears everything', async () => {
    const { app, db } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)

    const res = await app.request('/api/me', jsonRequest('DELETE', { password: VALID_SIGNUP.password }, cookie))
    expect(res.status).toBe(204)
    expect(res.headers.get('set-cookie') ?? '').toMatch(/vsl_session=;|vsl_session=""/)
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 })

    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(401)
    const login = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )
    expect(login.status).toBe(401)
  })

  it('rejects deletion with a wrong password and keeps the account', async () => {
    const { app, db } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)

    const res = await app.request('/api/me', jsonRequest('DELETE', { password: 'not-it-at-all' }, cookie))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('WRONG_PASSWORD')
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 1 })
  })

  it('requires authentication and a password field', async () => {
    const { app } = createTestApp()
    expect((await app.request('/api/me', jsonRequest('DELETE', { password: 'x' }))).status).toBe(401)

    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)
    expect((await app.request('/api/me', jsonRequest('DELETE', {}, cookie))).status).toBe(400)
  })
})
