import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

const OPTS = { signupsOpen: true, adminEmails: ['ada@example.com'] }

function seedChip(db: Database.Database, id: string, slug: string, hidden = false) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(`owner-${id}`, `${id}@owner.c`, 'Owner', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,0,0)`,
  ).run(id, `owner-${id}`, `proj-${id}`, slug, 'Seed', '{}', '', '', hidden ? 'hidden' : 'visible')
}

async function signIn(
  app: ReturnType<typeof createTestApp>['app'],
  creds: object,
): Promise<string> {
  return sessionCookie(await app.request('/api/auth/signup', jsonRequest('POST', creds)))
}

describe('reactions routes — likes', () => {
  it('requires auth to like', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const res = await app.request('/api/published-chips/c1/like', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('likes and unlikes a visible chip, returning the count', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const cookie = await signIn(app, VALID_SIGNUP)
    const liked = await app.request('/api/published-chips/c1/like', {
      method: 'POST',
      headers: { cookie },
    })
    expect(liked.status).toBe(200)
    expect(await liked.json()).toEqual({ likeCount: 1, likedByMe: true })
    const unliked = await app.request('/api/published-chips/c1/like', {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(await unliked.json()).toEqual({ likeCount: 0, likedByMe: false })
  })

  it('returns 404 when liking a hidden or missing chip', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'hidden1', 'sh', true)
    const cookie = await signIn(app, VALID_SIGNUP)
    expect(
      (
        await app.request('/api/published-chips/hidden1/like', {
          method: 'POST',
          headers: { cookie },
        })
      ).status,
    ).toBe(404)
    expect(
      (await app.request('/api/published-chips/nope/like', { method: 'POST', headers: { cookie } }))
        .status,
    ).toBe(404)
  })
})

describe('reactions routes — comments', () => {
  it('lists comments publicly and requires auth to post', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const list = await app.request('/api/published-chips/c1/comments')
    expect(list.status).toBe(200)
    expect(await list.json()).toEqual({ comments: [] })
    const anon = await app.request(
      '/api/published-chips/c1/comments',
      jsonRequest('POST', { body: 'hi' }),
    )
    expect(anon.status).toBe(401)
  })

  it('rejects empty and over-long comment bodies', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const cookie = await signIn(app, VALID_SIGNUP)
    expect(
      (
        await app.request(
          '/api/published-chips/c1/comments',
          jsonRequest('POST', { body: '' }, cookie),
        )
      ).status,
    ).toBe(400)
    const long = 'x'.repeat(1001)
    expect(
      (
        await app.request(
          '/api/published-chips/c1/comments',
          jsonRequest('POST', { body: long }, cookie),
        )
      ).status,
    ).toBe(400)
  })

  it('creates a comment that appears in the list', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const cookie = await signIn(app, VALID_SIGNUP)
    const created = await app.request(
      '/api/published-chips/c1/comments',
      jsonRequest('POST', { body: 'great chip' }, cookie),
    )
    expect(created.status).toBe(201)
    const list = (await (await app.request('/api/published-chips/c1/comments')).json()) as {
      comments: { body: string }[]
    }
    expect(list.comments).toHaveLength(1)
    expect(list.comments[0].body).toBe('great chip')
  })

  it('lets the author delete, blocks other non-admins (403), allows admin', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const adminCookie = await signIn(app, VALID_SIGNUP) // ada@example.com is admin
    const eveCookie = await signIn(app, {
      email: 'eve@example.com',
      displayName: 'Eve',
      password: 'hunter22hunter22',
    })

    // Eve posts a comment
    const created = await app.request(
      '/api/published-chips/c1/comments',
      jsonRequest('POST', { body: 'mine' }, eveCookie),
    )
    const { comment } = (await created.json()) as { comment: { id: string } }

    // A third non-admin user cannot delete it
    const malCookie = await signIn(app, {
      email: 'mal@example.com',
      displayName: 'Mal',
      password: 'hunter22hunter22',
    })
    expect(
      (
        await app.request(`/api/published-chips/c1/comments/${comment.id}`, {
          method: 'DELETE',
          headers: { cookie: malCookie },
        })
      ).status,
    ).toBe(403)

    // Admin can delete it
    expect(
      (
        await app.request(`/api/published-chips/c1/comments/${comment.id}`, {
          method: 'DELETE',
          headers: { cookie: adminCookie },
        })
      ).status,
    ).toBe(204)
  })

  it('returns 404 commenting on a hidden chip', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'h1', 'sh', true)
    const cookie = await signIn(app, VALID_SIGNUP)
    expect(
      (
        await app.request(
          '/api/published-chips/h1/comments',
          jsonRequest('POST', { body: 'hi' }, cookie),
        )
      ).status,
    ).toBe(404)
    expect((await app.request('/api/published-chips/h1/comments')).status).toBe(404)
  })
})
