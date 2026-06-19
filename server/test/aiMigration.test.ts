import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('013_ai migration', () => {
  it('creates the ai_prompt_log table with the expected columns', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const cols = (db.prepare('PRAGMA table_info(ai_prompt_log)').all() as { name: string }[]).map(
      (c) => c.name,
    )
    expect(cols.sort()).toEqual(['created_at', 'id', 'kind', 'prompt', 'user_id'])
  })

  it('cascade-deletes prompt rows when the user is removed', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('u1', 'a@b.c', 'A', 'h', 1, 1)
    db.prepare(
      'INSERT INTO ai_prompt_log (id, user_id, kind, prompt, created_at) VALUES (?,?,?,?,?)',
    ).run('g1', 'u1', 'generate-draft', 'hi', 1)
    db.prepare('DELETE FROM users WHERE id = ?').run('u1')
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })
})
