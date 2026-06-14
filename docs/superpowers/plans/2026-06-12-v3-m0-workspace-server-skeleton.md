# V3-M0 Workspace & Server Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the repo to npm workspaces and stand up a `server/` package (Hono + better-sqlite3) with a tested migration runner, a health endpoint, and a proven shared-`src/domain` wiring — the foundation for v3 "Share Core".

**Architecture:** The repo root stays the Vite client app and becomes the npm-workspaces root with one workspace: `server/`. The server is a Hono app served by `@hono/node-server`, storing data in SQLite via better-sqlite3 with a hand-rolled, transaction-safe migration runner (no ORM). The server reuses the pure `src/domain/` modules directly through a `@domain/*` path alias (tsconfig paths + vitest alias; `tsx` resolves tsconfig paths at runtime) — no domain code moves.

**Tech Stack:** npm workspaces · Hono + `@hono/node-server` · better-sqlite3 · tsx (dev runtime) · Vitest (node environment for server tests) · TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md` (V3-M0 row). Branch: `v3-share-core`.

**Out of scope (later milestones):** accounts/argon2 (M1), publish endpoints (M2), client proxy/gallery UI (M3+), production build/deploy scripts (M6). The production migration list ships **empty** in M0 — M1 adds `001_users`.

---

## File Structure

```text
package.json                  modify: workspaces, scripts, name
vite.config.ts                modify: exclude server tests from client vitest
.gitignore                    modify: ignore server/data/
server/
  package.json                create: @vsl/server scripts + deps
  tsconfig.json               create: strict node TS, @domain/* paths
  vitest.config.ts            create: node env, @domain alias
  src/
    db.ts                     create: openDatabase + runMigrations (+ Migration type)
    migrations.ts             create: empty production migration list
    app.ts                    create: createApp() with GET /api/health
    index.ts                  create: entry — open DB, migrate, serve
  test/
    migrations.test.ts        create
    health.test.ts            create
    domainSharing.test.ts     create
    db.test.ts                create
CLAUDE.md                     modify: commands + milestone status
implementation.md             modify: V3-M0 decision log entry (Korean)
README.md                     modify: dev/test commands for server
```

---

### Task 1: Workspace conversion + server package scaffold

**Files:**
- Modify: `package.json` (root)
- Modify: `vite.config.ts`
- Modify: `.gitignore`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`

- [ ] **Step 1: Update the root `package.json`**

Change the stale `"name": "foundation-slice"` to `virtual-silicon-lab`, add `"workspaces"`, and add a `dev:server` script. Keep `"test"` as client-only for now (Task 6 wires both suites together once server tests exist). The result (deps unchanged, shown without the dependency blocks):

```json
{
  "name": "virtual-silicon-lab",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "workspaces": ["server"],
  "directories": { "doc": "docs" },
  "scripts": {
    "test": "vitest run",
    "dev": "vite",
    "dev:server": "npm run dev --workspace server",
    "build": "tsc -b && vite build",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
  "license": "ISC"
}
```

(Also add `"private": true` — required safety for a workspaces root — and drop the dead `"main": "index.js"`, `"description"`, `"keywords"`, `"author"` fields.)

- [ ] **Step 2: Exclude server tests from the client Vitest run**

The root vitest currently globs all `**/*.test.ts`, which would pick up server tests with the jsdom environment. Edit `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'server/**'],
  },
})
```

- [ ] **Step 3: Ignore the server data directory**

Append to `.gitignore` (under the `# build artifacts / logs` section):

```text
server/data/
```

- [ ] **Step 4: Create `server/package.json`**

```json
{
  "name": "@vsl/server",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

Dependencies are installed in Step 7 via `npm install` so versions resolve to current releases.

- [ ] **Step 5: Create `server/tsconfig.json`**

`noEmit` is intentional: tsc is typecheck-only; tsx runs TS directly in dev, and production bundling is an M6 concern. `include` pulls in `../src/domain` so the shared modules typecheck under the server's strict config.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": { "@domain/*": ["../src/domain/*"] }
  },
  "include": ["src", "test", "../src/domain"]
}
```

- [ ] **Step 6: Create `server/vitest.config.ts`**

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@domain': fileURLToPath(new URL('../src/domain', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 7: Install server dependencies from the repo root**

```bash
npm install hono @hono/node-server better-sqlite3 --workspace server
npm install -D tsx typescript vitest @types/node @types/better-sqlite3 --workspace server
```

Expected: lockfile updates, `node_modules` hoists, better-sqlite3 fetches a prebuilt binary (no node-gyp build on Node 22/macOS).

- [ ] **Step 8: Verify the client is unaffected**

```bash
npm test
npm run build
```

Expected: client vitest still passes (58 files / 267 tests at branch time), build green with the known Vite 500 kB chunk warning.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts .gitignore server/
git commit -m "chore: convert repo to npm workspaces with server package scaffold"
```

---

### Task 2: SQLite migration runner (TDD)

**Files:**
- Create: `server/test/migrations.test.ts`
- Create: `server/src/db.ts`

- [ ] **Step 1: Write the failing test**

`server/test/migrations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations, type Migration } from '../src/db'

const createNotes: Migration = {
  id: '001_create_notes',
  up: (db) => {
    db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)')
  },
}

const addTag: Migration = {
  id: '002_add_tag',
  up: (db) => {
    db.exec('ALTER TABLE notes ADD COLUMN tag TEXT')
  },
}

describe('runMigrations', () => {
  it('applies pending migrations in order and records them', () => {
    const db = openDatabase(':memory:')
    const applied = runMigrations(db, [createNotes, addTag])
    expect(applied).toEqual(['001_create_notes', '002_add_tag'])
    const rows = db.prepare('SELECT id FROM schema_migrations ORDER BY id').all()
    expect(rows).toEqual([{ id: '001_create_notes' }, { id: '002_add_tag' }])
    db.prepare("INSERT INTO notes (body, tag) VALUES ('hello', 'x')").run()
  })

  it('skips already-applied migrations on re-run', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, [createNotes])
    const applied = runMigrations(db, [createNotes, addTag])
    expect(applied).toEqual(['002_add_tag'])
  })

  it('rolls back a failing migration atomically', () => {
    const db = openDatabase(':memory:')
    const broken: Migration = {
      id: '001_broken',
      up: (d) => {
        d.exec('CREATE TABLE ok_table (id INTEGER)')
        d.exec('THIS IS NOT SQL')
      },
    }
    expect(() => runMigrations(db, [broken])).toThrow()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ok_table'")
      .all()
    expect(tables).toEqual([])
    expect(db.prepare('SELECT id FROM schema_migrations').all()).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test --workspace server
```

Expected: FAIL — `Cannot find module '../src/db'` (or equivalent resolution error).

- [ ] **Step 3: Implement `server/src/db.ts`**

```ts
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

export type Migration = {
  id: string
  up: (db: Database.Database) => void
}

export function openDatabase(path: string): Database.Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

export function runMigrations(db: Database.Database, migrations: Migration[]): string[] {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  )
  const appliedRows = db.prepare('SELECT id FROM schema_migrations').all() as { id: string }[]
  const alreadyApplied = new Set(appliedRows.map((row) => row.id))
  const insertApplied = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')

  const newlyApplied: string[] = []
  for (const migration of migrations) {
    if (alreadyApplied.has(migration.id)) continue
    db.transaction(() => {
      migration.up(db)
      insertApplied.run(migration.id, new Date().toISOString())
    })()
    newlyApplied.push(migration.id)
  }
  return newlyApplied
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test --workspace server
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/db.ts server/test/migrations.test.ts
git commit -m "feat: add sqlite migration runner for server"
```

---

### Task 3: Hono app with health endpoint reporting the shared domain schema (TDD)

The health payload includes `CURRENT_SCHEMA_VERSION` imported from `@domain/project` — this is the runtime proof that the `@domain` alias wiring works, not just a vanity endpoint.

**Files:**
- Create: `server/test/health.test.ts`
- Create: `server/src/app.ts`

- [ ] **Step 1: Write the failing test**

`server/test/health.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { createApp } from '../src/app'

describe('GET /api/health', () => {
  it('reports ok with the shared domain project schema version', async () => {
    const app = createApp()
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      projectSchemaVersion: CURRENT_SCHEMA_VERSION,
    })
  })

  it('returns 404 for unknown api routes', async () => {
    const app = createApp()
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test --workspace server
```

Expected: FAIL — `Cannot find module '../src/app'`.

- [ ] **Step 3: Implement `server/src/app.ts`**

`createApp()` takes no arguments yet; the database is threaded in when M1 adds the first stateful route (YAGNI).

```ts
import { Hono } from 'hono'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'

export function createApp() {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({ ok: true, projectSchemaVersion: CURRENT_SCHEMA_VERSION }),
  )

  return app
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test --workspace server
```

Expected: PASS — 5 tests total (2 new).

- [ ] **Step 5: Commit**

```bash
git add server/src/app.ts server/test/health.test.ts
git commit -m "feat: add hono app with health endpoint sharing domain schema version"
```

---

### Task 4: Domain-sharing smoke test (validation entry point under Node)

This test locks in the v3 server-side validation contract: `migrateProject(value: unknown): Project` from `src/domain/projectMigration.ts` is the function the publish endpoint (M2) will call on uploaded snapshots. It also proves the full domain module graph (`projectFactory` → `studioDefaults` → `project`) loads under plain Node — no browser globals beyond `crypto.randomUUID` (available in Node 20+).

**Files:**
- Create: `server/test/domainSharing.test.ts`

- [ ] **Step 1: Write the test**

`server/test/domainSharing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { createProject } from '@domain/projectFactory'
import { migrateProject } from '@domain/projectMigration'

describe('shared domain modules under node', () => {
  it('round-trips a factory project through JSON and migrateProject', () => {
    const project = createProject('Server Smoke Chip')
    const revived = migrateProject(JSON.parse(JSON.stringify(project)))
    expect(revived.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(revived.name).toBe('Server Smoke Chip')
    expect(revived.die.shape).toBe('rect')
  })

  it('rejects a snapshot with an unsupported schema version', () => {
    expect(() => migrateProject({ schemaVersion: 999 })).toThrow('Unsupported project schema')
  })

  it('rejects a structurally corrupt snapshot', () => {
    expect(() =>
      migrateProject({ schemaVersion: CURRENT_SCHEMA_VERSION, id: 42 }),
    ).toThrow('Corrupt project record')
  })
})
```

- [ ] **Step 2: Run the test to verify it passes**

(This is characterization of existing domain behavior in a new runtime, so it should pass immediately; if it fails, the alias or a hidden browser dependency is the bug — fix the wiring, not the domain.)

```bash
npm run test --workspace server
```

Expected: PASS — 8 tests total (3 new).

- [ ] **Step 3: Commit**

```bash
git add server/test/domainSharing.test.ts
git commit -m "test: prove shared domain validation entry point runs under node"
```

---

### Task 5: Database file handling + server entry point

**Files:**
- Create: `server/test/db.test.ts`
- Create: `server/src/migrations.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Write the failing test for file-backed databases**

`server/test/db.test.ts`:

```ts
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/db'

describe('openDatabase', () => {
  let dir: string

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('creates missing parent directories and the database file', () => {
    dir = mkdtempSync(join(tmpdir(), 'vsl-db-'))
    const dbPath = join(dir, 'nested', 'vsl.sqlite')
    const db = openDatabase(dbPath)
    expect(existsSync(dbPath)).toBe(true)
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal')
    db.close()
  })
})
```

- [ ] **Step 2: Run the test**

```bash
npm run test --workspace server
```

Expected: PASS immediately — Task 2's `openDatabase` already implements this. This test exists because the behavior was previously only exercised with `:memory:`; it pins the file-path branch. If it fails, fix `openDatabase`, not the test.

- [ ] **Step 3: Create `server/src/migrations.ts`**

The production list is intentionally empty in M0; V3-M1 adds `001_users`.

```ts
import type { Migration } from './db'

export const migrations: Migration[] = []
```

- [ ] **Step 4: Create `server/src/index.ts`**

Kept deliberately thin (wiring only, no logic) so everything testable lives in `db.ts`/`app.ts`.

```ts
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
```

- [ ] **Step 5: Verify the entry point manually**

```bash
npm run dev:server &
sleep 2
curl -s http://127.0.0.1:8787/api/health
kill %1
```

Expected: `{"ok":true,"projectSchemaVersion":4}`, a `server/data/vsl.sqlite` file exists, and `git status` shows no new tracked files (data dir ignored).

- [ ] **Step 6: Typecheck the server package**

```bash
npm run typecheck --workspace server
```

Expected: clean exit. (If shared domain files raise import-style errors under the server's strict config, fix the server tsconfig — do not modify domain files in this milestone.)

- [ ] **Step 7: Commit**

```bash
git add server/src/migrations.ts server/src/index.ts server/test/db.test.ts
git commit -m "feat: add server entry point with sqlite startup migration"
```

---

### Task 6: Root test integration + documentation

**Files:**
- Modify: `package.json` (root, `test` script)
- Modify: `CLAUDE.md` (Commands, Architecture tree, Milestone Status)
- Modify: `README.md` (dev/test commands)
- Modify: `implementation.md` (V3-M0 entry, Korean)

- [ ] **Step 1: Make root `npm test` run both suites**

In the root `package.json`, change:

```json
"test": "vitest run && npm run test --workspace server",
"test:client": "vitest run",
```

(Keep `test:watch` client-only.)

- [ ] **Step 2: Run the full verification suite**

```bash
npm test
npm run build
npm run typecheck --workspace server
```

Expected: client tests green, then server tests green (9 tests), build green with known chunk warning, typecheck clean.

- [ ] **Step 3: Update `CLAUDE.md`**

- Commands section: note `npm test` now runs client + server suites, add `npm run dev:server  # API server on :8787` and `npm run typecheck --workspace server`.
- Architecture tree: add a `server/` block under the existing `src/` tree: `server/src` (Hono app, SQLite + migration runner, entry) and `server/test` (node-environment Vitest; `@domain/*` aliases `src/domain/`).
- Add a rule line: server reuses `src/domain/` via the `@domain/*` alias and must not import from any other client directory.
- Milestone Status: flip `V3-M0` to ✅ done with a one-line summary (workspaces, Hono+better-sqlite3 skeleton, tested migration runner, health endpoint, shared-domain smoke tests).

- [ ] **Step 4: Update `README.md`**

In the development commands section, add `npm run dev:server` and note that `npm test` covers both client and server suites.

- [ ] **Step 5: Add the V3-M0 entry to `implementation.md`** (Korean, matching the existing log style)

Cover: 워크스페이스 전환(루트=클라이언트 유지, `server/` 추가), 스택 확정(Hono/better-sqlite3/tsx, ORM 없음), `@domain/*` alias로 domain 재사용(이동 없음), 마이그레이션 러너의 트랜잭션 롤백 보장, `migrateProject`가 M2 publish 검증 진입점이라는 결정, 빈 production migration 목록(M1에서 `001_users`), 테스트/빌드/typecheck 결과 수치.

- [ ] **Step 6: Commit**

```bash
git add package.json CLAUDE.md README.md implementation.md
git commit -m "docs: integrate server suite into npm test and record V3-M0"
```

---

## Acceptance (V3-M0 gate)

- `npm test` from the root runs the client suite then the server suite; both green.
- `npm run build` unchanged and green; `npm run typecheck --workspace server` clean.
- `npm run dev:server` + `curl http://127.0.0.1:8787/api/health` returns `{"ok":true,"projectSchemaVersion":4}` and creates `server/data/vsl.sqlite` (untracked).
- Client behavior unchanged — no client source files modified other than `vite.config.ts` test excludes.
