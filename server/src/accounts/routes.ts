import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import {
  createAccount,
  createSession,
  getSessionUser,
  SESSION_TTL_MS,
  type AccountUser,
} from './service'
import { validateSignupInput } from './validation'

const SESSION_COOKIE = 'vsl_session'

type ErrorStatus = 400 | 401 | 409

export function accountRoutes({ db, sessionSecret, now = Date.now }: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function setSessionCookie(c: Context, token: string) {
    await setSignedCookie(c, SESSION_COOKIE, token, sessionSecret, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: SESSION_TTL_MS / 1000,
    })
  }

  function clearSessionCookie(c: Context) {
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
  }

  async function readSession(c: Context): Promise<{ token: string; user: AccountUser } | null> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') return null
    const user = getSessionUser(db, token, now)
    return user === null ? null : { token, user }
  }
  void readSession // used from Task 6 onward
  void clearSessionCookie // used from Task 7 onward

  routes.post('/auth/signup', async (c) => {
    const input = validateSignupInput(await c.req.json().catch(() => null))
    if (!input.ok) return fail(c, 400, 'INVALID_INPUT', input.message)
    const user = await createAccount(db, input.value, now)
    if (user === 'email-taken') {
      return fail(c, 409, 'EMAIL_TAKEN', 'An account with this email already exists.')
    }
    await setSessionCookie(c, createSession(db, user.id, now))
    return c.json({ user }, 201)
  })

  return routes
}
