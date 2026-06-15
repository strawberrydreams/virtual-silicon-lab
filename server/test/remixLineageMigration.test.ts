import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

function setup() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'ada@example.com', 'Ada', 'hash', 1, 1)
  return db
}

describe('007_remix_lineage migration', () => {
  it('adds a nullable self-referencing parent column with SET NULL', () => {
    const db = setup()
    const cols = db.prepare('PRAGMA table_info(published_chips)').all() as Array<{ name: string }>
    expect(cols.map((c) => c.name)).toContain('remixed_from_chip_id')

    const idx = db.prepare('PRAGMA index_list(published_chips)').all() as Array<{ name: string }>
    expect(idx.map((i) => i.name)).toContain('idx_published_chips_remixed_from')

    const insertChip = db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at, published_at, remixed_from_chip_id)
       VALUES (?, ?, ?, ?, ?, '{}', '', '', 1, 1, 1, 1, ?)`,
    )
    insertChip.run('parent', 'u1', 'sp-parent', 'parent', 'Parent', null)
    insertChip.run('child', 'u1', 'sp-child', 'child', 'Child', 'parent')

    db.prepare("DELETE FROM published_chips WHERE id = 'parent'").run()

    expect(
      db.prepare("SELECT remixed_from_chip_id FROM published_chips WHERE id = 'child'").get(),
    ).toEqual({ remixed_from_chip_id: null })
  })
})
