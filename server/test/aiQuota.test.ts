import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { countRecentGenerations, logPrompt } from '../src/ai/quota'

function seededDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'A', 'h', 1, 1)
  return db
}

describe('ai quota helpers', () => {
  it('logs a prompt row and counts it within the 24h window', () => {
    const db = seededDb()
    const now = () => 1_000_000
    logPrompt(db, { userId: 'u1', kind: 'generate-draft', prompt: 'hi' }, now)
    expect(countRecentGenerations(db, 'u1', now)).toBe(1)
  })

  it('excludes rows older than 24h', () => {
    const db = seededDb()
    logPrompt(db, { userId: 'u1', kind: 'generate-draft', prompt: 'old' }, () => 0)
    const now = () => 25 * 60 * 60 * 1000
    expect(countRecentGenerations(db, 'u1', now)).toBe(0)
  })
})
