import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { PublishedImageStore } from '../images/fileImageStore'

export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export type Report = {
  id: string
  publishedChipId: string
  commentId: string | null
  reporterUserId: string | null
  reason: string | null
  status: ReportStatus
  createdAt: number
  resolvedAt: number | null
  resolvedBy: string | null
}

export type ReportWithChip = Report & { chipSlug: string; chipTitle: string }
export type CommentReportWithContext = ReportWithChip & {
  commentId: string
  commentBody: string
  commentAuthorDisplayName: string
}

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
  comment_id: string | null
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
    commentId: row.comment_id,
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
  const chip = db
    .prepare(
      "SELECT id FROM published_chips WHERE id = ? AND is_public = 1 AND moderation_status = 'visible'",
    )
    .get(input.publishedChipId)
  if (chip === undefined) return 'chip-not-found'
  const id = randomUUID()
  db.prepare(
    `INSERT INTO reports (id, published_chip_id, reporter_user_id, reason, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
  ).run(id, input.publishedChipId, input.reporterUserId, input.reason, now())
  return toReport(db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow)
}

export function createCommentReport(
  db: Database.Database,
  input: { commentId: string; reporterUserId: string | null; reason: string | null },
  now: () => number,
): Report | 'comment-not-found' {
  const row = db
    .prepare(
      `SELECT c.id, c.published_chip_id
       FROM comments c
       JOIN published_chips p ON p.id = c.published_chip_id
       WHERE c.id = ?
         AND c.hidden_at IS NULL
         AND p.is_public = 1
         AND p.moderation_status = 'visible'`,
    )
    .get(input.commentId) as { id: string; published_chip_id: string } | undefined
  if (row === undefined) return 'comment-not-found'
  const id = randomUUID()
  db.prepare(
    `INSERT INTO reports
      (id, published_chip_id, comment_id, reporter_user_id, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`,
  ).run(id, row.published_chip_id, row.id, input.reporterUserId, input.reason, now())
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
  return rows.map((row) => ({
    ...toReport(row),
    chipSlug: row.chip_slug,
    chipTitle: row.chip_title,
  }))
}

export function listCommentReports(db: Database.Database): CommentReportWithContext[] {
  const rows = db
    .prepare(
      `SELECT r.*, p.slug AS chip_slug, p.title AS chip_title, c.id AS comment_id,
              c.body AS comment_body, u.display_name AS comment_author_display_name
       FROM reports r
       JOIN published_chips p ON p.id = r.published_chip_id
       JOIN comments c ON c.id = r.comment_id
       JOIN users u ON u.id = c.author_user_id
       WHERE r.status = 'open' AND r.comment_id IS NOT NULL
       ORDER BY r.created_at DESC`,
    )
    .all() as (ReportRow & {
    chip_slug: string
    chip_title: string
    comment_id: string
    comment_body: string
    comment_author_display_name: string
  })[]
  return rows.map((row) => ({
    ...toReport(row),
    chipSlug: row.chip_slug,
    chipTitle: row.chip_title,
    commentId: row.comment_id,
    commentBody: row.comment_body,
    commentAuthorDisplayName: row.comment_author_display_name,
  }))
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

export function hideComment(
  db: Database.Database,
  commentId: string,
  adminUserId: string,
  now: () => number,
): boolean {
  return (
    db
      .prepare('UPDATE comments SET hidden_at = ?, hidden_by = ? WHERE id = ?')
      .run(now(), adminUserId, commentId).changes > 0
  )
}

export function unhideComment(db: Database.Database, commentId: string): boolean {
  return (
    db.prepare('UPDATE comments SET hidden_at = NULL, hidden_by = NULL WHERE id = ?').run(commentId)
      .changes > 0
  )
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
