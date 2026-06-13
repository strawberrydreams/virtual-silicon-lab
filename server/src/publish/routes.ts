import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUser, type AccountUser } from '../accounts/service'
import {
  deletePublishedChip,
  getPublicPublishedChipBySlug,
  getPublishedChipForOwnerProject,
  listPublicPublishedChips,
  setPublishedChipVisibility,
  upsertPublishedChip,
  type PublishedChip,
  type PublicGalleryChip,
} from './service'
import { validatePublishInput } from './validation'

const SESSION_COOKIE = 'vsl_session'

type ErrorStatus = 400 | 401 | 404

function serializePublishedChip(chip: PublishedChip) {
  return {
    id: chip.id,
    ownerUserId: chip.ownerUserId,
    sourceProjectId: chip.sourceProjectId,
    slug: chip.slug,
    title: chip.title,
    dieImageUrl: chip.dieImageDataUrl,
    posterImageUrl: chip.posterImageDataUrl,
    isPublic: chip.isPublic,
    version: chip.version,
    createdAt: chip.createdAt,
    updatedAt: chip.updatedAt,
    publishedAt: chip.publishedAt,
  }
}

function serializeGallerySummary(chip: PublicGalleryChip) {
  return {
    id: chip.id,
    slug: chip.slug,
    title: chip.title,
    ownerDisplayName: chip.ownerDisplayName,
    dieImageUrl: chip.dieImageDataUrl,
    posterImageUrl: chip.posterImageDataUrl,
    version: chip.version,
    updatedAt: chip.updatedAt,
    publishedAt: chip.publishedAt,
  }
}

function serializeGalleryDetail(chip: PublicGalleryChip) {
  return {
    ...serializeGallerySummary(chip),
    project: JSON.parse(chip.projectJson) as unknown,
  }
}

export function publishRoutes({ db, sessionSecret, now = Date.now }: AppDeps) {
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
    const input = validatePublishInput(await c.req.json().catch(() => null))
    if (!input.ok) return fail(c, 400, 'INVALID_INPUT', input.message)

    const existing = getPublishedChipForOwnerProject(db, user.id, input.value.project.id)
    const chip = upsertPublishedChip(db, user.id, input.value, now)
    return c.json({ chip: serializePublishedChip(chip) }, existing === null ? 201 : 200)
  })

  routes.get('/published-chips/source/:sourceProjectId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chip = getPublishedChipForOwnerProject(db, user.id, c.req.param('sourceProjectId'))
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ chip: serializePublishedChip(chip) })
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
    return c.json({ chip: serializePublishedChip(chip) })
  })

  routes.delete('/published-chips/source/:sourceProjectId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (!deletePublishedChip(db, user.id, c.req.param('sourceProjectId'))) {
      return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    }
    return c.body(null, 204)
  })

  routes.get('/gallery', (c) => {
    return c.json({ chips: listPublicPublishedChips(db).map(serializeGallerySummary) })
  })

  routes.get('/gallery/:slug', (c) => {
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ chip: serializeGalleryDetail(chip) })
  })

  return routes
}
