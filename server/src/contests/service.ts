import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type ContestStatus = 'draft' | 'submission' | 'voting' | 'results'

export type Contest = {
  id: string
  title: string
  theme: string
  status: ContestStatus
  createdBy: string | null
  createdAt: number
  updatedAt: number
}

export type ContestSummary = {
  id: string
  title: string
  theme: string
  status: ContestStatus
  entryCount: number
  voteCount: number
  createdAt: number
}

export type ContestEntryView = {
  entryId: string
  publishedChipId: string
  slug: string
  title: string
  ownerDisplayName: string
  posterImagePath: string | null
  posterImageDataUrl: string
  voteCount: number
  rank: number
}

export type ContestDetail = {
  id: string
  title: string
  theme: string
  status: ContestStatus
  createdAt: number
  entries: ContestEntryView[]
  myEntryId: string | null
  myVoteEntryId: string | null
}

type ContestRow = {
  id: string
  title: string
  theme: string
  status: ContestStatus
  created_by: string | null
  created_at: number
  updated_at: number
}

function toContest(row: ContestRow): Contest {
  return {
    id: row.id,
    title: row.title,
    theme: row.theme,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createContest(
  db: Database.Database,
  input: { title: string; theme: string; createdBy: string },
  now: () => number,
): Contest {
  const id = randomUUID()
  const ts = now()
  db.prepare(
    'INSERT INTO contests (id, title, theme, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, input.title, input.theme, 'draft', input.createdBy, ts, ts)
  return toContest(db.prepare('SELECT * FROM contests WHERE id = ?').get(id) as ContestRow)
}

export function updateContest(
  db: Database.Database,
  id: string,
  patch: { title?: string; theme?: string; status?: ContestStatus },
  now: () => number,
): Contest | null {
  const existing = db.prepare('SELECT * FROM contests WHERE id = ?').get(id) as ContestRow | undefined
  if (existing === undefined) return null
  const title = patch.title ?? existing.title
  const theme = patch.theme ?? existing.theme
  const status = patch.status ?? existing.status
  db.prepare('UPDATE contests SET title = ?, theme = ?, status = ?, updated_at = ? WHERE id = ?').run(
    title,
    theme,
    status,
    now(),
    id,
  )
  return toContest(db.prepare('SELECT * FROM contests WHERE id = ?').get(id) as ContestRow)
}

export function deleteContest(db: Database.Database, id: string): boolean {
  return db.prepare('DELETE FROM contests WHERE id = ?').run(id).changes > 0
}

export function getContestStatus(db: Database.Database, id: string): ContestStatus | null {
  const row = db.prepare('SELECT status FROM contests WHERE id = ?').get(id) as { status: ContestStatus } | undefined
  return row === undefined ? null : row.status
}

export function listPublicContests(db: Database.Database): ContestSummary[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.title, c.theme, c.status, c.created_at,
              (SELECT COUNT(*) FROM contest_entries e WHERE e.contest_id = c.id) AS entry_count,
              (SELECT COUNT(*) FROM contest_votes v WHERE v.contest_id = c.id) AS vote_count
       FROM contests c
       WHERE c.status != 'draft'
       ORDER BY c.created_at DESC`,
    )
    .all() as Array<{
    id: string
    title: string
    theme: string
    status: ContestStatus
    created_at: number
    entry_count: number
    vote_count: number
  }>
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    theme: row.theme,
    status: row.status,
    entryCount: row.entry_count,
    voteCount: row.vote_count,
    createdAt: row.created_at,
  }))
}

export function getContestDetail(
  db: Database.Database,
  contestId: string,
  viewerUserId: string | null,
): ContestDetail | null {
  const contest = db.prepare('SELECT * FROM contests WHERE id = ?').get(contestId) as ContestRow | undefined
  if (contest === undefined || contest.status === 'draft') return null

  const entryRows = db
    .prepare(
      `SELECT e.id AS entry_id, e.published_chip_id, e.owner_user_id, e.created_at,
              p.slug, p.title, p.poster_image_path, p.poster_image_data_url,
              u.display_name AS owner_display_name,
              (SELECT COUNT(*) FROM contest_votes v WHERE v.entry_id = e.id) AS vote_count
       FROM contest_entries e
       JOIN published_chips p ON p.id = e.published_chip_id
       JOIN users u ON u.id = e.owner_user_id
       WHERE e.contest_id = ?
       ORDER BY vote_count DESC, e.created_at ASC`,
    )
    .all(contestId) as Array<{
    entry_id: string
    published_chip_id: string
    owner_user_id: string
    created_at: number
    slug: string
    title: string
    poster_image_path: string | null
    poster_image_data_url: string
    owner_display_name: string
    vote_count: number
  }>

  const entries: ContestEntryView[] = entryRows.map((row, index) => ({
    entryId: row.entry_id,
    publishedChipId: row.published_chip_id,
    slug: row.slug,
    title: row.title,
    ownerDisplayName: row.owner_display_name,
    posterImagePath: row.poster_image_path,
    posterImageDataUrl: row.poster_image_data_url,
    voteCount: row.vote_count,
    rank: index + 1,
  }))

  const myEntryId = viewerUserId === null ? null : (entryRows.find((row) => row.owner_user_id === viewerUserId)?.entry_id ?? null)
  const myVoteEntryId = viewerUserId === null ? null : getMyVote(db, contestId, viewerUserId)

  return {
    id: contest.id,
    title: contest.title,
    theme: contest.theme,
    status: contest.status,
    createdAt: contest.created_at,
    entries,
    myEntryId,
    myVoteEntryId,
  }
}

export function getMyVote(db: Database.Database, contestId: string, voterUserId: string): string | null {
  const row = db
    .prepare('SELECT entry_id FROM contest_votes WHERE contest_id = ? AND voter_user_id = ?')
    .get(contestId, voterUserId) as { entry_id: string } | undefined
  return row === undefined ? null : row.entry_id
}
