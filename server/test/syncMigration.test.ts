import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('014_synced_projects migration', () => {
  it('creates the synced_projects table with the expected columns', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const cols = (
      db.prepare('PRAGMA table_info(synced_projects)').all() as { name: string }[]
    )
      .map((c) => c.name)
      .sort()
    expect(cols).toEqual(['deleted_at', 'project_id', 'project_json', 'updated_at', 'user_id'])
  })

  it('uses (user_id, project_id) as the composite primary key', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const pk = (db.prepare('PRAGMA table_info(synced_projects)').all() as {
      name: string
      pk: number
    }[])
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name)
    expect(pk).toEqual(['user_id', 'project_id'])
  })

  it('cascade-deletes synced rows when the user is removed', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('u1', 'a@b.c', 'A', 'h', 1, 1)
    db.prepare(
      'INSERT INTO synced_projects (user_id, project_id, project_json, updated_at, deleted_at) VALUES (?,?,?,?,?)',
    ).run('u1', 'p1', '{}', 10, null)
    db.prepare('DELETE FROM users WHERE id = ?').run('u1')
    const n = (
      db.prepare('SELECT COUNT(*) AS n FROM synced_projects').get() as { n: number }
    ).n
    expect(n).toBe(0)
  })
})
