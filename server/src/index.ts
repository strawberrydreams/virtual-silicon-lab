import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { openDatabase, runMigrations } from './db'
import { migrations } from './migrations'

const defaultDataDir = join(fileURLToPath(new URL('..', import.meta.url)), 'data')
const dataDir = process.env.VSL_DATA_DIR ?? defaultDataDir
const db = openDatabase(join(dataDir, 'vsl.sqlite'))
const applied = runMigrations(db, migrations)
if (applied.length > 0) {
  console.log(`applied migrations: ${applied.join(', ')}`)
}

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`vsl server listening on http://127.0.0.1:${info.port}`)
})
