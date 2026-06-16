import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type LikeState = { likeCount: number; likedByMe: boolean }

export type Comment = {
  id: string
  publishedChipId: string
  authorUserId: string
  authorDisplayName: string
  body: string
  createdAt: number
}

export function isChipReactable(db: Database.Database, chipId: string): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM published_chips WHERE id = ? AND is_public = 1 AND moderation_status = 'visible'",
    )
    .get(chipId)
  return row !== undefined
}

export function likeChip(
  db: Database.Database,
  chipId: string,
  userId: string,
  now: () => number,
): void {
  db.prepare(
    'INSERT OR IGNORE INTO likes (published_chip_id, user_id, created_at) VALUES (?, ?, ?)',
  ).run(chipId, userId, now())
}

export function unlikeChip(db: Database.Database, chipId: string, userId: string): void {
  db.prepare('DELETE FROM likes WHERE published_chip_id = ? AND user_id = ?').run(chipId, userId)
}

export function countLikes(db: Database.Database, chipId: string): number {
  return (
    db.prepare('SELECT COUNT(*) AS n FROM likes WHERE published_chip_id = ?').get(chipId) as {
      n: number
    }
  ).n
}

export function hasUserLiked(db: Database.Database, chipId: string, userId: string): boolean {
  return (
    db
      .prepare('SELECT 1 FROM likes WHERE published_chip_id = ? AND user_id = ?')
      .get(chipId, userId) !== undefined
  )
}

export function getLikeState(
  db: Database.Database,
  chipId: string,
  userId: string | null,
): LikeState {
  return {
    likeCount: countLikes(db, chipId),
    likedByMe: userId === null ? false : hasUserLiked(db, chipId, userId),
  }
}

type CommentRow = {
  id: string
  published_chip_id: string
  author_user_id: string
  author_display_name: string
  body: string
  created_at: number
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    publishedChipId: row.published_chip_id,
    authorUserId: row.author_user_id,
    authorDisplayName: row.author_display_name,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function createComment(
  db: Database.Database,
  input: { publishedChipId: string; authorUserId: string; body: string },
  now: () => number,
): Comment {
  const id = randomUUID()
  db.prepare(
    'INSERT INTO comments (id, published_chip_id, author_user_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, input.publishedChipId, input.authorUserId, input.body, now())
  return toComment(
    db
      .prepare(
        `SELECT c.*, u.display_name AS author_display_name
         FROM comments c JOIN users u ON u.id = c.author_user_id WHERE c.id = ?`,
      )
      .get(id) as CommentRow,
  )
}

export function listComments(db: Database.Database, chipId: string, limit = 200): Comment[] {
  const rows = db
    .prepare(
      `SELECT c.*, u.display_name AS author_display_name
       FROM comments c JOIN users u ON u.id = c.author_user_id
       WHERE c.published_chip_id = ?
       ORDER BY c.created_at ASC
       LIMIT ?`,
    )
    .all(chipId, limit) as CommentRow[]
  return rows.map(toComment)
}

export function getCommentMeta(
  db: Database.Database,
  commentId: string,
): { id: string; publishedChipId: string; authorUserId: string } | null {
  const row = db
    .prepare('SELECT id, published_chip_id, author_user_id FROM comments WHERE id = ?')
    .get(commentId) as { id: string; published_chip_id: string; author_user_id: string } | undefined
  return row === undefined
    ? null
    : { id: row.id, publishedChipId: row.published_chip_id, authorUserId: row.author_user_id }
}

export function deleteComment(db: Database.Database, commentId: string): boolean {
  return db.prepare('DELETE FROM comments WHERE id = ?').run(commentId).changes > 0
}
