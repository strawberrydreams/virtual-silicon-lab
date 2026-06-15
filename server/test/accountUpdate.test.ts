import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

describe('PATCH /api/me', () => {
  it('updates the display name', async () => {
    const { app } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)

    const res = await app.request(
      '/api/me',
      jsonRequest('PATCH', { displayName: ' Lady Lovelace ' }, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: { displayName: string } }
    expect(body.user.displayName).toBe('Lady Lovelace')

    const me = await app.request('/api/me', { headers: { cookie } })
    const meBody = (await me.json()) as { user: { displayName: string } }
    expect(meBody.user.displayName).toBe('Lady Lovelace')
  })

  it('changes the password with the current password and invalidates other sessions', async () => {
    const { app } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const firstCookie = sessionCookie(signup)
    const otherLogin = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )
    const otherCookie = sessionCookie(otherLogin)

    const res = await app.request(
      '/api/me',
      jsonRequest(
        'PATCH',
        { currentPassword: VALID_SIGNUP.password, newPassword: 'new-password-99' },
        firstCookie,
      ),
    )
    expect(res.status).toBe(200)

    // The session that changed the password survives; the other one is revoked.
    expect((await app.request('/api/me', { headers: { cookie: firstCookie } })).status).toBe(200)
    expect((await app.request('/api/me', { headers: { cookie: otherCookie } })).status).toBe(401)

    // Old password no longer works; the new one does.
    const oldLogin = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: VALID_SIGNUP.password }),
    )
    expect(oldLogin.status).toBe(401)
    const newLogin = await app.request(
      '/api/auth/login',
      jsonRequest('POST', { email: VALID_SIGNUP.email, password: 'new-password-99' }),
    )
    expect(newLogin.status).toBe(200)
  })

  it('rejects a password change with a wrong current password', async () => {
    const { app } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)

    const res = await app.request(
      '/api/me',
      jsonRequest(
        'PATCH',
        { currentPassword: 'not-the-password', newPassword: 'new-password-99' },
        cookie,
      ),
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('WRONG_PASSWORD')
  })

  it('rejects invalid display names and unauthenticated requests', async () => {
    const { app } = createTestApp()
    expect((await app.request('/api/me', jsonRequest('PATCH', { displayName: 'X' }))).status).toBe(
      401,
    )

    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)
    const res = await app.request('/api/me', jsonRequest('PATCH', { displayName: '   ' }, cookie))
    expect(res.status).toBe(400)
  })
})
