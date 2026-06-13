import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { accountRoutes } from './accounts/routes'
import { publishRoutes } from './publish/routes'
import { shareRoutes } from './share/routes'

export type AppDeps = {
  db: Database.Database
  sessionSecret: string
  now?: () => number
  publicBaseUrl?: string
}

export function createApp(deps: AppDeps) {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({ ok: true, projectSchemaVersion: CURRENT_SCHEMA_VERSION }),
  )
  app.route('/api', accountRoutes(deps))
  app.route('/api', publishRoutes(deps))
  app.route('/', shareRoutes(deps))

  return app
}
