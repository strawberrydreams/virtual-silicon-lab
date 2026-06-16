import type Database from 'better-sqlite3'

export function isUserBanned(db: Database.Database, userId: string): boolean {
  const row = db.prepare('SELECT banned_at FROM users WHERE id = ?').get(userId) as
    | { banned_at: number | null }
    | undefined
  return row?.banned_at != null
}

export function banUser(
  db: Database.Database,
  userId: string,
  _adminId: string,
  reason: string | null,
  now: () => number,
): boolean {
  void _adminId
  const result = db
    .prepare('UPDATE users SET banned_at = ?, banned_reason = ? WHERE id = ? AND banned_at IS NULL')
    .run(now(), reason, userId)
  if (result.changes > 0) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
  }
  return result.changes > 0
}

export function unbanUser(
  db: Database.Database,
  userId: string,
  _adminId: string,
  _now: () => number,
): boolean {
  void _adminId
  void _now
  return (
    db.prepare('UPDATE users SET banned_at = NULL, banned_reason = NULL WHERE id = ?').run(userId)
      .changes > 0
  )
}
