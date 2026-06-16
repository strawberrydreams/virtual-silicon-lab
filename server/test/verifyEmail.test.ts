import { describe, expect, it } from 'vitest'
import { FakeEmailProvider } from '../src/email/provider'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

function tokenFrom(text: string): string {
  const match = text.match(/token=([A-Za-z0-9_-]+)/)
  if (match === null) throw new Error(`no token in: ${text}`)
  return match[1]
}

describe('email verification', () => {
  it('sends a verification email on signup and consumes the token once', async () => {
    const emailProvider = new FakeEmailProvider()
    const { app, db } = createTestApp(() => 1_000, { emailProvider, publicBaseUrl: 'https://vsl.test' })

    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    expect(signup.status).toBe(201)
    expect(emailProvider.sent).toHaveLength(1)
    expect(emailProvider.sent[0].to).toBe('ada@example.com')
    const token = tokenFrom(emailProvider.sent[0].text)

    const verify = await app.request('/api/auth/verify-email', jsonRequest('POST', { token }))
    expect(verify.status).toBe(200)
    const row = db.prepare('SELECT email_verified_at FROM users WHERE email = ?').get('ada@example.com') as {
      email_verified_at: number | null
    }
    expect(row.email_verified_at).toBe(1_000)

    const reused = await app.request('/api/auth/verify-email', jsonRequest('POST', { token }))
    expect(reused.status).toBe(400)
    expect(((await reused.json()) as { error: { code: string } }).error.code).toBe('INVALID_TOKEN')

    const me = await app.request('/api/me', { headers: { cookie: sessionCookie(signup) } })
    expect(((await me.json()) as { user: { emailVerified: boolean } }).user.emailVerified).toBe(true)
  })
})
