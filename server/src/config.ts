export type AccessMode = 'closed' | 'invite' | 'open'

export type RuntimeConfig = {
  sessionSecret: string
  usedInsecureDevelopmentSecret: boolean
  secureCookies: boolean
  publicBaseUrl?: string
  uploadMaxBytes: number
  accessMode: AccessMode
  adminEmails: string[]
  rateLimit?: {
    windowMs: number
    max: number
  }
}

type RuntimeEnv = Record<string, string | undefined>

const DEVELOPMENT_SESSION_SECRET = 'dev-insecure-session-secret'
const DEFAULT_UPLOAD_MAX_BYTES = 8 * 1024 * 1024
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_RATE_LIMIT_MAX = 120

function parseBaseUrl(value: string, field: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${field} must be a valid URL.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${field} must be an http(s) URL.`)
  }
  return url.toString().replace(/\/$/, '')
}

function readPositiveInteger(env: RuntimeEnv, key: string, fallback: number): number {
  const raw = env[key]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer.`)
  }
  return value
}

function parseBoolean(env: RuntimeEnv, key: string, fallback: boolean): boolean {
  const raw = env[key]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = raw.trim().toLowerCase()
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  throw new Error(`${key} must be true or false.`)
}

function parseAccessMode(env: RuntimeEnv): AccessMode {
  const raw = env.VSL_ACCESS_MODE?.trim().toLowerCase()
  if (raw === 'closed' || raw === 'invite' || raw === 'open') return raw
  if (raw !== undefined && raw !== '') {
    throw new Error('VSL_ACCESS_MODE must be closed, invite, or open.')
  }
  return parseBoolean(env, 'VSL_SIGNUPS_OPEN', false) ? 'open' : 'closed'
}

function parseAdminEmails(env: RuntimeEnv): string[] {
  const raw = env.VSL_ADMIN_EMAILS
  if (raw === undefined) return []
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== '')
}

export function loadRuntimeConfig(env: RuntimeEnv = process.env): RuntimeConfig {
  const isProduction = env.NODE_ENV === 'production'
  const uploadMaxBytes = readPositiveInteger(env, 'VSL_UPLOAD_MAX_BYTES', DEFAULT_UPLOAD_MAX_BYTES)
  const accessMode = parseAccessMode(env)
  const adminEmails = parseAdminEmails(env)

  const sessionSecret = env.VSL_SESSION_SECRET
  if (isProduction) {
    if (sessionSecret === undefined || sessionSecret === '') {
      throw new Error('VSL_SESSION_SECRET is required in production.')
    }
    if (sessionSecret.length < 32) {
      throw new Error('VSL_SESSION_SECRET must be at least 32 characters in production.')
    }
    if (env.VSL_PUBLIC_BASE_URL === undefined || env.VSL_PUBLIC_BASE_URL === '') {
      throw new Error('VSL_PUBLIC_BASE_URL is required in production.')
    }

    return {
      sessionSecret,
      usedInsecureDevelopmentSecret: false,
      secureCookies: true,
      publicBaseUrl: parseBaseUrl(env.VSL_PUBLIC_BASE_URL, 'VSL_PUBLIC_BASE_URL'),
      uploadMaxBytes,
      accessMode,
      adminEmails,
      rateLimit: {
        windowMs: readPositiveInteger(
          env,
          'VSL_RATE_LIMIT_WINDOW_MS',
          DEFAULT_RATE_LIMIT_WINDOW_MS,
        ),
        max: readPositiveInteger(env, 'VSL_RATE_LIMIT_MAX', DEFAULT_RATE_LIMIT_MAX),
      },
    }
  }

  return {
    sessionSecret: sessionSecret || DEVELOPMENT_SESSION_SECRET,
    usedInsecureDevelopmentSecret: sessionSecret === undefined || sessionSecret === '',
    secureCookies: false,
    publicBaseUrl:
      env.VSL_PUBLIC_BASE_URL === undefined || env.VSL_PUBLIC_BASE_URL === ''
        ? undefined
        : parseBaseUrl(env.VSL_PUBLIC_BASE_URL, 'VSL_PUBLIC_BASE_URL'),
    uploadMaxBytes,
    accessMode,
    adminEmails,
  }
}
