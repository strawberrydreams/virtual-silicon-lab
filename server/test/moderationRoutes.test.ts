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
})
