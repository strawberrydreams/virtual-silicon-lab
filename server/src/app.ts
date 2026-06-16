import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { accountRoutes } from './accounts/routes'
import { contestRoutes } from './contests/routes'
import type { AccessMode } from './config'
import type { PublishedImageStore } from './images/fileImageStore'
import { inviteRoutes } from './invites/routes'
import { moderationRoutes } from './moderation/routes'
import { publishRoutes } from './publish/routes'
import { reactionsRoutes } from './reactions/routes'
import { createRateLimiter, type RateLimitOptions } from './rateLimit'
import { shareRoutes } from './share/routes'

export type AppDeps = {
  db: Database.Database
  sessionSecret: string
  now?: () => number
  publicBaseUrl?: string
  secureCookies?: boolean
  uploadMaxBytes?: number
  rateLimit?: RateLimitOptions
  imageStore?: PublishedImageStore
  accessMode?: AccessMode
  signupsOpen?: boolean
  adminEmails?: string[]
}

export function resolveAccessMode(deps: Pick<AppDeps, 'accessMode' | 'signupsOpen'>): AccessMode {
  if (deps.accessMode !== undefined) return deps.accessMode
  return deps.signupsOpen === false ? 'closed' : 'open'
}

export function createApp(deps: AppDeps) {
  const app = new Hono()
  const rateLimiter =
    deps.rateLimit === undefined
      ? undefined
      : createRateLimiter(deps.rateLimit, deps.now ?? Date.now)

  if (rateLimiter !== undefined) {
    app.use('/api/*', async (c, next) => {
      if (!['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
        await next()
        return
      }
      const forwardedFor = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      const ip = forwardedFor || c.req.header('cf-connecting-ip') || 'unknown'
      const path = new URL(c.req.url).pathname
      const decision = rateLimiter.check(`${ip}:${c.req.method}:${path}`)
      if (!decision.ok) {
        c.header('Retry-After', String(decision.retryAfterSeconds))
        return c.json(
          { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again soon.' } },
          429,
        )
      }
      await next()
    })
  }

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      projectSchemaVersion: CURRENT_SCHEMA_VERSION,
      accessMode: resolveAccessMode(deps),
    }),
  )
  app.get('/uploads/*', (c) => {
    const bytes = deps.imageStore?.readPublishedImage(new URL(c.req.url).pathname) ?? null
    if (bytes === null) return c.body(null, 404)
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  })
  app.route('/api', accountRoutes(deps))
  app.route('/api', inviteRoutes(deps))
  app.route('/api', publishRoutes(deps))
  app.route('/api', moderationRoutes(deps))
  app.route('/api', reactionsRoutes(deps))
  app.route('/api', contestRoutes(deps))
  app.route('/', shareRoutes(deps))

  return app
}
