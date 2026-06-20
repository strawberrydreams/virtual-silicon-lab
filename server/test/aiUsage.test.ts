import { describe, expect, it } from 'vitest'
import { logPrompt } from '../src/ai/quota'
import { summarizeAiUsage } from '../src/ai/usage'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

function seedUser(db: ReturnType<typeof openDatabase>, id: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(id, `${id}@e.c`, id, 'h', 0, 0)
}

describe('summarizeAiUsage', () => {
  it('aggregates calls per kind, distinct users, and respects the window', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedUser(db, 'u1')
    seedUser(db, 'u2')

    let time = 1000
    logPrompt(db, { userId: 'u1', kind: 'generate-draft', prompt: 'a' }, () => (time += 1))
    logPrompt(db, { userId: 'u1', kind: 'generate-copy', prompt: 'b' }, () => (time += 1))
    logPrompt(db, { userId: 'u2', kind: 'generate-draft', prompt: 'c' }, () => (time += 1))
    logPrompt(db, { userId: 'u2', kind: 'suggest-layout', prompt: 'd' }, () => 100)

    const summary = summarizeAiUsage(db, { since: 500, until: 10_000 })

    expect(summary.totalCalls).toBe(3)
    expect(summary.distinctUsers).toBe(2)
    expect(summary.byKind).toEqual({ 'generate-draft': 2, 'generate-copy': 1 })
  })

  it('returns zeros and an empty byKind for an empty window', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)

    expect(summarizeAiUsage(db, { since: 0, until: 10 })).toEqual({
      since: 0,
      until: 10,
      totalCalls: 0,
      distinctUsers: 0,
      byKind: {},
    })
  })
})
