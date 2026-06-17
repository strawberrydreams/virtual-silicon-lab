import { createHash, randomBytes } from 'node:crypto'
import type Database from 'better-sqlite3'

type TokenTable = 'email_verification_tokens' | 'password_reset_tokens'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function issueToken(
  db: Database.Database,
  table: TokenTable,
  userId: string,
  ttlMs: number,
  now: () => number,
): string {
  const token = randomBytes(32).toString('base64url')
  const timestamp = now()
  db.prepare(`INSERT INTO ${table} (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .run(hashToken(token), userId, timestamp + ttlMs, timestamp)
  return token
}

export function consumeToken(
  db: Database.Database,
  table: TokenTable,
  token: string,
  now: () => number,
): string | null {
  const tokenHash = hashToken(token)
  const row = db.prepare(`SELECT user_id, expires_at FROM ${table} WHERE token_hash = ?`).get(
    tokenHash,
  ) as { user_id: string; expires_at: number } | undefined
  if (row === undefined) return null
  db.prepare(`DELETE FROM ${table} WHERE token_hash = ?`).run(tokenHash)
  return row.expires_at > now() ? row.user_id : null
}
