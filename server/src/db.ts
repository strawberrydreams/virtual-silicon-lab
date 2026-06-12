import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

export type Migration = {
  id: string
  up: (db: Database.Database) => void
}

export function openDatabase(path: string): Database.Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function runMigrations(db: Database.Database, migrations: Migration[]): string[] {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  )
  const appliedRows = db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
  const alreadyApplied = new Set(appliedRows.map((row) => row.id))
  const insertApplied = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')

  const newlyApplied: string[] = []
  for (const migration of migrations) {
    if (alreadyApplied.has(migration.id)) continue
    db.transaction(() => {
      migration.up(db)
      insertApplied.run(migration.id, new Date().toISOString())
    })()
    newlyApplied.push(migration.id)
  }
  return newlyApplied
}
