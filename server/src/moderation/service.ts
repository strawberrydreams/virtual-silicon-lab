import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { PublishedImageStore } from '../images/fileImageStore'

export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export type Report = {
  id: string
  publishedChipId: string
  reporterUserId: string | null
  reason: string | null
  status: ReportStatus
  createdAt: number
  resolvedAt: number | null
  resolvedBy: string | null
}

export type ReportWithChip = Report & { chipSlug: string; chipTitle: string }

export type ModerationChip = {
  id: string
  slug: string
  title: string
  ownerDisplayName: string
  isPublic: boolean
  moderationStatus: 'visible' | 'hidden'
  updatedAt: number
}

type ReportRow = {
  id: string
  published_chip_id: string
  reporter_user_id: string | null
  reason: string | null
  status: ReportStatus
  created_at: number
  resolved_at: number | null
  resolved_by: string | null
}

function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    publishedChipId: row.published_chip_id,
    reporterUserId: row.reporter_user_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  }
}

export function createReport(
  db: Database.Database,
  input: { publishedChipId: string; reporterUserId: string | null; reason: string | null },
  now: () => number,
): Report | 'chip-not-found' {
  const chip = db.prepare('SELECT id FROM published_chips WHERE id = ?').get(input.publishedChipId)
  if (chip === undefined) return 'chip-not-found'
  const id = randomUUID()
  db.prepare(
    `INSERT INTO reports (id, published_chip_id, reporter_user_id, reason, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
  ).run(id, input.publishedChipId, input.reporterUserId, input.reason, now())
  return toReport(db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow)
}

export function listReports(db: Database.Database, status: ReportStatus): ReportWithChip[] {
  const rows = db
    .prepare(
      `SELECT r.*, p.slug AS chip_slug, p.title AS chip_title
       FROM reports r
       JOIN published_chips p ON p.id = r.published_chip_id
       WHERE r.status = ?
       ORDER BY r.created_at DESC`,
    )
    .all(status) as (ReportRow & { chip_slug: string; chip_title: string })[]
  return rows.map((row) => ({ ...toReport(row), chipSlug: row.chip_slug, chipTitle: row.chip_title }))
}

export function resolveReport(
  db: Database.Database,
  id: string,
  status: 'resolved' | 'dismissed',
  adminUserId: string,
  now: () => number,
): Report | null {
  const result = db
    .prepare('UPDATE reports SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?')
    .run(status, now(), adminUserId, id)
  if (result.changes === 0) return null
  return toReport(db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow)
}

export function hideChip(
  db: Database.Database,
  chipId: string,
  adminUserId: string,
  reason: string | null,
  now: () => number,
): boolean {
  const timestamp = now()
  const result = db
    .prepare(
      "UPDATE published_chips SET moderation_status = 'hidden', hidden_at = ?, hidden_by = ?, hidden_reason = ?, updated_at = ? WHERE id = ?",
    )
    .run(timestamp, adminUserId, reason, timestamp, chipId)
  return result.changes > 0
}

export function unhideChip(db: Database.Database, chipId: string, now: () => number): boolean {
  const result = db
    .prepare(
      "UPDATE published_chips SET moderation_status = 'visible', hidden_at = NULL, hidden_by = NULL, hidden_reason = NULL, updated_at = ? WHERE id = ?",
    )
    .run(now(), chipId)
  return result.changes > 0
}

export function adminDeleteChip(
  db: Database.Database,
  chipId: string,
  imageStore?: PublishedImageStore,
): boolean {
  const result = db.prepare('DELETE FROM published_chips WHERE id = ?').run(chipId)
  if (result.changes > 0) imageStore?.deletePublishedImages(chipId)
  return result.changes > 0
}

export function listChipsForModeration(db: Database.Database, limit = 100): ModerationChip[] {
  const rows = db
    .prepare(
      `SELECT p.id, p.slug, p.title, p.is_public, p.moderation_status, p.updated_at, u.display_name AS owner_display_name
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       ORDER BY p.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as {
    id: string
    slug: string
    title: string
    is_public: 0 | 1
    moderation_status: 'visible' | 'hidden'
    updated_at: number
    owner_display_name: string
  }[]
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    ownerDisplayName: row.owner_display_name,
    isPublic: row.is_public === 1,
    moderationStatus: row.moderation_status,
    updatedAt: row.updated_at,
  }))
}
