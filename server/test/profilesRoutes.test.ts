import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'
import { getProfileByHandle, setHandle } from '../src/profiles/service'

const PNG = 'data:image/png;base64,AAAA'

function seedUser(db: Database.Database, id: string, handle: string | null = null) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, handle, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
  ).run(id, `${id}@example.com`, id.toUpperCase(), 'hash', handle, 0, 0)
}

function seedChip(
  db: Database.Database,
  input: { id: string; owner: string; isPublic: 0 | 1; status: 'visible' | 'hidden' },
) {
  db.prepare(
    `INSERT INTO published_chips
     (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, 0, ?, 0)`,
  ).run(
    input.id,
    input.owner,
    `project-${input.id}`,
    `slug-${input.id}`,
    input.id,
    PNG,
    PNG,
    input.isPublic,
    input.status,
    Number(input.id.replace(/\D/g, '') || 1),
  )
}

describe('profile service and routes', () => {
  it('sets unique handles and returns public visible chips only', () => {
    const { db } = createTestApp()
    seedUser(db, 'u1')
    seedUser(db, 'u2')
    seedChip(db, { id: 'chip1', owner: 'u1', isPublic: 1, status: 'visible' })
    seedChip(db, { id: 'chip2', owner: 'u1', isPublic: 0, status: 'visible' })
    seedChip(db, { id: 'chip3', owner: 'u1', isPublic: 1, status: 'hidden' })

    expect(setHandle(db, 'u1', 'maker')).toBe('ok')
    expect(setHandle(db, 'u2', 'maker')).toBe('taken')
    expect(getProfileByHandle(db, 'maker')).toMatchObject({
      handle: 'maker',
      displayName: 'U1',
      chips: [expect.objectContaining({ slug: 'slug-chip1' })],
    })

    db.prepare('UPDATE users SET banned_at = 1 WHERE id = ?').run('u1')
    expect(getProfileByHandle(db, 'maker')).toBeNull()
  })

  it('lets signed-in users set handles and exposes public profiles', async () => {
    const { app } = createTestApp(Date.now, { signupsOpen: true })
    const cookie = sessionCookie(await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP)))

    const set = await app.request('/api/me/handle', jsonRequest('PATCH', { handle: 'Neon_Maker7' }, cookie))
    expect(set.status).toBe(200)
    expect(((await set.json()) as { user: { handle: string } }).user.handle).toBe('neon_maker7')

    const profile = await app.request('/api/profiles/neon_maker7')
    expect(profile.status).toBe(200)
    expect(((await profile.json()) as { profile: { handle: string } }).profile.handle).toBe(
      'neon_maker7',
    )
  })
})
