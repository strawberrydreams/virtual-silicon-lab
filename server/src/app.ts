import { Hono } from 'hono'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'

export function createApp() {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({ ok: true, projectSchemaVersion: CURRENT_SCHEMA_VERSION }),
  )

  return app
}
