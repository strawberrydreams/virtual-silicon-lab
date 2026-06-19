import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

const WINDOW_MS = 24 * 60 * 60 * 1000

/** Generations by this user in the trailing 24h — the per-user daily quota basis. */
export function countRecentGenerations(
  db: Database.Database,
  userId: string,
  now: () => number,
): number {
  const since = now() - WINDOW_MS
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM ai_prompt_log WHERE user_id = ? AND created_at >= ?')
    .get(userId, since) as { n: number }
  return row.n
}

export function logPrompt(
  db: Database.Database,
  entry: { userId: string; kind: string; prompt: string },
  now: () => number,
): void {
  db.prepare(
    'INSERT INTO ai_prompt_log (id, user_id, kind, prompt, created_at) VALUES (?,?,?,?,?)',
  ).run(randomUUID(), entry.userId, entry.kind, entry.prompt, now())
}
