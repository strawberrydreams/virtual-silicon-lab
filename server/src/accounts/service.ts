import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { hashPassword, verifyPassword } from './passwords'
import type { SignupInput } from './validation'

export type AccountUser = { id: string; email: string; displayName: string; createdAt: number }
export type AccountSessionUser = AccountUser & { bannedAt: number | null }

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

type UserRow = { id: string; email: string; display_name: string; created_at: number }
type UserAuthRow = UserRow & { banned_at: number | null }

function toUser(row: UserRow): AccountUser {
  return { id: row.id, email: row.email, displayName: row.display_name, createdAt: row.created_at }
}

function toSessionUser(row: UserAuthRow): AccountSessionUser {
  return { ...toUser(row), bannedAt: row.banned_at }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAccount(
  db: Database.Database,
  input: SignupInput,
  now: () => number,
  invitedViaCode: string | null = null,
): Promise<AccountUser | 'email-taken'> {
  const passwordHash = await hashPassword(input.password)
  const user: AccountUser = {
    id: randomUUID(),
    email: input.email,
    displayName: input.displayName,
    createdAt: now(),
  }
  try {
    db.prepare(
      `INSERT INTO users
        (id, email, display_name, password_hash, created_at, updated_at, invited_via_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      user.id,
      user.email,
      user.displayName,
      passwordHash,
      user.createdAt,
      user.createdAt,
      invitedViaCode,
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') return 'email-taken'
    throw error
  }
  return user
}

export async function verifyCredentials(
  db: Database.Database,
  email: string,
  password: string,
): Promise<AccountUser | null> {
  const row = db
    .prepare(
      'SELECT id, email, display_name, password_hash, created_at, banned_at FROM users WHERE email = ?',
    )
    .get(email) as (UserAuthRow & { password_hash: string }) | undefined
  if (row === undefined) return null
  if (row.banned_at !== null) return null
  if (!(await verifyPassword(row.password_hash, password))) return null
  return toUser(row)
}

/** Creates a session row and returns the raw token (only ever sent to the client). */
export function createSession(db: Database.Database, userId: string, now: () => number): string {
  const token = randomBytes(32).toString('base64url')
  db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(hashToken(token), userId, now(), now() + SESSION_TTL_MS)
  return token
}

/** Resolves a raw token to its user; expired sessions are deleted lazily. */
export function getSessionUser(
  db: Database.Database,
  token: string,
  now: () => number,
): AccountUser | null {
  const user = getSessionUserWithStatus(db, token, now)
  return user === null || user.bannedAt !== null ? null : user
}

export function getSessionUserWithStatus(
  db: Database.Database,
  token: string,
  now: () => number,
): AccountSessionUser | null {
  const tokenHash = hashToken(token)
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.created_at, u.banned_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as (UserAuthRow & { expires_at: number }) | undefined
  if (row === undefined) return null
  if (row.expires_at <= now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
    return null
  }
  return toSessionUser(row)
}

export function deleteSession(db: Database.Database, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

export function updateDisplayName(
  db: Database.Database,
  userId: string,
  displayName: string,
  now: () => number,
): AccountUser {
  db.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?').run(
    displayName,
    now(),
    userId,
  )
  const row = db
    .prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?')
    .get(userId) as UserRow
  return toUser(row)
}

/** Changes the password and invalidates every other session for the user. */
export async function changePassword(
  db: Database.Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepToken: string,
  now: () => number,
): Promise<'ok' | 'wrong-password'> {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined
  if (row === undefined || !(await verifyPassword(row.password_hash, currentPassword))) {
    return 'wrong-password'
  }
  const passwordHash = await hashPassword(newPassword)
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    passwordHash,
    now(),
    userId,
  )
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(
    userId,
    hashToken(keepToken),
  )
  return 'ok'
}

export async function deleteAccount(
  db: Database.Database,
  userId: string,
  password: string,
): Promise<'ok' | 'wrong-password'> {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined
  if (row === undefined || !(await verifyPassword(row.password_hash, password))) {
    return 'wrong-password'
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId) // sessions cascade via FK
  return 'ok'
}
