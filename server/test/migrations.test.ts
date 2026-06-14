import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations, type Migration } from '../src/db'

const createNotes: Migration = {
  id: '001_create_notes',
  up: (db) => {
    db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)')
  },
}

const addTag: Migration = {
  id: '002_add_tag',
  up: (db) => {
    db.exec('ALTER TABLE notes ADD COLUMN tag TEXT')
  },
}

describe('runMigrations', () => {
  it('applies pending migrations in order and records them', () => {
    const db = openDatabase(':memory:')
    const applied = runMigrations(db, [createNotes, addTag])
    expect(applied).toEqual(['001_create_notes', '002_add_tag'])
    const rows = db.prepare('SELECT id FROM schema_migrations ORDER BY id').all()
    expect(rows).toEqual([{ id: '001_create_notes' }, { id: '002_add_tag' }])
    db.prepare("INSERT INTO notes (body, tag) VALUES ('hello', 'x')").run()
  })

  it('skips already-applied migrations on re-run', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, [createNotes])
    const applied = runMigrations(db, [createNotes, addTag])
    expect(applied).toEqual(['002_add_tag'])
  })

  it('rolls back a failing migration atomically', () => {
    const db = openDatabase(':memory:')
    const broken: Migration = {
      id: '001_broken',
      up: (d) => {
        d.exec('CREATE TABLE ok_table (id INTEGER)')
        d.exec('THIS IS NOT SQL')
      },
    }
    expect(() => runMigrations(db, [broken])).toThrow()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ok_table'")
      .all()
    expect(tables).toEqual([])
    expect(db.prepare('SELECT id FROM schema_migrations').all()).toEqual([])
  })

  it('rejects duplicate migration ids before running anything', () => {
    const db = openDatabase(':memory:')
    const dupe: Migration = { id: '001_create_notes', up: () => {} }
    expect(() => runMigrations(db, [createNotes, dupe])).toThrow(
      'Duplicate migration id: 001_create_notes',
    )
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notes'")
      .all()
    expect(tables).toEqual([])
  })

  it('creates the bookkeeping table even with no migrations', () => {
    const db = openDatabase(':memory:')
    expect(runMigrations(db, [])).toEqual([])
    expect(db.prepare('SELECT id FROM schema_migrations').all()).toEqual([])
  })
})
