import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('012_profiles_seo', () => {
  it('adds optional unique user handles', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const columns = (db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(
      (column) => column.name,
    )
    expect(columns).toContain('handle')

    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, handle, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    ).run('u1', 'a@example.com', 'A', 'h', 'maker', 0, 0)
    expect(() =>
      db
        .prepare(
          'INSERT INTO users (id, email, display_name, password_hash, handle, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        )
        .run('u2', 'b@example.com', 'B', 'h', 'maker', 0, 0),
    ).toThrow()
  })
})
