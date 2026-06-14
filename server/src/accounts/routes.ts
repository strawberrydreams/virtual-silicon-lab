import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import {
  changePassword,
  createAccount,
  deleteAccount,
  createSession,
  deleteSession,
  getSessionUser,
  SESSION_TTL_MS,
  updateDisplayName,
  verifyCredentials,
  type AccountUser,
} from './service'
import {
  validateDisplayName,
  validateLoginInput,
  validatePassword,
  validateSignupInput,
} from './validation'

const SESSION_COOKIE = 'vsl_session'

type ErrorStatus = 400 | 401 | 409

export function accountRoutes({ db, sessionSecret, now = Date.now, secureCookies = false }: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function setSessionCookie(c: Context, token: string) {
    await setSignedCookie(c, SESSION_COOKIE, token, sessionSecret, {
      path: '/',
      httpOnly: true,
      secure: secureCookies,
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

  routes.post('/auth/login', async (c) => {
    const input = validateLoginInput(await c.req.json().catch(() => null))
    if (!input.ok) return fail(c, 400, 'INVALID_INPUT', input.message)
    const user = await verifyCredentials(db, input.value.email, input.value.password)
    if (user === null) {
      return fail(c, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.')
    }
    await setSessionCookie(c, createSession(db, user.id, now))
    return c.json({ user })
  })

  routes.post('/auth/logout', async (c) => {
    const session = await readSession(c)
    if (session !== null) deleteSession(db, session.token)
    clearSessionCookie(c)
    return c.body(null, 204)
  })

  routes.get('/me', async (c) => {
    const session = await readSession(c)
    if (session === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    return c.json({ user: session.user })
  })

  routes.patch('/me', async (c) => {
    const session = await readSession(c)
    if (session === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    if (body === null || typeof body !== 'object') {
      return fail(c, 400, 'INVALID_INPUT', 'Expected a JSON object.')
    }

    let user = session.user
    if (body.displayName !== undefined) {
      const displayName = validateDisplayName(body.displayName)
      if (!displayName.ok) return fail(c, 400, 'INVALID_INPUT', displayName.message)
      user = updateDisplayName(db, user.id, displayName.value, now)
    }
    if (body.newPassword !== undefined) {
      const newPassword = validatePassword(body.newPassword)
      if (!newPassword.ok) return fail(c, 400, 'INVALID_INPUT', newPassword.message)
      if (typeof body.currentPassword !== 'string') {
        return fail(c, 400, 'INVALID_INPUT', 'currentPassword is required to change the password.')
      }
      const result = await changePassword(
        db,
        user.id,
        body.currentPassword,
        newPassword.value,
        session.token,
        now,
      )
      if (result === 'wrong-password') {
        return fail(c, 401, 'WRONG_PASSWORD', 'Current password is incorrect.')
      }
    }
    return c.json({ user })
  })

  routes.delete('/me', async (c) => {
    const session = await readSession(c)
    if (session === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    if (body === null || typeof body.password !== 'string') {
      return fail(c, 400, 'INVALID_INPUT', 'password is required to delete the account.')
    }
    const result = await deleteAccount(db, session.user.id, body.password)
    if (result === 'wrong-password') {
      return fail(c, 401, 'WRONG_PASSWORD', 'Password is incorrect.')
    }
    clearSessionCookie(c)
    return c.body(null, 204)
  })

  return routes
}
