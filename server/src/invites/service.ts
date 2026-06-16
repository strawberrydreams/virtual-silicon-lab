import type Database from 'better-sqlite3'
import { generateInviteCode, normalizeInviteCode } from './validation'

export type InviteCode = {
  code: string
  createdBy: string | null
  maxUses: number
  usedCount: number
  expiresAt: number | null
  note: string | null
  createdAt: number
}

type InviteCodeRow = {
  code: string
  created_by: string | null
  max_uses: number
  used_count: number
  expires_at: number | null
  note: string | null
  created_at: number
}

function toInviteCode(row: InviteCodeRow): InviteCode {
  return {
    code: row.code,
    createdBy: row.created_by,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    note: row.note,
    createdAt: row.created_at,
  }
}

export function createInviteCode(
  db: Database.Database,
  input: { createdBy: string | null; maxUses: number; expiresAt: number | null; note: string | null },
  now: () => number,
): InviteCode {
  let code = generateInviteCode()
  let attempts = 0
  while (
    db.prepare('SELECT 1 FROM invite_codes WHERE code = ?').get(code) !== undefined &&
    attempts < 5
  ) {
    attempts += 1
    code = generateInviteCode()
  }
  db.prepare(
    `INSERT INTO invite_codes
      (code, created_by, max_uses, used_count, expires_at, note, created_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
  ).run(code, input.createdBy, input.maxUses, input.expiresAt, input.note, now())
  return toInviteCode(db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(code) as InviteCodeRow)
}

export function listInviteCodes(db: Database.Database): InviteCode[] {
  return (
    db.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC').all() as InviteCodeRow[]
  ).map(toInviteCode)
}

export function revokeInviteCode(db: Database.Database, code: string): boolean {
  return (
    db.prepare('DELETE FROM invite_codes WHERE code = ?').run(normalizeInviteCode(code)).changes > 0
  )
}

export function redeemInviteCode(
  db: Database.Database,
  code: string,
  now: () => number,
): 'ok' | 'invalid' | 'expired' | 'exhausted' {
  const normalized = normalizeInviteCode(code)
  const row = db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(normalized) as
    | InviteCodeRow
    | undefined
  if (row === undefined) return 'invalid'
  if (row.expires_at !== null && row.expires_at <= now()) return 'expired'

  const result = db
    .prepare(
      `UPDATE invite_codes
       SET used_count = used_count + 1
       WHERE code = ?
         AND used_count < max_uses
         AND (expires_at IS NULL OR expires_at > ?)`,
    )
    .run(normalized, now())
  return result.changes > 0 ? 'ok' : 'exhausted'
}
