import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('005_reactions migration', () => {
  function tableColumns(db: ReturnType<typeof openDatabase>, table: string): string[] {
    return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  }

  it('creates likes and comments tables', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    expect(tableColumns(db, 'likes').sort()).toEqual(['created_at', 'published_chip_id', 'user_id'])
    expect(tableColumns(db, 'comments')).toContain('body')
  })

  it('enforces one like per user per chip via the composite primary key', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('u1', 'a@b.c', 'A', 'h', 0, 0)
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at)
       VALUES ('c1','u1','p1','s1','T','{}','','',1,0,0)`,
    ).run()
    db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run('c1', 'u1', 1)
    expect(() =>
      db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run('c1', 'u1', 2),
    ).toThrow()
  })
})
