import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { buildAppDeps } from '../src/app'
import { loadRuntimeConfig } from '../src/config'

// Regression guard for the launch incident kill switch: loadRuntimeConfig parses
// VSL_GALLERY_LOCKDOWN, but the value is useless unless the server entry point forwards
// it into createApp. buildAppDeps is the single mapping both index.ts and this test exercise,
// so a dropped field fails here instead of silently shipping an inert switch.
describe('buildAppDeps', () => {
  const db = new Database(':memory:')

  it('forwards the gallery lockdown kill switch from runtime config', () => {
    const on = buildAppDeps(loadRuntimeConfig({ VSL_GALLERY_LOCKDOWN: 'true' }), { db })
    expect(on.galleryLockdown).toBe(true)

    const off = buildAppDeps(loadRuntimeConfig({ VSL_GALLERY_LOCKDOWN: 'false' }), { db })
    expect(off.galleryLockdown).toBe(false)
  })

  it('forwards the launch-critical runtime config fields into app deps', () => {
    const config = loadRuntimeConfig({
      VSL_ACCESS_MODE: 'invite',
      VSL_ADMIN_EMAILS: 'ada@example.com',
      VSL_REQUIRE_VERIFIED_PUBLISH: 'true',
      VSL_GALLERY_LOCKDOWN: 'true',
      VSL_PUBLIC_BASE_URL: 'https://vsl.example',
    })
    const deps = buildAppDeps(config, { db })

    expect(deps).toMatchObject({
      sessionSecret: config.sessionSecret,
      secureCookies: config.secureCookies,
      publicBaseUrl: config.publicBaseUrl,
      uploadMaxBytes: config.uploadMaxBytes,
      accessMode: 'invite',
      adminEmails: ['ada@example.com'],
      requireVerifiedPublish: true,
      galleryLockdown: true,
    })
    expect(deps.db).toBe(db)
  })
})
