import { createApp } from '../src/app'
import type { AppDeps } from '../src/app'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

export const TEST_SECRET = 'test-session-secret'

export function createTestApp(now: () => number = Date.now, options: Partial<Omit<AppDeps, 'db' | 'now'>> = {}) {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  return { app: createApp({ db, sessionSecret: TEST_SECRET, now, ...options }), db }
}

/** Extracts a `vsl_session=...` cookie pair from a response's set-cookie header. */
export function sessionCookie(res: Response): string {
  const header = res.headers.get('set-cookie') ?? ''
  const match = header.match(/vsl_session=([^;]+)/)
  if (match === null) throw new Error(`no vsl_session cookie in: ${header}`)
  return `vsl_session=${match[1]}`
}

export function jsonRequest(method: string, body: unknown, cookie?: string): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json', ...(cookie === undefined ? {} : { cookie }) },
    body: JSON.stringify(body),
  }
}

export const VALID_SIGNUP = {
  email: 'ada@example.com',
  displayName: 'Ada',
  password: 'hunter22hunter22',
}
