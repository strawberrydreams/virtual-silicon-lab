import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

function migratedDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run('u1', 'ada@example.com', 'Ada', 'hash', 1, 1)
  return db
}

describe('002_published_chips migration', () => {
  it('creates published_chips with private visibility and version defaults', () => {
    const db = migratedDb()
    db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'pub1',
      'u1',
      'project-1',
      'ada-chip',
      'Ada Chip',
      '{}',
      'data:image/png;base64,AAA=',
      'data:image/png;base64,BBB=',
      10,
      10,
    )

    expect(
      db.prepare('SELECT source_project_id, is_public, version FROM published_chips').get(),
    ).toEqual({ source_project_id: 'project-1', is_public: 0, version: 1 })
  })

  it('enforces one publish record per user and local source project', () => {
    const db = migratedDb()
    const insert = db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insert.run(
      'pub1',
      'u1',
      'project-1',
      'ada-chip',
      'Ada Chip',
      '{}',
      'data:image/png;base64,AAA=',
      'data:image/png;base64,BBB=',
      10,
      10,
    )

    expect(() =>
      insert.run(
        'pub2',
        'u1',
        'project-1',
        'ada-chip-2',
        'Ada Chip 2',
        '{}',
        'data:image/png;base64,AAA=',
        'data:image/png;base64,BBB=',
        11,
        11,
      ),
    ).toThrow(/UNIQUE/)
  })

  it('enforces globally unique slugs', () => {
    const db = migratedDb()
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('u2', 'grace@example.com', 'Grace', 'hash', 1, 1)
    const insert = db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    insert.run(
      'pub1',
      'u1',
      'project-1',
      'shared-slug',
      'Ada Chip',
      '{}',
      'data:image/png;base64,AAA=',
      'data:image/png;base64,BBB=',
      10,
      10,
    )

    expect(() =>
      insert.run(
        'pub2',
        'u2',
        'project-2',
        'shared-slug',
        'Grace Chip',
        '{}',
        'data:image/png;base64,AAA=',
        'data:image/png;base64,BBB=',
        11,
        11,
      ),
    ).toThrow(/UNIQUE/)
  })

  it('cascades published chips when the owning user is deleted', () => {
    const db = migratedDb()
    db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'pub1',
      'u1',
      'project-1',
      'ada-chip',
      'Ada Chip',
      '{}',
      'data:image/png;base64,AAA=',
      'data:image/png;base64,BBB=',
      10,
      10,
    )

    db.prepare('DELETE FROM users WHERE id = ?').run('u1')

    expect(db.prepare('SELECT id FROM published_chips').all()).toEqual([])
  })
})

describe('003_published_chip_image_paths migration', () => {
  it('adds nullable file-backed image path columns while preserving legacy data URL rows', () => {
    const db = migratedDb()
    const columns = db.prepare('PRAGMA table_info(published_chips)').all() as Array<{
      name: string
    }>

    expect(columns.map((column) => column.name)).toContain('die_image_path')
    expect(columns.map((column) => column.name)).toContain('poster_image_path')

    db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'pub1',
      'u1',
      'project-1',
      'ada-chip',
      'Ada Chip',
      '{}',
      'data:image/png;base64,AAA=',
      'data:image/png;base64,BBB=',
      10,
      10,
    )

    expect(
      db
        .prepare('SELECT die_image_path, poster_image_path FROM published_chips WHERE id = ?')
        .get('pub1'),
    ).toEqual({ die_image_path: null, poster_image_path: null })
  })
})
