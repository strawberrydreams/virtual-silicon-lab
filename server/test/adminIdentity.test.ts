import { describe, expect, it } from 'vitest'
import { isAdminEmail } from '../src/moderation/adminAuth'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

describe('isAdminEmail', () => {
  it('matches case-insensitively and rejects non-admins', () => {
    const admins = ['ada@example.com']
    expect(isAdminEmail('Ada@Example.com', admins)).toBe(true)
    expect(isAdminEmail('eve@example.com', admins)).toBe(false)
  })
})

describe('GET /api/me isAdmin', () => {
  it('returns isAdmin true for an admin email', async () => {
    const admin = createTestApp(Date.now, { signupsOpen: true, adminEmails: ['ada@example.com'] })
    const signup = await admin.app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)
    const me = await admin.app.request('/api/me', { headers: { cookie } })
    const body = (await me.json()) as { isAdmin: boolean }
    expect(body.isAdmin).toBe(true)
  })

  it('returns isAdmin false when the email is not an admin', async () => {
    const app = createTestApp(Date.now, { signupsOpen: true, adminEmails: [] })
    const signup = await app.app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const me = await app.app.request('/api/me', { headers: { cookie: sessionCookie(signup) } })
    const body = (await me.json()) as { isAdmin: boolean }
    expect(body.isAdmin).toBe(false)
  })
})
