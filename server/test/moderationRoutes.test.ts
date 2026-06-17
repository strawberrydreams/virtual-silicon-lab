import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

const ADMIN_OPTS = { signupsOpen: true, adminEmails: ['ada@example.com'] }
const NON_ADMIN = { email: 'eve@example.com', displayName: 'Eve', password: 'hunter22hunter22' }

function seedChip(db: Database.Database, id: string, slug: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(`owner-${id}`, `${id}@owner.c`, 'Owner', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,?,?)`,
  ).run(id, `owner-${id}`, `proj-${id}`, slug, 'Seed Chip', '{}', '', '', 1, 1, 1)
}

async function signIn(
  app: ReturnType<typeof createTestApp>['app'],
  creds: object,
): Promise<string> {
  const res = await app.request('/api/auth/signup', jsonRequest('POST', creds))
  return sessionCookie(res)
}

describe('moderation routes', () => {
  it('rejects admin endpoints for non-admins with 403', async () => {
    const { app } = createTestApp(Date.now, ADMIN_OPTS)
    const eveCookie = await signIn(app, NON_ADMIN)
    const res = await app.request('/api/admin/reports?status=open', {
      headers: { cookie: eveCookie },
    })
    expect(res.status).toBe(403)
  })

  it('rejects admin endpoints for anonymous callers with 401', async () => {
    const { app } = createTestApp(Date.now, ADMIN_OPTS)
    const res = await app.request('/api/admin/reports?status=open')
    expect(res.status).toBe(401)
  })

  it('allows an admin to read the (empty) report queue', async () => {
    const { app } = createTestApp(Date.now, ADMIN_OPTS)
    const adminCookie = await signIn(app, VALID_SIGNUP)
    const res = await app.request('/api/admin/reports?status=open', {
      headers: { cookie: adminCookie },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { reports: unknown[] }
    expect(body.reports).toEqual([])
  })

  it('requires auth to create a report', async () => {
    const { app } = createTestApp(Date.now, ADMIN_OPTS)
    const res = await app.request('/api/reports', jsonRequest('POST', { publishedChipId: 'x' }))
    expect(res.status).toBe(401)
  })

  it('lets a signed-in user report a chip that then appears in the admin queue', async () => {
    const { app, db } = createTestApp(Date.now, ADMIN_OPTS)
    seedChip(db, 'chip1', 'slug-1')
    const adminCookie = await signIn(app, VALID_SIGNUP)
    const eveCookie = await signIn(app, NON_ADMIN)

    const report = await app.request(
      '/api/reports',
      jsonRequest('POST', { publishedChipId: 'chip1', reason: 'spam' }, eveCookie),
    )
    expect(report.status).toBe(201)

    const queue = await app.request('/api/admin/reports?status=open', {
      headers: { cookie: adminCookie },
    })
    const body = (await queue.json()) as { reports: { chipSlug: string }[] }
    expect(body.reports).toHaveLength(1)
    expect(body.reports[0].chipSlug).toBe('slug-1')
  })

  it('returns 404 when reporting a missing chip', async () => {
    const { app } = createTestApp(Date.now, ADMIN_OPTS)
    const eveCookie = await signIn(app, NON_ADMIN)
    const res = await app.request(
      '/api/reports',
      jsonRequest('POST', { publishedChipId: 'nope' }, eveCookie),
    )
    expect(res.status).toBe(404)
  })

  it('lets an admin hide a chip so it disappears from the gallery', async () => {
    const { app, db } = createTestApp(Date.now, ADMIN_OPTS)
    seedChip(db, 'chip1', 'slug-1')
    const adminCookie = await signIn(app, VALID_SIGNUP)

    const before = await app.request('/api/gallery/slug-1')
    expect(before.status).toBe(200)

    const hide = await app.request(
      '/api/admin/published-chips/chip1/hide',
      jsonRequest('POST', {}, adminCookie),
    )
    expect(hide.status).toBe(200)

    const after = await app.request('/api/gallery/slug-1')
    expect(after.status).toBe(404)
  })

  it('audit-logs admin chip mutations and exposes the audit list', async () => {
    let timestamp = 1_000
    const { app, db } = createTestApp(() => timestamp++, ADMIN_OPTS)
    seedChip(db, 'chip1', 'slug-1')
    const adminCookie = await signIn(app, VALID_SIGNUP)

    await app.request('/api/admin/published-chips/chip1/hide', jsonRequest('POST', {}, adminCookie))
    await app.request('/api/admin/published-chips/chip1/unhide', jsonRequest('POST', {}, adminCookie))

    const audit = await app.request('/api/admin/audit-log', { headers: { cookie: adminCookie } })
    expect(audit.status).toBe(200)
    const body = (await audit.json()) as { entries: { action: string; targetId: string }[] }
    expect(body.entries.map((entry) => entry.action)).toEqual(['unhide_chip', 'hide_chip'])
    expect(body.entries[0].targetId).toBe('chip1')
  })

  it('lets an admin feature and unfeature a chip with audit entries', async () => {
    let timestamp = 1_000
    const { app, db } = createTestApp(() => timestamp++, ADMIN_OPTS)
    seedChip(db, 'chip1', 'slug-1')
    const adminCookie = await signIn(app, VALID_SIGNUP)

    const featured = await app.request('/api/admin/published-chips/chip1/feature', {
      method: 'POST',
      headers: { cookie: adminCookie },
    })
    expect(featured.status).toBe(200)
    expect(
      (
        (await (await app.request('/api/gallery/featured')).json()) as {
          chips: { slug: string }[]
        }
      ).chips,
    ).toEqual([expect.objectContaining({ slug: 'slug-1' })])

    const unfeatured = await app.request('/api/admin/published-chips/chip1/unfeature', {
      method: 'POST',
      headers: { cookie: adminCookie },
    })
    expect(unfeatured.status).toBe(200)
    expect(
      ((await (await app.request('/api/gallery/featured')).json()) as { chips: unknown[] }).chips,
    ).toEqual([])

    const audit = (await (
      await app.request('/api/admin/audit-log', { headers: { cookie: adminCookie } })
    ).json()) as { entries: { action: string; targetId: string }[] }
    expect(audit.entries.map((entry) => entry.action)).toEqual(['unfeature_chip', 'feature_chip'])
  })

  it('ban endpoint revokes sessions and audit-logs the action', async () => {
    const { app, db } = createTestApp(() => 1_000, ADMIN_OPTS)
    const adminCookie = await signIn(app, VALID_SIGNUP)
    const userCookie = await signIn(app, NON_ADMIN)
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(NON_ADMIN.email) as {
      id: string
    }

    const banned = await app.request(
      `/api/admin/users/${user.id}/ban`,
      jsonRequest('POST', { reason: 'spam' }, adminCookie),
    )

    expect(banned.status).toBe(200)
    expect((await app.request('/api/me', { headers: { cookie: userCookie } })).status).toBe(401)
    const audit = (await (
      await app.request('/api/admin/audit-log', { headers: { cookie: adminCookie } })
    ).json()) as { entries: { action: string; targetId: string; detail: string | null }[] }
    expect(audit.entries[0]).toMatchObject({
      action: 'ban_user',
      targetId: user.id,
      detail: 'spam',
    })

    const unbanned = await app.request(`/api/admin/users/${user.id}/unban`, {
      method: 'POST',
      headers: { cookie: adminCookie },
    })
    expect(unbanned.status).toBe(200)
  })

  it('lets admins hide a reported comment and removes it from public comments', async () => {
    const { app, db } = createTestApp(() => 1_000, ADMIN_OPTS)
    seedChip(db, 'chip1', 'slug-1')
    const adminCookie = await signIn(app, VALID_SIGNUP)
    const eveCookie = await signIn(app, NON_ADMIN)
    const created = await app.request(
      '/api/published-chips/chip1/comments',
      jsonRequest('POST', { body: 'bad comment' }, eveCookie),
    )
    const comment = ((await created.json()) as { comment: { id: string } }).comment
    const report = await app.request(
      '/api/reports',
      jsonRequest('POST', { commentId: comment.id, reason: 'abuse' }, eveCookie),
    )
    expect(report.status).toBe(201)

    const queue = (await (
      await app.request('/api/admin/comment-reports', { headers: { cookie: adminCookie } })
    ).json()) as { reports: { commentId: string; commentBody: string }[] }
    expect(queue.reports).toEqual([
      expect.objectContaining({ commentId: comment.id, commentBody: 'bad comment' }),
    ])

    const hide = await app.request(`/api/admin/comments/${comment.id}/hide`, {
      method: 'POST',
      headers: { cookie: adminCookie },
    })
    expect(hide.status).toBe(200)
    const comments = (await (await app.request('/api/published-chips/chip1/comments')).json()) as {
      comments: unknown[]
    }
    expect(comments.comments).toEqual([])
  })
})
