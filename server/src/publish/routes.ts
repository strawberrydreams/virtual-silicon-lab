import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUser, type AccountUser } from '../accounts/service'
import {
  deletePublishedChip,
  getPublicPublishedChipBySlug,
  getPublishedChipForOwnerProject,
  listOwnerPublicChips,
  listPublicPublishedChips,
  setPublishedChipVisibility,
  upsertPublishedChip,
  type GallerySort,
  type PublishedChip,
  type PublicGalleryChip,
} from './service'
import { validatePublishInput } from './validation'
import { getLikeState } from '../reactions/service'
import { buildShareUrl, resolvePublicBaseUrl } from '../share/baseUrl'

const SESSION_COOKIE = 'vsl_session'

type ErrorStatus = 400 | 401 | 404

function parseGallerySort(raw: string | undefined): GallerySort {
  return raw === 'top' || raw === 'newest' || raw === 'trending' ? raw : 'trending'
}

function serializePublishedChip(chip: PublishedChip, baseUrl: string) {
  return {
    id: chip.id,
    ownerUserId: chip.ownerUserId,
    sourceProjectId: chip.sourceProjectId,
    slug: chip.slug,
    title: chip.title,
    dieImageUrl: resolveImageUrl(baseUrl, chip.dieImagePath, chip.dieImageDataUrl),
    posterImageUrl: resolveImageUrl(baseUrl, chip.posterImagePath, chip.posterImageDataUrl),
    isPublic: chip.isPublic,
    shareUrl: chip.isPublic ? buildShareUrl(baseUrl, chip.slug) : null,
    version: chip.version,
    createdAt: chip.createdAt,
    updatedAt: chip.updatedAt,
    publishedAt: chip.publishedAt,
  }
}

function resolveImageUrl(baseUrl: string, imagePath: string | null, legacyDataUrl: string) {
  return imagePath === null ? legacyDataUrl : `${baseUrl}${imagePath}`
}

function serializeGallerySummary(chip: PublicGalleryChip, baseUrl: string) {
  return {
    id: chip.id,
    slug: chip.slug,
    title: chip.title,
    ownerDisplayName: chip.ownerDisplayName,
    dieImageUrl: resolveImageUrl(baseUrl, chip.dieImagePath, chip.dieImageDataUrl),
    posterImageUrl: resolveImageUrl(baseUrl, chip.posterImagePath, chip.posterImageDataUrl),
    version: chip.version,
    updatedAt: chip.updatedAt,
    publishedAt: chip.publishedAt,
    likeCount: chip.likeCount,
  }
}

function serializeGalleryDetail(chip: PublicGalleryChip, baseUrl: string, likedByMe: boolean) {
  return {
    ...serializeGallerySummary(chip, baseUrl),
    commentCount: chip.commentCount,
    likedByMe,
    project: JSON.parse(chip.projectJson) as unknown,
  }
}

export function publishRoutes({
  db,
  sessionSecret,
  now = Date.now,
  publicBaseUrl,
  uploadMaxBytes,
  imageStore,
}: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function readUser(c: Context): Promise<AccountUser | null> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') return null
    return getSessionUser(db, token, now)
  }

  routes.post('/published-chips', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const input = validatePublishInput(await c.req.json().catch(() => null), { maxPngBytes: uploadMaxBytes })
    if (!input.ok) return fail(c, 400, 'INVALID_INPUT', input.message)

    const existing = getPublishedChipForOwnerProject(db, user.id, input.value.project.id)
    const chip = upsertPublishedChip(db, user.id, input.value, now, imageStore)
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    return c.json({ chip: serializePublishedChip(chip, baseUrl) }, existing === null ? 201 : 200)
  })

  routes.get('/published-chips/mine', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    return c.json({
      chips: listOwnerPublicChips(db, user.id).map((chip) => ({
        id: chip.id,
        slug: chip.slug,
        title: chip.title,
        posterImageUrl: resolveImageUrl(baseUrl, chip.posterImagePath, chip.posterImageDataUrl),
      })),
    })
  })

  routes.get('/published-chips/source/:sourceProjectId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chip = getPublishedChipForOwnerProject(db, user.id, c.req.param('sourceProjectId'))
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ chip: serializePublishedChip(chip, resolvePublicBaseUrl(c.req.url, publicBaseUrl)) })
  })

  routes.patch('/published-chips/source/:sourceProjectId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    if (body === null || typeof body.isPublic !== 'boolean') {
      return fail(c, 400, 'INVALID_INPUT', 'isPublic must be a boolean.')
    }
    const chip = setPublishedChipVisibility(db, user.id, c.req.param('sourceProjectId'), body.isPublic, now)
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ chip: serializePublishedChip(chip, resolvePublicBaseUrl(c.req.url, publicBaseUrl)) })
  })

  routes.delete('/published-chips/source/:sourceProjectId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (!deletePublishedChip(db, user.id, c.req.param('sourceProjectId'), imageStore)) {
      return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    }
    return c.body(null, 204)
  })

  routes.get('/gallery', (c) => {
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    const sort = parseGallerySort(c.req.query('sort'))
    return c.json({
      chips: listPublicPublishedChips(db, { sort, now }).map((chip) => serializeGallerySummary(chip, baseUrl)),
    })
  })

  routes.get('/gallery/:slug', async (c) => {
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    const user = await readUser(c)
    const likedByMe = user === null ? false : getLikeState(db, chip.id, user.id).likedByMe
    return c.json({ chip: serializeGalleryDetail(chip, resolvePublicBaseUrl(c.req.url, publicBaseUrl), likedByMe) })
  })

  return routes
}
