import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { PublishedImageStore } from '../images/fileImageStore'
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
  dieImagePath: string | null
  posterImagePath: string | null
  moderationStatus: 'visible' | 'hidden'
  isPublic: boolean
  version: number
  createdAt: number
  updatedAt: number
  publishedAt: number
}

export type GallerySort = 'trending' | 'top' | 'newest'

export type PublicGalleryChip = PublishedChip & {
  ownerDisplayName: string
  likeCount: number
  commentCount: number
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
  die_image_path: string | null
  poster_image_path: string | null
  moderation_status: 'visible' | 'hidden'
  is_public: 0 | 1
  version: number
  created_at: number
  updated_at: number
  published_at: number
}

type PublicGalleryChipRow = PublishedChipRow & {
  owner_display_name: string
  like_count: number
  comment_count: number
}

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
    dieImagePath: row.die_image_path,
    posterImagePath: row.poster_image_path,
    moderationStatus: row.moderation_status,
    isPublic: row.is_public === 1,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

function toPublicGalleryChip(row: PublicGalleryChipRow): PublicGalleryChip {
  return {
    ...toPublishedChip(row),
    ownerDisplayName: row.owner_display_name,
    likeCount: row.like_count,
    commentCount: row.comment_count,
  }
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
  imageStore?: PublishedImageStore,
): PublishedChip {
  return db.transaction(() => {
    const existing = getByOwnerProject(db, ownerUserId, input.project.id)
    const id = existing?.id ?? randomUUID()
    const version = existing === undefined ? 1 : existing.version + 1
    const timestamp = now()
    const projectJson = JSON.stringify(input.project)
    const publishedAt = input.isPublic ? timestamp : existing?.published_at ?? 0
    // Republishing overwrites both images at a new version; clear the prior
    // version's files first so superseded PNGs are not orphaned on disk.
    if (imageStore !== undefined && existing !== undefined) {
      imageStore.deletePublishedImages(id)
    }
    const images =
      imageStore === undefined
        ? {
            dieImageDataUrl: input.dieImageDataUrl,
            posterImageDataUrl: input.posterImageDataUrl,
            dieImagePath: existing?.die_image_path ?? null,
            posterImagePath: existing?.poster_image_path ?? null,
          }
        : {
            dieImageDataUrl: '',
            posterImageDataUrl: '',
            dieImagePath: imageStore.savePublishedImage({
              chipId: id,
              version,
              kind: 'die',
              dataUrl: input.dieImageDataUrl,
            }),
            posterImagePath: imageStore.savePublishedImage({
              chipId: id,
              version,
              kind: 'poster',
              dataUrl: input.posterImageDataUrl,
            }),
          }

    if (existing === undefined) {
      db.prepare(
        `INSERT INTO published_chips
         (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, die_image_path, poster_image_path, is_public, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        ownerUserId,
        input.project.id,
        slugify(input.title),
        input.title,
        projectJson,
        images.dieImageDataUrl,
        images.posterImageDataUrl,
        images.dieImagePath,
        images.posterImagePath,
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
             die_image_path = ?,
             poster_image_path = ?,
             is_public = ?,
             version = version + 1,
             updated_at = ?,
             published_at = ?
         WHERE id = ?`,
      ).run(
        input.title,
        projectJson,
        images.dieImageDataUrl,
        images.posterImageDataUrl,
        images.dieImagePath,
        images.posterImagePath,
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
  imageStore?: PublishedImageStore,
): boolean {
  const existing = getByOwnerProject(db, ownerUserId, sourceProjectId)
  if (existing === undefined) return false
  const result = db
    .prepare('DELETE FROM published_chips WHERE owner_user_id = ? AND source_project_id = ?')
    .run(ownerUserId, sourceProjectId)
  if (result.changes > 0) imageStore?.deletePublishedImages(existing.id)
  return result.changes > 0
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const GALLERY_ORDER_BY: Record<GallerySort, string> = {
  trending: 'weekly_score DESC, p.updated_at DESC',
  top: 'total_score DESC, p.updated_at DESC',
  newest: 'p.updated_at DESC',
}

export function listPublicPublishedChips(
  db: Database.Database,
  opts: { sort?: GallerySort; now?: () => number; limit?: number } = {},
): PublicGalleryChip[] {
  const sort = opts.sort ?? 'trending'
  const now = opts.now ?? Date.now
  const limit = opts.limit ?? 48
  const cutoff = now() - WEEK_MS
  const rows = db
    .prepare(
      `SELECT p.*, u.display_name AS owner_display_name,
              (SELECT COUNT(*) FROM likes l WHERE l.published_chip_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.published_chip_id = p.id) AS comment_count,
              (SELECT COUNT(*) FROM likes l WHERE l.published_chip_id = p.id)
                + (SELECT COUNT(*) FROM comments cm WHERE cm.published_chip_id = p.id) AS total_score,
              (SELECT COUNT(*) FROM likes l WHERE l.published_chip_id = p.id AND l.created_at >= @cutoff)
                + (SELECT COUNT(*) FROM comments cm WHERE cm.published_chip_id = p.id AND cm.created_at >= @cutoff) AS weekly_score
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.is_public = 1 AND p.moderation_status = 'visible'
       ORDER BY ${GALLERY_ORDER_BY[sort]}
       LIMIT @limit`,
    )
    .all({ cutoff, limit }) as PublicGalleryChipRow[]
  return rows.map(toPublicGalleryChip)
}

export function getPublicPublishedChipBySlug(
  db: Database.Database,
  slug: string,
): PublicGalleryChip | null {
  const row = db
    .prepare(
      `SELECT p.*, u.display_name AS owner_display_name,
              (SELECT COUNT(*) FROM likes l WHERE l.published_chip_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.published_chip_id = p.id) AS comment_count
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.slug = ? AND p.is_public = 1 AND p.moderation_status = 'visible'`,
    )
    .get(slug) as PublicGalleryChipRow | undefined
  return row === undefined ? null : toPublicGalleryChip(row)
}
