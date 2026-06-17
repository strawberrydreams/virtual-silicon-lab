import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, VALID_SIGNUP } from './helpers'

describe('signup access gate', () => {
  it('rejects signup with 403 when access mode is closed', async () => {
    const { app } = createTestApp(Date.now, { accessMode: 'closed' })
    const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('SIGNUPS_CLOSED')
  })

  it('allows signup without an invite when access mode is open', async () => {
    const { app } = createTestApp(Date.now, { accessMode: 'open' })
    const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    expect(res.status).toBe(201)
  })

  it('reports accessMode on the health endpoint', async () => {
    const { app } = createTestApp(Date.now, { accessMode: 'invite' })
    const res = await app.request('/api/health')
    const body = (await res.json()) as { accessMode: string }
    expect(body.accessMode).toBe('invite')
  })

  it('requires a valid invite code in invite mode and records the redeemed code', async () => {
    const { app, db } = createTestApp(() => 1000, {
      accessMode: 'invite',
      adminEmails: ['admin@test.com'],
    })
    db.prepare('INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .run('admin', 'admin@test.com', 'Admin', 'hash', 0, 0)
    db.prepare(
      'INSERT INTO invite_codes (code, created_by, max_uses, used_count, expires_at, note, created_at) VALUES (?,?,?,?,?,?,?)',
    ).run('INVITEABC234', 'admin', 1, 0, null, null, 0)

    const noCode = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    expect(noCode.status).toBe(400)
    expect(((await noCode.json()) as { error: { code: string } }).error.code).toBe('INVALID_INVITE')

    const ok = await app.request(
      '/api/auth/signup',
      jsonRequest('POST', { ...VALID_SIGNUP, inviteCode: 'INVITEABC234' }),
    )
    expect(ok.status).toBe(201)
    expect(
      (
        db
          .prepare('SELECT used_count FROM invite_codes WHERE code = ?')
          .get('INVITEABC234') as { used_count: number }
      ).used_count,
    ).toBe(1)
    expect(
      (
        db
          .prepare('SELECT invited_via_code FROM users WHERE email = ?')
          .get(VALID_SIGNUP.email) as { invited_via_code: string | null }
      ).invited_via_code,
    ).toBe('INVITEABC234')

    const exhausted = await app.request(
      '/api/auth/signup',
      jsonRequest('POST', {
        email: 'grace@example.com',
        displayName: 'Grace',
        password: VALID_SIGNUP.password,
        inviteCode: 'INVITEABC234',
      }),
    )
    expect(exhausted.status).toBe(400)
  })
})
