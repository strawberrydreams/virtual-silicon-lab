import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { PublishInput } from './validation'

export type PublishedChip = {
  id: string
  ownerUserId: string
  sourceProjectId: string
  slug: string
  title: string
  projectJson: string
  dieImageDataUrl: string
  posterImageDataUrl: string
  isPublic: boolean
  version: number
  createdAt: number
  updatedAt: number
  publishedAt: number
}

export type PublicGalleryChip = PublishedChip & {
  ownerDisplayName: string
}

type PublishedChipRow = {
  id: string
  owner_user_id: string
  source_project_id: string
  slug: string
  title: string
  project_json: string
  die_image_data_url: string
  poster_image_data_url: string
  is_public: 0 | 1
  version: number
  created_at: number
  updated_at: number
  published_at: number
}

type PublicGalleryChipRow = PublishedChipRow & { owner_display_name: string }

function toPublishedChip(row: PublishedChipRow): PublishedChip {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    sourceProjectId: row.source_project_id,
    slug: row.slug,
    title: row.title,
    projectJson: row.project_json,
    dieImageDataUrl: row.die_image_data_url,
    posterImageDataUrl: row.poster_image_data_url,
    isPublic: row.is_public === 1,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

function toPublicGalleryChip(row: PublicGalleryChipRow): PublicGalleryChip {
  return { ...toPublishedChip(row), ownerDisplayName: row.owner_display_name }
}

function getByOwnerProject(
  db: Database.Database,
  ownerUserId: string,
  sourceProjectId: string,
): PublishedChipRow | undefined {
  return db
    .prepare('SELECT * FROM published_chips WHERE owner_user_id = ? AND source_project_id = ?')
    .get(ownerUserId, sourceProjectId) as PublishedChipRow | undefined
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${base || 'chip'}-${randomUUID().replace(/-/g, '').slice(0, 8)}`
}

export function getPublishedChipForOwnerProject(
  db: Database.Database,
  ownerUserId: string,
  sourceProjectId: string,
): PublishedChip | null {
  const row = getByOwnerProject(db, ownerUserId, sourceProjectId)
  return row === undefined ? null : toPublishedChip(row)
}

export function upsertPublishedChip(
  db: Database.Database,
  ownerUserId: string,
  input: PublishInput,
  now: () => number,
): PublishedChip {
  return db.transaction(() => {
    const existing = getByOwnerProject(db, ownerUserId, input.project.id)
    const timestamp = now()
    const projectJson = JSON.stringify(input.project)
    const publishedAt = input.isPublic ? timestamp : existing?.published_at ?? 0

    if (existing === undefined) {
      const id = randomUUID()
      db.prepare(
        `INSERT INTO published_chips
         (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        ownerUserId,
        input.project.id,
        slugify(input.title),
        input.title,
        projectJson,
        input.dieImageDataUrl,
        input.posterImageDataUrl,
        input.isPublic ? 1 : 0,
        timestamp,
        timestamp,
        publishedAt,
      )
    } else {
      db.prepare(
        `UPDATE published_chips
         SET title = ?,
             project_json = ?,
             die_image_data_url = ?,
             poster_image_data_url = ?,
             is_public = ?,
             version = version + 1,
             updated_at = ?,
             published_at = ?
         WHERE id = ?`,
      ).run(
        input.title,
        projectJson,
        input.dieImageDataUrl,
        input.posterImageDataUrl,
        input.isPublic ? 1 : 0,
        timestamp,
        publishedAt,
        existing.id,
      )
    }

    return toPublishedChip(getByOwnerProject(db, ownerUserId, input.project.id) as PublishedChipRow)
  })()
}

export function setPublishedChipVisibility(
  db: Database.Database,
  ownerUserId: string,
  sourceProjectId: string,
  isPublic: boolean,
  now: () => number,
): PublishedChip | null {
  const existing = getByOwnerProject(db, ownerUserId, sourceProjectId)
  if (existing === undefined) return null
  const timestamp = now()
  db.prepare(
    'UPDATE published_chips SET is_public = ?, updated_at = ?, published_at = ? WHERE id = ?',
  ).run(isPublic ? 1 : 0, timestamp, isPublic ? timestamp : existing.published_at, existing.id)
  return toPublishedChip(getByOwnerProject(db, ownerUserId, sourceProjectId) as PublishedChipRow)
}

export function deletePublishedChip(
  db: Database.Database,
  ownerUserId: string,
  sourceProjectId: string,
): boolean {
  const result = db
    .prepare('DELETE FROM published_chips WHERE owner_user_id = ? AND source_project_id = ?')
    .run(ownerUserId, sourceProjectId)
  return result.changes > 0
}

export function listPublicPublishedChips(db: Database.Database, limit = 48): PublicGalleryChip[] {
  const rows = db
    .prepare(
      `SELECT p.*, u.display_name AS owner_display_name
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.is_public = 1
       ORDER BY p.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as PublicGalleryChipRow[]
  return rows.map(toPublicGalleryChip)
}

export function getPublicPublishedChipBySlug(
  db: Database.Database,
  slug: string,
): PublicGalleryChip | null {
  const row = db
    .prepare(
      `SELECT p.*, u.display_name AS owner_display_name
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.slug = ? AND p.is_public = 1`,
    )
    .get(slug) as PublicGalleryChipRow | undefined
  return row === undefined ? null : toPublicGalleryChip(row)
}
