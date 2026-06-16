import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type AuditEntry = {
  id: string
  adminUserId: string | null
  action: string
  targetType: string
  targetId: string
  detail: string | null
  createdAt: number
}

type AuditRow = {
  id: string
  admin_user_id: string | null
  action: string
  target_type: string
  target_id: string
  detail: string | null
  created_at: number
}

function toAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    detail: row.detail,
    createdAt: row.created_at,
  }
}

export function recordAudit(
  db: Database.Database,
  entry: {
    adminUserId: string | null
    action: string
    targetType: string
    targetId: string
    detail: string | null
  },
  now: () => number,
): void {
  db.prepare(
    `INSERT INTO audit_log
      (id, admin_user_id, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    entry.adminUserId,
    entry.action,
    entry.targetType,
    entry.targetId,
    entry.detail,
    now(),
  )
}

export function listAudit(db: Database.Database, limit = 100): AuditEntry[] {
  return (
    db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?').all(limit) as AuditRow[]
  ).map(toAuditEntry)
}
