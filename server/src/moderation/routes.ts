import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUser, type AccountUser } from '../accounts/service'
import { isAdminEmail } from './adminAuth'
import {
  adminDeleteChip,
  createReport,
  hideChip,
  listChipsForModeration,
  listReports,
  resolveReport,
  unhideChip,
  type ReportStatus,
} from './service'

const SESSION_COOKIE = 'vsl_session'
type ErrorStatus = 400 | 401 | 403 | 404

const REPORT_STATUSES: ReportStatus[] = ['open', 'resolved', 'dismissed']
const MAX_REASON_LENGTH = 500

export function moderationRoutes({
  db,
  sessionSecret,
  now = Date.now,
  adminEmails = [],
  imageStore,
}: AppDeps) {
  const routes = new Hono<{ Variables: { adminUser: AccountUser } }>()

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

  routes.use('/admin/*', async (c, next) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')
    c.set('adminUser', admin)
    await next()
  })

  routes.post('/reports', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    if (body === null || typeof body.publishedChipId !== 'string' || body.publishedChipId === '') {
      return fail(c, 400, 'INVALID_INPUT', 'publishedChipId is required.')
    }
    let reason: string | null = null
    if (body.reason !== undefined) {
      if (typeof body.reason !== 'string' || body.reason.length > MAX_REASON_LENGTH) {
        return fail(
          c,
          400,
          'INVALID_INPUT',
          `reason must be a string up to ${MAX_REASON_LENGTH} chars.`,
        )
      }
      reason = body.reason
    }
    const report = createReport(
      db,
      { publishedChipId: body.publishedChipId, reporterUserId: user.id, reason },
      now,
    )
    if (report === 'chip-not-found') return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ report }, 201)
  })

  routes.get('/admin/reports', async (c) => {
    const statusParam = c.req.query('status') ?? 'open'
    if (!REPORT_STATUSES.includes(statusParam as ReportStatus)) {
      return fail(c, 400, 'INVALID_INPUT', 'status must be open, resolved, or dismissed.')
    }
    return c.json({ reports: listReports(db, statusParam as ReportStatus) })
  })

  routes.patch('/admin/reports/:id', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    if (body === null || (body.status !== 'resolved' && body.status !== 'dismissed')) {
      return fail(c, 400, 'INVALID_INPUT', 'status must be resolved or dismissed.')
    }
    const report = resolveReport(db, c.req.param('id'), body.status, c.get('adminUser').id, now)
    if (report === null) return fail(c, 404, 'NOT_FOUND', 'Report not found.')
    return c.json({ report })
  })

  routes.get('/admin/published-chips', async (c) => {
    return c.json({ chips: listChipsForModeration(db) })
  })

  routes.post('/admin/published-chips/:id/hide', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, MAX_REASON_LENGTH) : null
    if (!hideChip(db, c.req.param('id'), c.get('adminUser').id, reason, now)) {
      return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    }
    return c.json({ ok: true })
  })

  routes.post('/admin/published-chips/:id/unhide', async (c) => {
    if (!unhideChip(db, c.req.param('id'), now)) {
      return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    }
    return c.json({ ok: true })
  })

  routes.delete('/admin/published-chips/:id', async (c) => {
    if (!adminDeleteChip(db, c.req.param('id'), imageStore)) {
      return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    }
    return c.body(null, 204)
  })

  return routes
}
