import { describe, expect, it } from 'vitest'
import { SESSION_TTL_MS } from '../src/accounts/service'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

describe('login and session', () => {
  it('logs in with correct credentials and serves /api/me', async () => {
    const { app } = createTestApp()
    await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))

    const login = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: 'ADA@example.com', password: VALID_SIGNUP.password }),
    )
    expect(login.status).toBe(200)

    const me = await app.request('/api/me', { headers: { cookie: sessionCookie(login) } })
    expect(me.status).toBe(200)
    const body = (await me.json()) as { user: { email: string; displayName: string } }
    expect(body.user.email).toBe('ada@example.com')
    expect(body.user.displayName).toBe('Ada')
  })

  it('rejects a wrong password and an unknown email with the same 401', async () => {
    const { app } = createTestApp()
    await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))

    const wrongPassword = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: 'totally-wrong-pass' }),
    )
    const unknownEmail = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: 'ghost@example.com', password: VALID_SIGNUP.password }),
    )
    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    const a = (await wrongPassword.json()) as { error: { code: string } }
    const b = (await unknownEmail.json()) as { error: { code: string } }
    expect(a.error.code).toBe('INVALID_CREDENTIALS')
    expect(b.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('returns 401 from /api/me without a cookie or with a tampered cookie', async () => {
    const { app } = createTestApp()
    expect((await app.request('/api/me')).status).toBe(401)
    const forged = await app.request('/api/me', {
      headers: { cookie: 'vsl_session=forged-token.forged-signature' },
    })
    expect(forged.status).toBe(401)
  })

  it('expires sessions after the TTL and deletes the row lazily', async () => {
    let t = 1_000
    const { app, db } = createTestApp(() => t)
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)

    t += SESSION_TTL_MS - 1
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(200)

    t += 2
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(401)
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 })
  })
})
