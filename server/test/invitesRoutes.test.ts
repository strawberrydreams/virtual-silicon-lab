import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie } from './helpers'

async function signup(app: ReturnType<typeof createTestApp>['app'], email: string) {
  const res = await app.request(
    '/api/auth/signup',
    jsonRequest('POST', {
      email,
      displayName: email.split('@')[0],
      password: 'hunter22hunter22',
    }),
  )
  return sessionCookie(res)
}

describe('admin invite-code routes', () => {
  it('admin creates, lists, and revokes invite codes', async () => {
    const { app } = createTestApp(() => 1000, {
      accessMode: 'open',
      adminEmails: ['admin@test.com'],
    })
    const adminCookie = await signup(app, 'admin@test.com')
    const userCookie = await signup(app, 'user@test.com')

    expect(
      (
        await app.request(
          '/api/admin/invite-codes',
          jsonRequest('POST', { maxUses: 2, note: 'beta' }, userCookie),
        )
      ).status,
    ).toBe(403)

    const created = await app.request(
      '/api/admin/invite-codes',
      jsonRequest('POST', { maxUses: 2, note: 'beta' }, adminCookie),
    )
    expect(created.status).toBe(201)
    const code = ((await created.json()) as { inviteCode: { code: string; note: string | null } })
      .inviteCode
    expect(code.code).toMatch(/^[A-Z2-7]{12}$/)
    expect(code.note).toBe('beta')

    const list = await app.request('/api/admin/invite-codes', { headers: { cookie: adminCookie } })
    expect(list.status).toBe(200)
    expect(((await list.json()) as { inviteCodes: { code: string }[] }).inviteCodes).toEqual([
      expect.objectContaining({ code: code.code }),
    ])

    expect(
      (await app.request(`/api/admin/invite-codes/${code.code}`, { method: 'DELETE' })).status,
    ).toBe(401)
    expect(
      (
        await app.request(`/api/admin/invite-codes/${code.code}`, {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        })
      ).status,
    ).toBe(204)
  })
})
