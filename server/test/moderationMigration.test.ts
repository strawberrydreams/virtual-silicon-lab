import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('004_moderation migration', () => {
  function columns(db: ReturnType<typeof openDatabase>, table: string): string[] {
    return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
      (c) => c.name,
    )
  }

  it('adds moderation columns to published_chips', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const cols = columns(db, 'published_chips')
    expect(cols).toContain('moderation_status')
    expect(cols).toContain('hidden_at')
    expect(cols).toContain('hidden_by')
    expect(cols).toContain('hidden_reason')
  })

  it('defaults moderation_status to visible for inserted chips', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('u1', 'a@b.c', 'A', 'h', 0, 0)
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run('c1', 'u1', 'p1', 's1', 'T', '{}', '', '', 0, 0)
    const row = db
      .prepare('SELECT moderation_status FROM published_chips WHERE id = ?')
      .get('c1') as {
      moderation_status: string
    }
    expect(row.moderation_status).toBe('visible')
  })

  it('creates a reports table that cascades on chip delete', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    expect(columns(db, 'reports')).toContain('status')
  })
})
