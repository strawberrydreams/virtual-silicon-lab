# v8-M0 Server AI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Before Task 7 (the real `@anthropic-ai/sdk` adapter), re-invoke the `claude-api` skill** to confirm the current TypeScript binding for structured outputs — do not guess SDK syntax.

**Goal:** Lay the server-side AI foundation — a provider abstraction (deterministic fake + thin real Anthropic adapter), the `013_ai` schema, auth/quota/rate-limit guards, and a pure intermediate-shape → `src/domain/` factory mapping that guarantees a valid `Project` — with no user-facing generation.

**Architecture:** A pure `src/domain/ai/` mapper turns an `AiChipDraft` into a valid `Project` via the existing factories (clamp + z-order + `schemaVersion`). A `server/src/ai/` module adds an `AiProvider` interface (fake + anthropic), a per-user daily-quota guard backed by an append-only `ai_prompt_log`, and an authenticated `POST /api/ai/generate-draft` foundation endpoint that returns an unsaved draft `Project`. The milestone gate runs on the fake provider.

**Tech Stack:** TypeScript, Hono + better-sqlite3 (server workspace), `@anthropic-ai/sdk` (lazy, server-only), Vitest. Shared domain reused server-side via the `@domain/*` alias.

## Global Constraints

- Node.js `20.19+` or `22.12+`; package manager **npm**.
- **Domain invariants live in the factory mapping, not the AI schema.** Structured outputs enforce shape only (no numeric `min/max`, no string length, no recursion; every object `additionalProperties: false`). Die-clamp, coordinate bounds, z-order, and `schemaVersion` are enforced by `mapAiDraftToProject`.
- `src/domain/ai/` stays **pure**: no React/Konva/Zustand/IndexedDB/AI/network imports.
- `ANTHROPIC_API_KEY` is **server-only** — never serialized into any client response or bundle.
- Default model **`claude-opus-4-8`**; default provider **`fake`**; default daily quota **`20`**.
- A missing key or provider-down state returns a clean error and never crashes the server; **local-first editing is unaffected**.
- **No `Project` `schemaVersion` change** (`CURRENT_SCHEMA_VERSION` stays `5`); no Konva 2D PNG export change.
- No client AI UI, no client-side keys, no BYOK, no payments (all out of M0 scope).
- Vitest with explicit `import { describe, expect, it } from 'vitest'`. **No real Anthropic network calls in tests** (fake provider, or SDK mocked).
- Each task ends green on `npm test` and is committed. Final gate: `npm test` / `npm run build` / `npm run typecheck --workspace server` / `npm run lint` green.

---

### Task 1: Pure `AiChipDraft` + `mapAiDraftToProject` (the valid-project guarantee)

**Files:**
- Create: `src/domain/ai/aiChipDraft.ts`
- Create: `src/domain/ai/mapAiDraftToProject.ts`
- Test: `src/domain/ai/mapAiDraftToProject.test.ts`

**Interfaces:**
- Consumes: `createProject` (`src/domain/projectFactory.ts`), `buildBlock` (`src/domain/blockFactory.ts`), `BlockType`/`DieShape`/`Project` (`src/domain/project.ts`).
- Produces: `type AiDraftBlock = { type: string; label?: string; x: number; y: number; w: number; h: number }` (x/y/w/h are fractions of the die, `[0,1]`); `type AiChipDraft = { name?: string; dieShape: DieShape; blocks: AiDraftBlock[] }`; `mapAiDraftToProject(draft: AiChipDraft, id?: string, now?: number): Project`. Used by Tasks 6 and 7.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/mapAiDraftToProject.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '../project'
import { mapAiDraftToProject } from './mapAiDraftToProject'
import type { AiChipDraft } from './aiChipDraft'

const base: AiChipDraft = {
  name: 'Test Chip',
  dieShape: 'square',
  blocks: [{ type: 'CPU', label: 'Core', x: 0.1, y: 0.1, w: 0.3, h: 0.3 }],
}

describe('mapAiDraftToProject', () => {
  it('produces a schema-current project with the requested die shape and name', () => {
    const project = mapAiDraftToProject(base, 'p1', 1000)
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.name).toBe('Test Chip')
    expect(project.die.shape).toBe('square')
    expect(project.blocks).toHaveLength(1)
    expect(project.blocks[0].type).toBe('CPU')
    expect(project.blocks[0].label).toBe('Core')
  })

  it('clamps out-of-bounds blocks inside the die', () => {
    const draft: AiChipDraft = {
      dieShape: 'rect',
      blocks: [{ type: 'GPU', x: 2, y: 2, w: 5, h: 5 }],
    }
    const project = mapAiDraftToProject(draft)
    const { width, height } = project.die
    const b = project.blocks[0]
    expect(b.w).toBeLessThanOrEqual(width)
    expect(b.h).toBeLessThanOrEqual(height)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.y).toBeGreaterThanOrEqual(0)
    expect(b.x + b.w).toBeLessThanOrEqual(width)
    expect(b.y + b.h).toBeLessThanOrEqual(height)
  })

  it('skips unknown block types and assigns sequential z-order', () => {
    const draft: AiChipDraft = {
      dieShape: 'rect',
      blocks: [
        { type: 'CPU', x: 0, y: 0, w: 0.2, h: 0.2 },
        { type: 'Nonsense', x: 0.3, y: 0, w: 0.2, h: 0.2 },
        { type: 'Cache', x: 0.6, y: 0, w: 0.2, h: 0.2 },
      ],
    }
    const project = mapAiDraftToProject(draft)
    expect(project.blocks.map((b) => b.type)).toEqual(['CPU', 'Cache'])
    expect(project.blocks.map((b) => b.zIndex)).toEqual([0, 1])
  })

  it('falls back to a default name and accepts an empty block list', () => {
    const project = mapAiDraftToProject({ dieShape: 'hexagon', blocks: [] })
    expect(project.name).toBe('AI Draft Chip')
    expect(project.blocks).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/mapAiDraftToProject.test.ts`
Expected: FAIL — cannot resolve `./mapAiDraftToProject` / `./aiChipDraft`.

- [ ] **Step 3: Write the type module**

Create `src/domain/ai/aiChipDraft.ts`:

```ts
import type { DieShape } from '../project'

/** One block in an AI draft. x/y/w/h are fractions of the die, in [0, 1]. */
export type AiDraftBlock = {
  type: string
  label?: string
  x: number
  y: number
  w: number
  h: number
}

/** The constrained intermediate shape an AiProvider returns. */
export type AiChipDraft = {
  name?: string
  dieShape: DieShape
  blocks: AiDraftBlock[]
}
```

- [ ] **Step 4: Write the mapper**

Create `src/domain/ai/mapAiDraftToProject.ts`:

```ts
import { buildBlock } from '../blockFactory'
import { createProject } from '../projectFactory'
import type { BlockType, Project } from '../project'
import type { AiChipDraft } from './aiChipDraft'

const BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
  'CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB',
  'EmotionEngine', 'DreamSynth', 'QuantumMemory', 'ConsciousnessProcessor',
  'RealityDistortionUnit', 'TimeCore',
])

const MIN_SIZE = 24

function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo
  return Math.max(lo, Math.min(hi, value))
}

/**
 * Maps any AiChipDraft to a domain-valid Project. Unknown block types are dropped,
 * and every block is clamped inside the die's bounding box with a sequential z-order,
 * so adversarial AI output can never yield an invalid project. M0 uses a rectangular
 * bounding clamp for all die shapes (shape-aware clamping is deferred to a later milestone).
 */
export function mapAiDraftToProject(draft: AiChipDraft, id?: string, now?: number): Project {
  const name = draft.name?.trim() ? draft.name.trim() : 'AI Draft Chip'
  const project = createProject(name, id, now)
  project.die = { ...project.die, shape: draft.dieShape }
  const { width, height } = project.die

  let z = 0
  for (const block of draft.blocks) {
    if (!BLOCK_TYPES.has(block.type)) continue
    const built = buildBlock(project, block.type as BlockType)
    const w = clamp(block.w * width, MIN_SIZE, width)
    const h = clamp(block.h * height, MIN_SIZE, height)
    const x = clamp(block.x * width, 0, width - w)
    const y = clamp(block.y * height, 0, height - h)
    project.blocks.push({
      ...built,
      x,
      y,
      w,
      h,
      label: block.label,
      zIndex: z,
    })
    z += 1
  }
  return project
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/mapAiDraftToProject.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/ai/
git commit -m "feat(v8): pure AiChipDraft -> Project mapping (valid-project guarantee)"
```

---

### Task 2: `013_ai` migration (`ai_prompt_log`)

**Files:**
- Modify: `server/src/migrations.ts` (append a new entry after `012_profiles_seo`)
- Test: `server/test/aiMigration.test.ts`

**Interfaces:**
- Consumes: the `Migration` shape already used in `server/src/migrations.ts` (`{ id, up }`), `openDatabase`/`runMigrations` from `server/src/db.ts`, `migrations` from `server/src/migrations.ts`.
- Produces: table `ai_prompt_log(id TEXT PK, user_id TEXT FK→users CASCADE, kind TEXT, prompt TEXT, created_at INTEGER)` + index `idx_ai_prompt_log_user_created`. Used by Task 5.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiMigration.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('013_ai migration', () => {
  it('creates the ai_prompt_log table with the expected columns', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const cols = (db.prepare('PRAGMA table_info(ai_prompt_log)').all() as { name: string }[]).map(
      (c) => c.name,
    )
    expect(cols.sort()).toEqual(['created_at', 'id', 'kind', 'prompt', 'user_id'])
  })

  it('cascade-deletes prompt rows when the user is removed', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
    ).run('u1', 'a@b.c', 'A', 'h', 1, 1)
    db.prepare(
      'INSERT INTO ai_prompt_log (id, user_id, kind, prompt, created_at) VALUES (?,?,?,?,?)',
    ).run('g1', 'u1', 'generate-draft', 'hi', 1)
    db.prepare('DELETE FROM users WHERE id = ?').run('u1')
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiMigration`
Expected: FAIL — no `ai_prompt_log` table.

- [ ] **Step 3: Append the migration**

In `server/src/migrations.ts`, add this object as the **last** element of the `migrations` array (after the `012_profiles_seo` entry, before the closing `]`):

```ts
  {
    id: '013_ai',
    up: (db) => {
      db.exec(`
        CREATE TABLE ai_prompt_log (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          prompt TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_ai_prompt_log_user_created ON ai_prompt_log(user_id, created_at);
      `)
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiMigration`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/migrations.ts server/test/aiMigration.test.ts
git commit -m "feat(v8): 013_ai migration with append-only ai_prompt_log"
```

---

### Task 3: AI config resolver (`resolveAiConfig`)

**Files:**
- Create: `server/src/ai/config.ts`
- Test: `server/test/aiConfig.test.ts`

**Interfaces:**
- Consumes: `process.env` (or an injected env record).
- Produces: `type AiProviderKind = 'fake' | 'anthropic'`; `type AiConfig = { provider: AiProviderKind; model: string; apiKey?: string; dailyQuota: number }`; `resolveAiConfig(env?): AiConfig`. Used by Tasks 6 and 7.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveAiConfig } from '../src/ai/config'

describe('resolveAiConfig', () => {
  it('defaults to the fake provider, opus model, and quota 20 with no env', () => {
    expect(resolveAiConfig({})).toEqual({
      provider: 'fake',
      model: 'claude-opus-4-8',
      apiKey: undefined,
      dailyQuota: 20,
    })
  })

  it('selects the anthropic provider and reads key/model/quota from env', () => {
    expect(
      resolveAiConfig({
        VSL_AI_PROVIDER: 'anthropic',
        ANTHROPIC_API_KEY: 'sk-test',
        VSL_AI_MODEL: 'claude-opus-4-8',
        VSL_AI_DAILY_QUOTA: '5',
      }),
    ).toEqual({ provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-test', dailyQuota: 5 })
  })

  it('falls back to quota 20 for non-positive or invalid values', () => {
    expect(resolveAiConfig({ VSL_AI_DAILY_QUOTA: '0' }).dailyQuota).toBe(20)
    expect(resolveAiConfig({ VSL_AI_DAILY_QUOTA: 'abc' }).dailyQuota).toBe(20)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiConfig`
Expected: FAIL — cannot resolve `../src/ai/config`.

- [ ] **Step 3: Write the config resolver**

Create `server/src/ai/config.ts`:

```ts
export type AiProviderKind = 'fake' | 'anthropic'

export type AiConfig = {
  provider: AiProviderKind
  model: string
  apiKey?: string
  dailyQuota: number
}

type Env = Record<string, string | undefined>

export function resolveAiConfig(env: Env = process.env): AiConfig {
  const provider: AiProviderKind =
    env.VSL_AI_PROVIDER?.trim().toLowerCase() === 'anthropic' ? 'anthropic' : 'fake'
  const model = env.VSL_AI_MODEL?.trim() || 'claude-opus-4-8'
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || undefined
  const rawQuota = Number(env.VSL_AI_DAILY_QUOTA)
  const dailyQuota = Number.isInteger(rawQuota) && rawQuota > 0 ? rawQuota : 20
  return { provider, model, apiKey, dailyQuota }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiConfig`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/config.ts server/test/aiConfig.test.ts
git commit -m "feat(v8): resolveAiConfig env parsing (fake default, quota 20)"
```

---

### Task 4: `AiProvider` interface + deterministic fake

**Files:**
- Create: `server/src/ai/provider.ts`
- Create: `server/src/ai/fakeProvider.ts`
- Test: `server/test/aiFakeProvider.test.ts`

**Interfaces:**
- Consumes: `AiChipDraft` (`@domain/ai/aiChipDraft`, Task 1).
- Produces: `type AiGenerateInput = { prompt: string }`; `type AiProvider = { generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft> }`; `createFakeProvider(): AiProvider`. Used by Tasks 6 and 7.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiFakeProvider.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createFakeProvider } from '../src/ai/fakeProvider'

describe('createFakeProvider', () => {
  it('returns a deterministic, valid-shaped draft derived from the prompt', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateChipDraft({ prompt: 'a neon dream chip' })
    const b = await provider.generateChipDraft({ prompt: 'a neon dream chip' })
    expect(a).toEqual(b)
    expect(a.dieShape).toBe('rect')
    expect(a.blocks.length).toBeGreaterThan(0)
    expect(a.blocks.every((blk) => typeof blk.type === 'string')).toBe(true)
    expect(a.name).toContain('neon')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: FAIL — cannot resolve `../src/ai/fakeProvider`.

- [ ] **Step 3: Write the interface and fake**

Create `server/src/ai/provider.ts`:

```ts
import type { AiChipDraft } from '@domain/ai/aiChipDraft'

export type AiGenerateInput = { prompt: string }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
}
```

Create `server/src/ai/fakeProvider.ts`:

```ts
import type { AiProvider } from './provider'

/** Deterministic provider for dev/test — no network. */
export function createFakeProvider(): AiProvider {
  return {
    async generateChipDraft(input) {
      const name = input.prompt.trim().slice(0, 40) || 'AI Draft Chip'
      return {
        name,
        dieShape: 'rect',
        blocks: [
          { type: 'CPU', label: 'Core', x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
          { type: 'Cache', label: 'L2', x: 0.55, y: 0.1, w: 0.3, h: 0.3 },
        ],
      }
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/provider.ts server/src/ai/fakeProvider.ts server/test/aiFakeProvider.test.ts
git commit -m "feat(v8): AiProvider interface + deterministic fake provider"
```

---

### Task 5: Quota + prompt-log helpers

**Files:**
- Create: `server/src/ai/quota.ts`
- Test: `server/test/aiQuota.test.ts`

**Interfaces:**
- Consumes: the `ai_prompt_log` table (Task 2); `better-sqlite3` `Database`.
- Produces: `countRecentGenerations(db, userId, now): number` (rolling 24h window); `logPrompt(db, entry: { userId: string; kind: string; prompt: string }, now): void`. Used by Task 6.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiQuota.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { countRecentGenerations, logPrompt } from '../src/ai/quota'

function seededDb() {
  const db = openDatabase(':memory:')
  runMigrations(db, migrations)
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run('u1', 'a@b.c', 'A', 'h', 1, 1)
  return db
}

describe('ai quota helpers', () => {
  it('logs a prompt row and counts it within the 24h window', () => {
    const db = seededDb()
    const now = () => 1_000_000
    logPrompt(db, { userId: 'u1', kind: 'generate-draft', prompt: 'hi' }, now)
    expect(countRecentGenerations(db, 'u1', now)).toBe(1)
  })

  it('excludes rows older than 24h', () => {
    const db = seededDb()
    logPrompt(db, { userId: 'u1', kind: 'generate-draft', prompt: 'old' }, () => 0)
    const now = () => 25 * 60 * 60 * 1000
    expect(countRecentGenerations(db, 'u1', now)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiQuota`
Expected: FAIL — cannot resolve `../src/ai/quota`.

- [ ] **Step 3: Write the helpers**

Create `server/src/ai/quota.ts`:

```ts
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

const WINDOW_MS = 24 * 60 * 60 * 1000

/** Generations by this user in the trailing 24h — the per-user daily quota basis. */
export function countRecentGenerations(
  db: Database.Database,
  userId: string,
  now: () => number,
): number {
  const since = now() - WINDOW_MS
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM ai_prompt_log WHERE user_id = ? AND created_at >= ?')
    .get(userId, since) as { n: number }
  return row.n
}

export function logPrompt(
  db: Database.Database,
  entry: { userId: string; kind: string; prompt: string },
  now: () => number,
): void {
  db.prepare(
    'INSERT INTO ai_prompt_log (id, user_id, kind, prompt, created_at) VALUES (?,?,?,?,?)',
  ).run(randomUUID(), entry.userId, entry.kind, entry.prompt, now())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiQuota`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/quota.ts server/test/aiQuota.test.ts
git commit -m "feat(v8): per-user 24h generation quota + prompt logging"
```

---

### Task 6: Foundation route + AppDeps wiring (fake provider)

**Files:**
- Create: `server/src/ai/routes.ts`
- Modify: `server/src/app.ts` (extend `AppDeps`, mount `aiRoutes`)
- Modify: `server/src/app.ts` `buildAppDeps` (wire `aiProvider` + `aiDailyQuota` from `resolveAiConfig`)
- Test: `server/test/aiRoutes.test.ts`

**Interfaces:**
- Consumes: `getSessionUser` (`server/src/accounts/service.ts`), `getSignedCookie` (`hono/cookie`), `countRecentGenerations`/`logPrompt` (Task 5), `createFakeProvider` (Task 4), `resolveAiConfig` (Task 3), `mapAiDraftToProject` (Task 1), `AppDeps` (`server/src/app.ts`).
- Produces: `aiRoutes(deps: AppDeps)` mounting `POST /api/ai/generate-draft`; new optional `AppDeps` fields `aiProvider?: AiProvider` and `aiDailyQuota?: number`.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiRoutes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

async function signIn(app: { request: (path: string, init?: RequestInit) => Promise<Response> }) {
  const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
  return sessionCookie(res)
}

describe('POST /api/ai/generate-draft', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/generate-draft', jsonRequest('POST', { prompt: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('returns a valid draft project and logs the prompt for an authed user', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'a calm mono chip' }, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { project: { schemaVersion: number; blocks: unknown[] } }
    expect(body.project.schemaVersion).toBe(5)
    expect(body.project.blocks.length).toBeGreaterThan(0)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(1)
  })

  it('enforces the daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/generate-draft', jsonRequest('POST', { prompt: 'one' }, cookie))
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'two' }, cookie),
    )
    expect(res.status).toBe(429)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiRoutes`
Expected: FAIL — route not mounted / `aiDailyQuota` not on `AppDeps`.

- [ ] **Step 3: Write the routes module**

Create `server/src/ai/routes.ts`:

```ts
import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { mapAiDraftToProject } from '@domain/ai/mapAiDraftToProject'
import type { AppDeps } from '../app'
import { getSessionUser } from '../accounts/service'
import { createFakeProvider } from './fakeProvider'
import { countRecentGenerations, logPrompt } from './quota'

const SESSION_COOKIE = 'vsl_session'

export function aiRoutes({
  db,
  sessionSecret,
  now = Date.now,
  aiProvider = createFakeProvider(),
  aiDailyQuota = 20,
}: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: 400 | 401 | 429 | 503, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  routes.post('/ai/generate-draft', async (c) => {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') {
      return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    }
    const user = getSessionUser(db, token, now)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    if (countRecentGenerations(db, user.id, now) >= aiDailyQuota) {
      return fail(c, 429, 'QUOTA_EXCEEDED', 'Daily AI generation limit reached.')
    }

    const body = (await c.req.json().catch(() => null)) as { prompt?: unknown } | null
    const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
    if (prompt.trim() === '') return fail(c, 400, 'INVALID_PROMPT', 'A prompt is required.')

    // Log before calling out so failed/abused attempts still count against the quota.
    logPrompt(db, { userId: user.id, kind: 'generate-draft', prompt }, now)

    let draft
    try {
      draft = await aiProvider.generateChipDraft({ prompt })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    return c.json({ project: mapAiDraftToProject(draft) })
  })

  return routes
}
```

- [ ] **Step 4: Extend `AppDeps` and mount the routes**

In `server/src/app.ts`:

1. Add the import near the other route imports:

```ts
import { aiRoutes } from './ai/routes'
import type { AiProvider } from './ai/provider'
```

2. Add two optional fields to the `AppDeps` type (alongside `adminEmails?`):

```ts
  aiProvider?: AiProvider
  aiDailyQuota?: number
```

3. Mount the routes next to the other `app.route('/api', …)` lines:

```ts
  app.route('/api', aiRoutes(deps))
```

- [ ] **Step 5: Wire `buildAppDeps` to use `resolveAiConfig` (fake provider)**

In `server/src/app.ts` `buildAppDeps`, add the import and set the two new deps from config. Near the top of the file:

```ts
import { resolveAiConfig } from './ai/config'
import { createFakeProvider } from './ai/fakeProvider'
```

Inside `buildAppDeps`, before the returned `AppDeps` object, resolve config and include the fields in the returned object:

```ts
  const aiConfig = resolveAiConfig()
  // M0: always the fake provider; the real adapter is selected in Task 7.
  // ... in the returned object, add:
  aiProvider: createFakeProvider(),
  aiDailyQuota: aiConfig.dailyQuota,
```

> Note: insert `aiProvider` / `aiDailyQuota` as fields of the object `buildAppDeps` already returns (the one carrying `db`, `sessionSecret`, `adminEmails`, etc.). Match the surrounding indentation.

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test --workspace server -- aiRoutes`
Expected: PASS (3 tests). Then `npm test --workspace server` to confirm no regression in the existing server suite.

- [ ] **Step 7: Commit**

```bash
git add server/src/ai/routes.ts server/src/app.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): POST /api/ai/generate-draft foundation endpoint (fake provider)"
```

---

### Task 7: Thin real Anthropic adapter + provider selection

> **First, re-invoke the `claude-api` skill** and confirm the exact current `@anthropic-ai/sdk` TypeScript call for structured outputs (`output_config.format` json_schema on `messages.create`, or `messages.parse`). The adapter test mocks the SDK, so the suite does not make a network call — but write the adapter body against the verified binding.

**Files:**
- Modify: `server/package.json` (add `@anthropic-ai/sdk` dependency)
- Create: `server/src/ai/anthropicProvider.ts`
- Modify: `server/src/app.ts` `buildAppDeps` (select anthropic provider when configured)
- Test: `server/test/aiAnthropicProvider.test.ts`

**Interfaces:**
- Consumes: `AiProvider`/`AiGenerateInput` (Task 4), `AiChipDraft` (`@domain/ai/aiChipDraft`), `resolveAiConfig` (Task 3), `@anthropic-ai/sdk`.
- Produces: `createAnthropicProvider(opts: { apiKey: string; model: string }): AiProvider`.

- [ ] **Step 1: Add the dependency**

Run: `npm install @anthropic-ai/sdk --workspace server`
Expected: `@anthropic-ai/sdk` appears under `server/package.json` `dependencies`; lockfile updated.

- [ ] **Step 2: Write the failing test (SDK mocked — no network)**

Create `server/test/aiAnthropicProvider.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

import { createAnthropicProvider } from '../src/ai/anthropicProvider'

describe('createAnthropicProvider', () => {
  it('requests opus-4-8 with a json_schema format and parses the structured draft', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'NEON',
            dieShape: 'rect',
            blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const draft = await provider.generateChipDraft({ prompt: 'neon chip' })

    expect(draft.dieShape).toBe('rect')
    expect(draft.blocks[0].type).toBe('CPU')
    const args = create.mock.calls[0][0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(provider.generateChipDraft({ prompt: 'x' })).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: FAIL — cannot resolve `../src/ai/anthropicProvider`.

- [ ] **Step 4: Write the adapter**

Create `server/src/ai/anthropicProvider.ts` (confirm the structured-output binding via `claude-api` first):

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiProvider } from './provider'

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    dieShape: { type: 'string', enum: ['rect', 'square', 'circle', 'hexagon'] },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          label: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
        required: ['type', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['dieShape', 'blocks'],
} as const

export function createAnthropicProvider(opts: { apiKey: string; model: string }): AiProvider {
  const client = new Anthropic({ apiKey: opts.apiKey })
  return {
    async generateChipDraft(input) {
      const response = await client.messages.create({
        model: opts.model,
        max_tokens: 4096,
        output_config: { format: { type: 'json_schema', schema: DRAFT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              'Return ONLY a JSON chip layout (die shape + blocks with fractional x,y,w,h in [0,1]) ' +
              `for this surreal chip idea: ${input.prompt}`,
          },
        ],
      } as Anthropic.MessageCreateParamsNonStreaming)

      if (response.stop_reason === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as AiChipDraft
    },
  }
}
```

> If `output_config` is not yet in the installed SDK's `MessageCreateParams` types, keep the `as Anthropic.MessageCreateParamsNonStreaming` cast (or the exact cast the `claude-api` skill specifies). The mock-based test does not depend on the live type.

- [ ] **Step 5: Select the real provider in `buildAppDeps`**

In `server/src/app.ts` `buildAppDeps`, replace the M0 `aiProvider: createFakeProvider()` line with config-driven selection, and add the import:

```ts
import { createAnthropicProvider } from './ai/anthropicProvider'
```

```ts
  const aiConfig = resolveAiConfig()
  const aiProvider =
    aiConfig.provider === 'anthropic' && aiConfig.apiKey !== undefined
      ? createAnthropicProvider({ apiKey: aiConfig.apiKey, model: aiConfig.model })
      : createFakeProvider()
  // ... returned object:
  aiProvider,
  aiDailyQuota: aiConfig.dailyQuota,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: PASS (2 tests). Then `npm run typecheck --workspace server` to confirm the adapter typechecks.

- [ ] **Step 7: Commit**

```bash
git add server/package.json package-lock.json server/src/ai/anthropicProvider.ts server/src/app.ts server/test/aiAnthropicProvider.test.ts
git commit -m "feat(v8): thin Anthropic provider adapter + config-driven selection"
```

---

### Task 8: Gates, docs, milestone status

**Files:**
- Modify: `implementation.md` (append a dated V8-M0 entry, Korean)
- Modify: `CLAUDE.md` (Working Context v8 bullet + a `### v8 AI-Assisted Creation` Milestone Status block)

**Interfaces:** none (documentation + verification).

- [ ] **Step 1: Run all gates**

```bash
npm test
npm run build
npm run typecheck --workspace server
npm run lint
```
Expected: all green. Record the client/server file+test counts from `npm test`.

- [ ] **Step 2: Confirm no API key leaks client-side**

Run: `npm run build && grep -rl "ANTHROPIC_API_KEY" dist/assets || echo "no api key in client bundle"`
Expected: prints `no api key in client bundle` (the key is referenced only in `server/src/ai/`).

- [ ] **Step 3: Record the V8-M0 outcome in `implementation.md`**

Append a `## V8-M0 Server AI Foundation (2026-06-19)` section (Korean, matching the file's style): the pure `mapAiDraftToProject` valid-project guarantee (clamp/z-order/`schemaVersion`); `013_ai`/`ai_prompt_log`; `AiProvider` + fake + thin Anthropic adapter (`claude-opus-4-8`, `output_config.format` json_schema, structured outputs enforce shape only so invariants stay in the factory); the authenticated `POST /api/ai/generate-draft` foundation endpoint (no client UI yet) behind per-user 24h quota; `resolveAiConfig` env knobs; key server-only; final gate counts.

- [ ] **Step 4: Update `CLAUDE.md`**

Add a `### v8 AI-Assisted Creation (in progress — branch <current>, not yet merged)` block under "## Milestone Status" with a **V8-M0** line summarizing the above and pointing to the spec (`docs/superpowers/specs/2026-06-19-v8-m0-server-ai-foundation-design.md`) and this plan. Add a Working Context bullet noting v8 has started at M0 (server AI foundation; no user-facing generation yet; `ANTHROPIC_API_KEY` server-only; local-first unchanged).

- [ ] **Step 5: Commit**

```bash
git add -f implementation.md CLAUDE.md
git commit -m "docs(v8): record v8-M0 server AI foundation"
```

---

## Self-Review

**1. Spec coverage:**
- Pure intermediate-shape → factory mapping with valid-project guarantee → Task 1. ✅
- `012_ai` schema (named `013_ai` — `012_profiles_seo` already exists) + append-only prompt log → Task 2. ✅
- Env config (`VSL_AI_PROVIDER`/`ANTHROPIC_API_KEY`/`VSL_AI_MODEL`/`VSL_AI_DAILY_QUOTA`) → Task 3. ✅
- `AiProvider` interface + deterministic fake → Task 4. ✅
- Per-user daily quota + usage/prompt log → Tasks 5–6. ✅
- Auth + quota guard route, draft returned unsaved, no client UI → Task 6. ✅
- Thin real `@anthropic-ai/sdk` adapter (opus-4-8, structured outputs), config-selected → Task 7. ✅
- Gates green, key server-only, local-first untouched, docs → Task 8. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to" — every code step shows full code; the one runtime-dependent spot (SDK structured-output binding) carries an explicit "re-consult `claude-api`" instruction plus a mock-based test that doesn't depend on the live type. Doc counts are runtime-filled by design.

**3. Type consistency:** `AiChipDraft`/`AiDraftBlock` (Task 1) used verbatim in Tasks 4, 7. `AiProvider`/`AiGenerateInput`/`generateChipDraft` (Task 4) used in Tasks 6, 7. `createFakeProvider` (Task 4), `resolveAiConfig`/`AiConfig` (Task 3), `countRecentGenerations`/`logPrompt` (Task 5), and the new `AppDeps.aiProvider`/`aiDailyQuota` fields (Task 6) are all referenced with matching names/types downstream. Migration id `013_ai` and table `ai_prompt_log` consistent across Tasks 2, 5, 6, 8.

## Notes

- The migration is `013_ai` because `012_profiles_seo` is already the last entry in `server/src/migrations.ts` — confirm with `grep -nE "id: '01" server/src/migrations.ts` before adding.
- `mapAiDraftToProject` uses a rectangular bounding clamp for all die shapes in M0; shape-aware clamping (circle/hexagon insets) is a later-milestone refinement, noted in the mapper's doc comment.
- The route logs the prompt **before** calling the provider so a failing or abused call still counts against the quota — the test in Task 6 covers the success + quota paths; the failure path is covered by the adapter's refusal test in Task 7.
