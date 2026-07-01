import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUserWithStatus, type AccountUser } from '../accounts/service'
import {
  deleteSyncedProject,
  listSyncedProjectsSince,
  pushSyncedProject,
  type SyncedProjectRecord,
} from './service'
import { validateSyncPush } from './validation'

const SESSION_COOKIE = 'vsl_session'

type ErrorStatus = 400 | 401 | 403

function serializeRecord(record: SyncedProjectRecord) {
  return {
    projectId: record.projectId,
    updatedAt: record.updatedAt,
    deleted: record.deleted,
    project: record.deleted ? null : (JSON.parse(record.projectJson) as unknown),
  }
}

export function syncRoutes({ db, sessionSecret, now = Date.now }: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function requireActiveUser(c: Context): Promise<AccountUser | Response> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') {
      return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    }
    const user = getSessionUserWithStatus(db, token, now)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (user.bannedAt !== null) return fail(c, 403, 'ACCOUNT_BANNED', 'This account is banned.')
    return user
  }

  routes.get('/sync/projects', async (c) => {
    const user = await requireActiveUser(c)
    if (user instanceof Response) return user
    const sinceRaw = c.req.query('since')
    const sinceNum = Number(sinceRaw)
    const since = sinceRaw !== undefined && Number.isFinite(sinceNum) ? sinceNum : 0
    const records = listSyncedProjectsSince(db, user.id, since)
    return c.json({ projects: records.map(serializeRecord) })
  })

  routes.put('/sync/projects/:id', async (c) => {
    const user = await requireActiveUser(c)
    if (user instanceof Response) return user
    const projectId = c.req.param('id')
    const body = await c.req.json().catch(() => null)
    const validated = validateSyncPush(body, projectId)
    if (!validated.ok) return fail(c, 400, 'INVALID_INPUT', validated.message)
    const record = pushSyncedProject(
      db,
      user.id,
      projectId,
      validated.projectJson,
      validated.updatedAt,
    )
    return c.json({ project: serializeRecord(record) })
  })

  routes.delete('/sync/projects/:id', async (c) => {
    const user = await requireActiveUser(c)
    if (user instanceof Response) return user
    const record = deleteSyncedProject(db, user.id, c.req.param('id'), now())
    return c.json({ project: serializeRecord(record) })
  })

  return routes
}
