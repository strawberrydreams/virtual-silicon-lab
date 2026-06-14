export type RuntimeConfig = {
  sessionSecret: string
  usedInsecureDevelopmentSecret: boolean
  secureCookies: boolean
  publicBaseUrl?: string
  uploadMaxBytes: number
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

export function loadRuntimeConfig(env: RuntimeEnv = process.env): RuntimeConfig {
  const isProduction = env.NODE_ENV === 'production'
  const uploadMaxBytes = readPositiveInteger(env, 'VSL_UPLOAD_MAX_BYTES', DEFAULT_UPLOAD_MAX_BYTES)

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
      rateLimit: {
        windowMs: readPositiveInteger(env, 'VSL_RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS),
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
  }
}
