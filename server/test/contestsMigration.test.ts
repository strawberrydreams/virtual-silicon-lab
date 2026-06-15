import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

function setup() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  return db
}

function seedChip(db: ReturnType<typeof openDatabase>, chipId: string, owner: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(owner, `${owner}@b.c`, owner, 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES (?,?,?,?,?,'{}','','',1,'visible',0,1,0)`,
  ).run(chipId, owner, `proj-${chipId}`, `slug-${chipId}`, chipId)
}

describe('006_contests migration', () => {
  it('creates contests, contest_entries, contest_votes', () => {
    const db = setup()
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('contests','contest_entries','contest_votes')")
      .all()
      .map((r) => (r as { name: string }).name)
      .sort()

    expect(names).toEqual(['contest_entries', 'contest_votes', 'contests'])
  })

  it('cascades entries and votes when a contest is deleted', () => {
    const db = setup()
    seedChip(db, 'chipA', 'owner')
    db.prepare('INSERT INTO contests (id, title, theme, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run('c1', 'T', 'Th', 'voting', 'owner', 0, 0)
    db.prepare('INSERT INTO contest_entries (id, contest_id, published_chip_id, owner_user_id, created_at) VALUES (?,?,?,?,?)')
      .run('e1', 'c1', 'chipA', 'owner', 0)
    db.prepare('INSERT INTO contest_votes (contest_id, voter_user_id, entry_id, created_at) VALUES (?,?,?,?)')
      .run('c1', 'owner', 'e1', 0)

    db.prepare('DELETE FROM contests WHERE id = ?').run('c1')

    expect(db.prepare('SELECT COUNT(*) AS n FROM contest_entries').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM contest_votes').get()).toEqual({ n: 0 })
  })

  it('cascades votes when an entry is withdrawn', () => {
    const db = setup()
    seedChip(db, 'chipA', 'owner')
    db.prepare('INSERT INTO contests (id, title, theme, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
      .run('c1', 'T', 'Th', 'voting', 'owner', 0, 0)
    db.prepare('INSERT INTO contest_entries (id, contest_id, published_chip_id, owner_user_id, created_at) VALUES (?,?,?,?,?)')
      .run('e1', 'c1', 'chipA', 'owner', 0)
    db.prepare('INSERT INTO contest_votes (contest_id, voter_user_id, entry_id, created_at) VALUES (?,?,?,?)')
      .run('c1', 'owner', 'e1', 0)

    db.prepare('DELETE FROM contest_entries WHERE id = ?').run('e1')

    expect(db.prepare('SELECT COUNT(*) AS n FROM contest_votes').get()).toEqual({ n: 0 })
  })
})
