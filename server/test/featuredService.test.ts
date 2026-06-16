import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { listFeaturedChips, setFeatured } from '../src/publish/service'

function setupDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('owner', 'owner@example.com', 'Owner', 'hash', 0, 0)
  for (const chip of [
    { id: 'visible-old', isPublic: 1, status: 'visible' },
    { id: 'visible-new', isPublic: 1, status: 'visible' },
    { id: 'private', isPublic: 0, status: 'visible' },
    { id: 'hidden', isPublic: 1, status: 'hidden' },
  ]) {
    db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
       VALUES (?, 'owner', ?, ?, ?, '{}', '', '', ?, ?, 1, 1, 1)`,
    ).run(chip.id, `project-${chip.id}`, `slug-${chip.id}`, chip.id, chip.isPublic, chip.status)
  }
  return db
}

describe('featured chip service', () => {
  it('sets, clears, filters, and orders featured chips', () => {
    const db = setupDb()

    expect(setFeatured(db, 'visible-old', true, () => 1_000)).toBe(true)
    expect(setFeatured(db, 'visible-new', true, () => 2_000)).toBe(true)
    expect(setFeatured(db, 'private', true, () => 3_000)).toBe(true)
    expect(setFeatured(db, 'hidden', true, () => 4_000)).toBe(true)
    expect(setFeatured(db, 'missing', true, () => 5_000)).toBe(false)

    expect(listFeaturedChips(db).map((chip) => chip.id)).toEqual(['visible-new', 'visible-old'])

    expect(setFeatured(db, 'visible-new', false, () => 6_000)).toBe(true)
    expect(listFeaturedChips(db).map((chip) => chip.id)).toEqual(['visible-old'])
  })
})
