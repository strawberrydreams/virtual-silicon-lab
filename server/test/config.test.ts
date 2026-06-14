import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from '../src/config'

describe('loadRuntimeConfig', () => {
  it('keeps development startup local-friendly with explicit insecure fallback metadata', () => {
    const config = loadRuntimeConfig({ NODE_ENV: 'development' })

    expect(config.sessionSecret).toBe('dev-insecure-session-secret')
    expect(config.usedInsecureDevelopmentSecret).toBe(true)
    expect(config.secureCookies).toBe(false)
    expect(config.publicBaseUrl).toBeUndefined()
  })

  it('requires a strong session secret in production', () => {
    expect(() => loadRuntimeConfig({ NODE_ENV: 'production', VSL_PUBLIC_BASE_URL: 'https://vsl.example' })).toThrow(
      'VSL_SESSION_SECRET is required in production.',
    )
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        VSL_SESSION_SECRET: 'too-short',
        VSL_PUBLIC_BASE_URL: 'https://vsl.example',
      }),
    ).toThrow('VSL_SESSION_SECRET must be at least 32 characters in production.')
  })

  it('requires a valid public base URL in production', () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        VSL_SESSION_SECRET: '0123456789abcdef0123456789abcdef',
      }),
    ).toThrow('VSL_PUBLIC_BASE_URL is required in production.')

    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: 'production',
        VSL_SESSION_SECRET: '0123456789abcdef0123456789abcdef',
        VSL_PUBLIC_BASE_URL: 'file:///tmp/vsl',
      }),
    ).toThrow('VSL_PUBLIC_BASE_URL must be an http(s) URL.')
  })

  it('enables production-safe defaults when required env is present', () => {
    const config = loadRuntimeConfig({
      NODE_ENV: 'production',
      VSL_SESSION_SECRET: '0123456789abcdef0123456789abcdef',
      VSL_PUBLIC_BASE_URL: 'https://vsl.example/',
    })

    expect(config.sessionSecret).toBe('0123456789abcdef0123456789abcdef')
    expect(config.publicBaseUrl).toBe('https://vsl.example')
    expect(config.secureCookies).toBe(true)
    expect(config.rateLimit).toEqual({ windowMs: 60_000, max: 120 })
    expect(config.uploadMaxBytes).toBe(8 * 1024 * 1024)
  })

  it('defaults signupsOpen to false and adminEmails to empty', () => {
    const config = loadRuntimeConfig({})
    expect(config.signupsOpen).toBe(false)
    expect(config.adminEmails).toEqual([])
  })

  it('parses VSL_SIGNUPS_OPEN and a comma-separated, normalized VSL_ADMIN_EMAILS', () => {
    const config = loadRuntimeConfig({
      VSL_SIGNUPS_OPEN: 'true',
      VSL_ADMIN_EMAILS: ' Ada@Example.com , grace@example.com ,',
    })
    expect(config.signupsOpen).toBe(true)
    expect(config.adminEmails).toEqual(['ada@example.com', 'grace@example.com'])
  })

  it('rejects a non-boolean VSL_SIGNUPS_OPEN', () => {
    expect(() => loadRuntimeConfig({ VSL_SIGNUPS_OPEN: 'maybe' })).toThrow(/VSL_SIGNUPS_OPEN/)
  })
})
