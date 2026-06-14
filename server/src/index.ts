import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { loadRuntimeConfig } from './config'
import { openDatabase, runMigrations } from './db'
import { createFileImageStore } from './images/fileImageStore'
import { migrations } from './migrations'

const defaultDataDir = join(fileURLToPath(new URL('..', import.meta.url)), 'data')
const dataDir = process.env.VSL_DATA_DIR ?? defaultDataDir
const imageStore = createFileImageStore({ rootDir: process.env.VSL_UPLOAD_DIR ?? join(dataDir, 'uploads') })
const db = openDatabase(join(dataDir, 'vsl.sqlite'))
const applied = runMigrations(db, migrations)
if (applied.length > 0) {
  console.log(`applied migrations: ${applied.join(', ')}`)
}

const runtimeConfig = loadRuntimeConfig()
if (runtimeConfig.usedInsecureDevelopmentSecret) {
  console.warn('VSL_SESSION_SECRET is not set; using an insecure development-only secret.')
}

const port = Number(process.env.PORT ?? 8787)
serve(
  {
    fetch: createApp({
      db,
      sessionSecret: runtimeConfig.sessionSecret,
      publicBaseUrl: runtimeConfig.publicBaseUrl,
      secureCookies: runtimeConfig.secureCookies,
      uploadMaxBytes: runtimeConfig.uploadMaxBytes,
      rateLimit: runtimeConfig.rateLimit,
      imageStore,
    }).fetch,
    port,
  },
  (info) => {
    console.log(`vsl server listening on http://127.0.0.1:${info.port}`)
  },
)
