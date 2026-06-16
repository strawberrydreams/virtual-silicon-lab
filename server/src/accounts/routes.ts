import { Hono } from 'hono'
import type { Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { resolveAccessMode, type AppDeps } from '../app'
import { redeemInviteCode } from '../invites/service'
import { normalizeInviteCode } from '../invites/validation'
import { isAdminEmail } from '../moderation/adminAuth'
import { resolvePublicBaseUrl } from '../share/baseUrl'
import {
  changePassword,
  createAccount,
  deleteAccount,
  createSession,
  deleteSession,
  findUserIdByEmail,
  getSessionUser,
  markEmailVerified,
  resetPasswordAndRevokeSessions,
  SESSION_TTL_MS,
  updateDisplayName,
  verifyCredentials,
  type AccountUser,
} from './service'
import { consumeToken, issueToken } from './tokens'
import {
  validateEmail,
  validateDisplayName,
  validateLoginInput,
  validatePassword,
  validateSignupInput,
} from './validation'

const SESSION_COOKIE = 'vsl_session'
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

type ErrorStatus = 400 | 401 | 403 | 409

export function accountRoutes({
  db,
  sessionSecret,
  now = Date.now,
  secureCookies = false,
  accessMode,
  signupsOpen,
  emailProvider,
  publicBaseUrl,
  adminEmails = [],
}: AppDeps) {
  const routes = new Hono()
  const resolvedAccessMode = resolveAccessMode({ accessMode, signupsOpen })

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

  async function sendAccountEmail(
    c: Context,
    input: { to: string; subject: string; path: string; intro: string },
  ) {
    if (emailProvider === undefined) return
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    const url = `${baseUrl}${input.path}`
    try {
      await emailProvider.sendEmail({
        to: input.to,
        subject: input.subject,
        text: `${input.intro}\n\n${url}`,
        html: `<p>${input.intro}</p><p><a href="${url}">${url}</a></p>`,
      })
    } catch (error) {
      console.error(`Failed to send account email to ${input.to}:`, error)
    }
  }

  routes.post('/auth/signup', async (c) => {
    if (resolvedAccessMode === 'closed') {
      return fail(c, 403, 'SIGNUPS_CLOSED', 'New sign-ups are currently closed.')
    }
    const input = validateSignupInput(await c.req.json().catch(() => null))
    if (!input.ok) return fail(c, 400, 'INVALID_INPUT', input.message)
    let invitedViaCode: string | null = null
    if (resolvedAccessMode === 'invite') {
      const code = normalizeInviteCode(input.value.inviteCode)
      const result = code === '' ? 'invalid' : redeemInviteCode(db, code, now)
      if (result !== 'ok') {
        return fail(c, 400, 'INVALID_INVITE', 'A valid invite code is required.')
      }
      invitedViaCode = code
    }
    const user = await createAccount(db, input.value, now, invitedViaCode)
    if (user === 'email-taken') {
      return fail(c, 409, 'EMAIL_TAKEN', 'An account with this email already exists.')
    }
    const token = issueToken(db, 'email_verification_tokens', user.id, EMAIL_VERIFICATION_TTL_MS, now)
    await sendAccountEmail(c, {
      to: user.email,
      subject: 'Verify your Virtual Silicon Lab account',
      path: `/verify-email?token=${token}`,
      intro: 'Verify your Virtual Silicon Lab account with this link:',
    })
    await setSessionCookie(c, createSession(db, user.id, now))
    return c.json({ user }, 201)
  })

  routes.post('/auth/verify-email', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const token = typeof body?.token === 'string' ? body.token : ''
    const userId = token === '' ? null : consumeToken(db, 'email_verification_tokens', token, now)
    if (userId === null) return fail(c, 400, 'INVALID_TOKEN', 'Verification link is invalid or expired.')
    const user = markEmailVerified(db, userId, now)
    if (user === null) return fail(c, 400, 'INVALID_TOKEN', 'Verification link is invalid or expired.')
    return c.json({ user })
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

  routes.post('/auth/forgot-password', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const email = validateEmail(body?.email)
    if (email.ok) {
      const userId = findUserIdByEmail(db, email.value)
      if (userId !== null) {
        const token = issueToken(db, 'password_reset_tokens', userId, PASSWORD_RESET_TTL_MS, now)
        await sendAccountEmail(c, {
          to: email.value,
          subject: 'Reset your Virtual Silicon Lab password',
          path: `/reset-password?token=${token}`,
          intro: 'Reset your Virtual Silicon Lab password with this link:',
        })
      }
    }
    return c.json({ ok: true })
  })

  routes.post('/auth/reset-password', async (c) => {
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const token = typeof body?.token === 'string' ? body.token : ''
    const password = validatePassword(body?.password)
    if (!password.ok) return fail(c, 400, 'INVALID_INPUT', password.message)
    const userId = token === '' ? null : consumeToken(db, 'password_reset_tokens', token, now)
    if (userId === null) return fail(c, 400, 'INVALID_TOKEN', 'Reset link is invalid or expired.')
    if (!(await resetPasswordAndRevokeSessions(db, userId, password.value, now))) {
      return fail(c, 400, 'INVALID_TOKEN', 'Reset link is invalid or expired.')
    }
    return c.json({ ok: true })
  })

  routes.get('/me', async (c) => {
    const session = await readSession(c)
    if (session === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    return c.json({ user: session.user, isAdmin: isAdminEmail(session.user.email, adminEmails) })
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
