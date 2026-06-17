import { describe, expect, it } from 'vitest'
import { FakeEmailProvider } from '../src/email/provider'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

function tokenFrom(text: string): string {
  const match = text.match(/token=([A-Za-z0-9_-]+)/)
  if (match === null) throw new Error(`no token in: ${text}`)
  return match[1]
}

describe('password reset', () => {
  it('is enumeration-safe and resets a password once', async () => {
    const emailProvider = new FakeEmailProvider()
    const { app, db } = createTestApp(() => 1_000, { emailProvider })
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const oldCookie = sessionCookie(signup)
    emailProvider.sent = []

    const known = await app.request(
      '/api/auth/forgot-password',
      jsonRequest('POST', { email: VALID_SIGNUP.email }),
    )
    const unknown = await app.request(
      '/api/auth/forgot-password',
      jsonRequest('POST', { email: 'ghost@example.com' }),
    )
    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(emailProvider.sent).toHaveLength(1)
    const token = tokenFrom(emailProvider.sent[0].text)

    const reset = await app.request(
      '/api/auth/reset-password',
      jsonRequest('POST', { token, newPassword: 'new-password-123' }),
    )
    expect(reset.status).toBe(200)
    expect((await app.request('/api/me', { headers: { cookie: oldCookie } })).status).toBe(401)

    const login = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: 'new-password-123' }),
    )
    expect(login.status).toBe(200)
    expect(db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens').get()).toEqual({ n: 0 })

    const reused = await app.request(
      '/api/auth/reset-password',
      jsonRequest('POST', { token, newPassword: 'another-password-123' }),
    )
    expect(reused.status).toBe(400)
  })
})
