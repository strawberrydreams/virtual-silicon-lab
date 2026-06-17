import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUser } from '../accounts/service'
import { resolvePublicBaseUrl } from '../share/baseUrl'
import { getProfileByHandle, setHandle, type PublicProfile } from './service'
import { validateHandle } from './validation'

const SESSION_COOKIE = 'vsl_session'
type ErrorStatus = 400 | 401 | 404 | 409

function resolveImageUrl(baseUrl: string, imagePath: string | null, legacyDataUrl: string) {
  return imagePath === null ? legacyDataUrl : `${baseUrl}${imagePath}`
}

function serializeProfile(profile: PublicProfile, baseUrl: string) {
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    chips: profile.chips.map((chip) => ({
      slug: chip.slug,
      title: chip.title,
      posterImageUrl: resolveImageUrl(baseUrl, chip.posterImagePath, chip.posterImageDataUrl),
    })),
  }
}

export function profileRoutes({
  db,
  sessionSecret,
  now = Date.now,
  publicBaseUrl,
  galleryLockdown = false,
}: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function readUser(c: Context) {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') return null
    return getSessionUser(db, token, now)
  }

  routes.patch('/me/handle', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const handle = validateHandle(body?.handle)
    if (!handle.ok) return fail(c, 400, 'INVALID_HANDLE', handle.message)
    const result = setHandle(db, user.id, handle.value)
    if (result === 'taken') return fail(c, 409, 'HANDLE_TAKEN', 'That handle is already taken.')
    return c.json({ user: { ...user, handle: handle.value } })
  })

  routes.get('/profiles/:handle', (c) => {
    if (galleryLockdown) return fail(c, 410, 'GALLERY_LOCKED', 'Gallery is temporarily locked.')
    const handle = validateHandle(c.req.param('handle'))
    if (!handle.ok) return fail(c, 404, 'NOT_FOUND', 'Profile not found.')
    const profile = getProfileByHandle(db, handle.value)
    if (profile === null) return fail(c, 404, 'NOT_FOUND', 'Profile not found.')
    return c.json({ profile: serializeProfile(profile, resolvePublicBaseUrl(c.req.url, publicBaseUrl)) })
  })

  return routes
}
