import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUser, type AccountUser } from '../accounts/service'
import { isAdminEmail } from '../moderation/adminAuth'
import {
  createComment,
  deleteComment,
  getCommentMeta,
  getLikeState,
  isChipReactable,
  likeChip,
  listComments,
  unlikeChip,
} from './service'

const SESSION_COOKIE = 'vsl_session'
type ErrorStatus = 400 | 401 | 403 | 404
const MAX_COMMENT_LENGTH = 1000

export function reactionsRoutes({ db, sessionSecret, now = Date.now, adminEmails = [] }: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function readUser(c: Context): Promise<AccountUser | null> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') return null
    return getSessionUser(db, token, now)
  }

  routes.post('/published-chips/:id/like', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    likeChip(db, chipId, user.id, now)
    return c.json(getLikeState(db, chipId, user.id))
  })

  routes.delete('/published-chips/:id/like', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    unlikeChip(db, chipId, user.id)
    return c.json(getLikeState(db, chipId, user.id))
  })

  routes.get('/published-chips/:id/comments', (c) => {
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ comments: listComments(db, chipId) })
  })

  routes.post('/published-chips/:id/comments', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const text = typeof body?.body === 'string' ? body.body.trim() : ''
    if (text === '' || text.length > MAX_COMMENT_LENGTH) {
      return fail(c, 400, 'INVALID_INPUT', `body must be 1 to ${MAX_COMMENT_LENGTH} characters.`)
    }
    const comment = createComment(
      db,
      { publishedChipId: chipId, authorUserId: user.id, body: text },
      now,
    )
    return c.json({ comment }, 201)
  })

  routes.delete('/published-chips/:id/comments/:commentId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const meta = getCommentMeta(db, c.req.param('commentId'))
    if (meta === null || meta.publishedChipId !== c.req.param('id')) {
      return fail(c, 404, 'NOT_FOUND', 'Comment not found.')
    }
    const isAuthor = meta.authorUserId === user.id
    if (!isAuthor && !isAdminEmail(user.email, adminEmails)) {
      return fail(c, 403, 'FORBIDDEN', 'You can only delete your own comments.')
    }
    deleteComment(db, meta.id)
    return c.body(null, 204)
  })

  return routes
}
