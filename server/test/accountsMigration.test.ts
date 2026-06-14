import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

function migratedDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  return db
}

describe('001_accounts migration', () => {
  it('creates users and sessions tables', () => {
    const db = migratedDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'sessions') ORDER BY name")
      .all()
    expect(tables).toEqual([{ name: 'sessions' }, { name: 'users' }])
  })

  it('enforces unique emails', () => {
    const db = migratedDb()
    const insert = db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    insert.run('u1', 'ada@example.com', 'Ada', 'hash', 1, 1)
    expect(() => insert.run('u2', 'ada@example.com', 'Ada 2', 'hash', 2, 2)).toThrow(/UNIQUE/)
  })

  it('cascades session deletion when the user is deleted', () => {
    const db = migratedDb()
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('u1', 'ada@example.com', 'Ada', 'hash', 1, 1)
    db.prepare(
      'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    ).run('t1', 'u1', 1, 999)

    db.prepare('DELETE FROM users WHERE id = ?').run('u1')

    expect(db.prepare('SELECT token_hash FROM sessions').all()).toEqual([])
  })
})
