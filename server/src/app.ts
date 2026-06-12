import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'

export type AppDeps = {
  db: Database.Database
  sessionSecret: string
  now?: () => number
}

export function createApp(_deps: AppDeps) {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({ ok: true, projectSchemaVersion: CURRENT_SCHEMA_VERSION }),
  )

  return app
}
