import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { getSessionUser, type AccountUser } from '../accounts/service'
import type { AppDeps } from '../app'
import { isAdminEmail } from '../moderation/adminAuth'
import { resolvePublicBaseUrl } from '../share/baseUrl'
import {
  castVote,
  chipEligibleForUser,
  createContest,
  createEntry,
  deleteContest,
  entryOwner,
  getContestDetail,
  getContestStatus,
  getEntryMeta,
  listPublicContests,
  retractVote,
  updateContest,
  withdrawEntry,
  type ContestDetail,
  type ContestStatus,
} from './service'

const SESSION_COOKIE = 'vsl_session'
const VALID_STATUSES: ContestStatus[] = ['draft', 'submission', 'voting', 'results']
const MAX_TITLE = 120
const MAX_THEME = 2000

type ErrorStatus = 400 | 401 | 403 | 404 | 409

function resolveImageUrl(baseUrl: string, imagePath: string | null, legacyDataUrl: string) {
  return imagePath === null ? legacyDataUrl : `${baseUrl}${imagePath}`
}

function serializeDetail(detail: ContestDetail, baseUrl: string) {
  return {
    id: detail.id,
    title: detail.title,
    theme: detail.theme,
    status: detail.status,
    createdAt: detail.createdAt,
    myEntryId: detail.myEntryId,
    myVoteEntryId: detail.myVoteEntryId,
    entries: detail.entries.map((entry) => ({
      entryId: entry.entryId,
      publishedChipId: entry.publishedChipId,
      slug: entry.slug,
      title: entry.title,
      ownerDisplayName: entry.ownerDisplayName,
      posterImageUrl: resolveImageUrl(baseUrl, entry.posterImagePath, entry.posterImageDataUrl),
      voteCount: entry.voteCount,
      rank: entry.rank,
    })),
  }
}

export function contestRoutes({
  db,
  sessionSecret,
  now = Date.now,
  adminEmails = [],
  publicBaseUrl,
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

  async function readAdmin(c: Context): Promise<AccountUser | 'unauthorized' | 'forbidden'> {
    const user = await readUser(c)
    if (user === null) return 'unauthorized'
    if (!isAdminEmail(user.email, adminEmails)) return 'forbidden'
    return user
  }

  routes.post('/admin/contests', async (c) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : ''
    if (title === '' || title.length > MAX_TITLE || theme === '' || theme.length > MAX_THEME) {
      return fail(c, 400, 'INVALID_INPUT', 'title and theme are required within length limits.')
    }

    const contest = createContest(db, { title, theme, createdBy: admin.id }, now)
    return c.json({ contest }, 201)
  })

  routes.patch('/admin/contests/:id', async (c) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const patch: { title?: string; theme?: string; status?: ContestStatus } = {}
    if (body?.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (title === '' || title.length > MAX_TITLE) {
        return fail(
          c,
          400,
          'INVALID_INPUT',
          'title must be a non-empty string within length limits.',
        )
      }
      patch.title = title
    }
    if (body?.theme !== undefined) {
      const theme = typeof body.theme === 'string' ? body.theme.trim() : ''
      if (theme === '' || theme.length > MAX_THEME) {
        return fail(
          c,
          400,
          'INVALID_INPUT',
          'theme must be a non-empty string within length limits.',
        )
      }
      patch.theme = theme
    }
    if (body?.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as ContestStatus)) {
        return fail(
          c,
          400,
          'INVALID_INPUT',
          'status must be draft, submission, voting, or results.',
        )
      }
      patch.status = body.status as ContestStatus
    }

    const contest = updateContest(db, c.req.param('id'), patch, now)
    if (contest === null) return fail(c, 404, 'NOT_FOUND', 'Contest not found.')
    return c.json({ contest })
  })

  routes.delete('/admin/contests/:id', async (c) => {
    const admin = await readAdmin(c)
    if (admin === 'unauthorized') return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (admin === 'forbidden') return fail(c, 403, 'FORBIDDEN', 'Admin access required.')
    if (!deleteContest(db, c.req.param('id')))
      return fail(c, 404, 'NOT_FOUND', 'Contest not found.')
    return c.body(null, 204)
  })

  routes.get('/contests', (c) => c.json({ contests: listPublicContests(db) }))

  routes.get('/contests/:id', async (c) => {
    const user = await readUser(c)
    const detail = getContestDetail(db, c.req.param('id'), user?.id ?? null)
    if (detail === null) return fail(c, 404, 'NOT_FOUND', 'Contest not found.')
    return c.json({
      contest: serializeDetail(detail, resolvePublicBaseUrl(c.req.url, publicBaseUrl)),
    })
  })

  routes.post('/contests/:id/entries', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    const contestId = c.req.param('id')
    const status = getContestStatus(db, contestId)
    if (status === null) return fail(c, 404, 'NOT_FOUND', 'Contest not found.')
    if (status !== 'submission') return fail(c, 409, 'WRONG_PHASE', 'Submissions are not open.')

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const chipId = typeof body?.publishedChipId === 'string' ? body.publishedChipId : ''
    if (chipId === '' || !chipEligibleForUser(db, chipId, user.id)) {
      return fail(c, 400, 'INVALID_INPUT', 'publishedChipId must be your own public chip.')
    }

    const entry = createEntry(db, { contestId, publishedChipId: chipId, ownerUserId: user.id }, now)
    if (entry === 'duplicate')
      return fail(c, 409, 'ALREADY_ENTERED', 'You already entered this contest.')
    return c.json({ entry }, 201)
  })

  routes.delete('/contests/:id/entries/:entryId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    const meta = getEntryMeta(db, c.req.param('entryId'))
    if (meta === null || meta.contestId !== c.req.param('id'))
      return fail(c, 404, 'NOT_FOUND', 'Entry not found.')

    const isAdmin = isAdminEmail(user.email, adminEmails)
    if (meta.ownerUserId !== user.id && !isAdmin) {
      return fail(c, 403, 'FORBIDDEN', 'You can only withdraw your own entry.')
    }
    if (!isAdmin && getContestStatus(db, meta.contestId) !== 'submission') {
      return fail(c, 409, 'WRONG_PHASE', 'Submissions are closed.')
    }

    withdrawEntry(db, meta.id)
    return c.body(null, 204)
  })

  routes.post('/contests/:id/vote', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    const contestId = c.req.param('id')
    const status = getContestStatus(db, contestId)
    if (status === null) return fail(c, 404, 'NOT_FOUND', 'Contest not found.')
    if (status !== 'voting') return fail(c, 409, 'WRONG_PHASE', 'Voting is not open.')

    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const entryId = typeof body?.entryId === 'string' ? body.entryId : ''
    const owner = entryId === '' ? null : entryOwner(db, entryId)
    if (owner === null || owner.contestId !== contestId)
      return fail(c, 404, 'NOT_FOUND', 'Entry not found.')
    if (owner.ownerUserId === user.id)
      return fail(c, 403, 'SELF_VOTE', 'You cannot vote for your own entry.')

    castVote(db, { contestId, entryId, voterUserId: user.id }, now)
    return c.json({ myVoteEntryId: entryId })
  })

  routes.delete('/contests/:id/vote', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    const contestId = c.req.param('id')
    const status = getContestStatus(db, contestId)
    if (status === null) return fail(c, 404, 'NOT_FOUND', 'Contest not found.')
    if (status !== 'voting') return fail(c, 409, 'WRONG_PHASE', 'Voting is not open.')

    retractVote(db, contestId, user.id)
    return c.json({ myVoteEntryId: null })
  })

  return routes
}
