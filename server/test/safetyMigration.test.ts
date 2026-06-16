import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('009_safety', () => {
  it('adds ban, comment-hide, report comment_id, and audit_log', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const hasColumn = (table: string, column: string) =>
      (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some(
        (row) => row.name === column,
      )

    expect(hasColumn('users', 'banned_at')).toBe(true)
    expect(hasColumn('users', 'banned_reason')).toBe(true)
    expect(hasColumn('comments', 'hidden_at')).toBe(true)
    expect(hasColumn('comments', 'hidden_by')).toBe(true)
    expect(hasColumn('reports', 'comment_id')).toBe(true)
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'").get(),
    ).toBeDefined()
  })
})
