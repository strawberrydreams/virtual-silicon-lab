import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { listPublicPublishedChips } from '../src/publish/service'

const NOW = 10_000_000_000_000
const WEEK = 7 * 24 * 60 * 60 * 1000
const CUTOFF = NOW - WEEK
const RECENT = NOW - 1000
const OLD = CUTOFF - 1000
const now = () => NOW

function user(db: ReturnType<typeof openDatabase>, id: string) {
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(id, `${id}@b.c`, id, 'h', 0, 0)
}

function chip(db: ReturnType<typeof openDatabase>, id: string, updatedAt: number) {
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,'{}','','',1,'visible',0,?,0)`,
  ).run(id, 'owner', `proj-${id}`, `slug-${id}`, id, updatedAt)
}

function like(db: ReturnType<typeof openDatabase>, chipId: string, userId: string, createdAt: number) {
  db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run(chipId, userId, createdAt)
}

function comment(db: ReturnType<typeof openDatabase>, id: string, chipId: string, userId: string, createdAt: number) {
  db.prepare('INSERT INTO comments (id, published_chip_id, author_user_id, body, created_at) VALUES (?,?,?,?,?)')
    .run(id, chipId, userId, 'comment', createdAt)
}

describe('gallery ranking', () => {
  function seedScenario(db: ReturnType<typeof openDatabase>) {
    user(db, 'owner')
    user(db, 'l1')
    user(db, 'l2')
    user(db, 'l3')
    chip(db, 'A', 1)
    chip(db, 'B', 2)
    chip(db, 'C', 3)
    like(db, 'A', 'l1', RECENT)
    comment(db, 'cm-a', 'A', 'l2', RECENT)
    like(db, 'B', 'l1', OLD)
    like(db, 'B', 'l2', OLD)
    like(db, 'B', 'l3', OLD)
  }

  it('top sorts by all-time engagement, recency tie-break', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedScenario(db)
    expect(listPublicPublishedChips(db, { sort: 'top', now }).map((c) => c.id)).toEqual(['B', 'A', 'C'])
  })

  it('trending sorts by last-7-day engagement, recency tie-break', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedScenario(db)
    expect(listPublicPublishedChips(db, { sort: 'trending', now }).map((c) => c.id)).toEqual(['A', 'C', 'B'])
  })

  it('newest sorts by updated_at DESC', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedScenario(db)
    expect(listPublicPublishedChips(db, { sort: 'newest', now }).map((c) => c.id)).toEqual(['C', 'B', 'A'])
  })

  it('defaults to trending when no sort is given', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedScenario(db)
    expect(listPublicPublishedChips(db, { now }).map((c) => c.id)).toEqual(['A', 'C', 'B'])
  })

  it('counts engagement exactly at the cutoff (inclusive window)', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    user(db, 'owner')
    user(db, 'l1')
    user(db, 'l2')
    chip(db, 'X', 1)
    chip(db, 'Y', 2)
    like(db, 'X', 'l1', CUTOFF)
    comment(db, 'cm-y', 'Y', 'l2', CUTOFF - 1)
    expect(listPublicPublishedChips(db, { sort: 'trending', now }).map((c) => c.id)).toEqual(['X', 'Y'])
  })
})
