import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { getSessionUser, type AccountUser } from '../accounts/service'
import type { AppDeps } from '../app'
import { isAdminEmail } from '../moderation/adminAuth'
import { createInviteCode, listInviteCodes, revokeInviteCode } from './service'
import { validateMaxUses } from './validation'

const SESSION_COOKIE = 'vsl_session'
const MAX_NOTE_LENGTH = 200

type ErrorStatus = 400 | 401 | 403 | 404

export function inviteRoutes({ db, sessionSecret, now = Date.now, adminEmails = [] }: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function readUser(c: Context): Promise<AccountUser | null> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') return null
    return getSessionUser(db, token, now)
  }

  async function readAdmin(c: Context): Promise<AccountUser | 'unauthorized' | 'forbidden'> {
    const user = await readUser(c)
    if (user === null) return 'unauthorized'
    if (!isAdminEmail(user.email, adminEmails)) return 'forbidden'
    return user
  }

  function normalizeNote(raw: unknown): string | null {
    if (raw === undefined || raw === null) return null
    if (typeof raw !== 'string') return null
    const note = raw.trim()
    return note === '' ? null : note.slice(0, MAX_NOTE_LENGTH)
  }

  routes.get('/admin/invite-codes', async (c) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')
    return c.json({ inviteCodes: listInviteCodes(db) })
  })

  routes.post('/admin/invite-codes', async (c) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const maxUses = validateMaxUses(body?.maxUses)
    if (!maxUses.ok) return fail(c, 400, 'INVALID_INPUT', maxUses.message)
    const expiresAt =
      typeof body?.expiresAt === 'number' && Number.isInteger(body.expiresAt) && body.expiresAt > 0
        ? body.expiresAt
        : null
    const inviteCode = createInviteCode(
      db,
      { createdBy: admin.id, maxUses: maxUses.value, expiresAt, note: normalizeNote(body?.note) },
      now,
    )
    return c.json({ inviteCode }, 201)
  })

  routes.delete('/admin/invite-codes/:code', async (c) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')
    if (!revokeInviteCode(db, c.req.param('code'))) {
      return fail(c, 404, 'NOT_FOUND', 'Invite code not found.')
    }
    return c.body(null, 204)
  })

  return routes
}
