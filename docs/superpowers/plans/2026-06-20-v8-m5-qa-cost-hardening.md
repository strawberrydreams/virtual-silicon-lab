# v8-M5 QA & Cost Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> This milestone touches **no `@anthropic-ai/sdk` code** (provider/adapter unchanged) — it hardens the existing AI routes, adds an admin usage read, and adds tests. No need to re-consult the `claude-api` skill.

**Goal:** Close v8 by hardening the AI surface — bound abusive input (reject with 400), add an AI burst rate-limit, expose an admin-only aggregate usage read, prove the whole AI surface with one end-to-end fake-provider test, pass final gates, and bump the version line to `0.6 v8`.

**Architecture:** Server-side hardening plus a one-line client change. Two module constants in `server/src/ai/routes.ts` reject oversized payloads before any provider call or quota log; four entries in `SENSITIVE_RATE_LIMIT_OVERRIDES` add a per-IP burst cap; a new pure-ish `summarizeAiUsage` over the existing `ai_prompt_log` backs an admin-guarded `GET /api/ai/usage`. No migration, no schema bump, no new AI feature.

**Tech Stack:** Hono + better-sqlite3 (server workspace, node-environment Vitest); React + Vitest + React Testing Library (client). Shared domain reused server-side via `@domain/*`.

## Global Constraints

Every task's requirements implicitly include this section. Exact values:

- **No migration, no schema bump.** `CURRENT_SCHEMA_VERSION` stays `5`. `ai_prompt_log` (from M0's `013_ai`) is reused unchanged as the quota basis **and** the cost/abuse data source.
- **Abuse bounds:** `MAX_PROMPT_LENGTH = 2000`, `MAX_CONTEXT_BLOCKS = 64` — module constants in `server/src/ai/routes.ts`. Checked **after** the auth+quota guard, **before** `logPrompt`/the provider call; oversized → `400 PAYLOAD_TOO_LARGE`, no quota consumed, no log row.
- **AI burst rate-limit:** `POST:/api/ai/{generate-draft,generate-copy,suggest-layout,generate-variations}` at `{ windowMs: 60_000, max: 10 }` (10/min/IP), added to `SENSITIVE_RATE_LIMIT_OVERRIDES`. The per-user 24h quota (`VSL_AI_DAILY_QUOTA`, default 20) stays the primary limit. Rate limiting is production-only (`deps.rateLimit` unset in dev/test).
- **Cost monitoring:** admin-only `GET /api/ai/usage?windowHours=24` (default 24, clamp `[1, 720]`), **inline** admin guard (`getSessionUser` + `isAdminEmail`, 401/403), placed under `/ai/` to avoid the moderation `/admin/*` sub-app overlap. No client/admin-UI change.
- **`ANTHROPIC_API_KEY` stays server-only** — never in any client `dist/assets` bundle or API response.
- **No Konva 2D PNG export change; no `Project` schema change; no `src/domain/` change** (M5 is server + a one-line client `maxLength`). Editing stays 100% local-first.
- **Version line → `0.6 v8`** at M5 close (`package.json` stays `1.0.0`).
- **TDD per CLAUDE.md:** Vitest with explicit `import { describe, expect, it } from 'vitest'` (no globals). Run `npm test` + `npm run build` after each task; server work also runs `npm run typecheck --workspace server` and `npm run lint`.

---

### Task 1: AI burst rate-limit overrides

**Files:**
- Modify: `server/src/config.ts` (the `SENSITIVE_RATE_LIMIT_OVERRIDES` object)
- Test: `server/test/config.test.ts` (extend the existing production-defaults assertion)

**Interfaces:**
- Consumes: the existing `DEFAULT_RATE_LIMIT_WINDOW_MS` constant and `SENSITIVE_RATE_LIMIT_OVERRIDES` map in `config.ts`.
- Produces: four new `POST:/api/ai/*` override entries in the production `rateLimit.overrides`. No exported signature change.

- [ ] **Step 1: Extend the failing test**

In `server/test/config.test.ts`, in the `it('enables production-safe defaults when required env is present', ...)` test, replace the `overrides` object inside the `toMatchObject({...})` with one that also asserts the AI entries:

```ts
      overrides: {
        'POST:/api/auth/login': { windowMs: 60_000, max: 20 },
        'POST:/api/auth/signup': { windowMs: 60_000, max: 10 },
        'POST:/api/auth/forgot-password': { windowMs: 60_000, max: 5 },
        'POST:/api/reports': { windowMs: 60_000, max: 10 },
        'POST:/api/ai/generate-draft': { windowMs: 60_000, max: 10 },
        'POST:/api/ai/generate-copy': { windowMs: 60_000, max: 10 },
        'POST:/api/ai/suggest-layout': { windowMs: 60_000, max: 10 },
        'POST:/api/ai/generate-variations': { windowMs: 60_000, max: 10 },
      },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace server -- config`
Expected: FAIL — the four `POST:/api/ai/*` keys are missing from `config.rateLimit.overrides`.

- [ ] **Step 3: Add the overrides**

In `server/src/config.ts`, add the four entries to `SENSITIVE_RATE_LIMIT_OVERRIDES`:

```ts
const SENSITIVE_RATE_LIMIT_OVERRIDES = {
  'POST:/api/auth/login': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 20 },
  'POST:/api/auth/signup': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 10 },
  'POST:/api/auth/forgot-password': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 5 },
  'POST:/api/reports': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 10 },
  'POST:/api/ai/generate-draft': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 10 },
  'POST:/api/ai/generate-copy': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 10 },
  'POST:/api/ai/suggest-layout': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 10 },
  'POST:/api/ai/generate-variations': { windowMs: DEFAULT_RATE_LIMIT_WINDOW_MS, max: 10 },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace server -- config`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/config.ts server/test/config.test.ts
git commit -m "feat(v8): add per-IP burst rate-limit overrides for AI endpoints"
```

---

### Task 2: Prompt-abuse input bounds (reject with 400)

**Files:**
- Modify: `server/src/ai/routes.ts` (add constants + a bound check to all four handlers)
- Test: `server/test/aiRoutes.test.ts` (append bound cases)

**Interfaces:**
- Consumes: the existing `fail`, `requireUserWithinQuota`, `logPrompt` in `aiRoutes`.
- Produces: module constants `MAX_PROMPT_LENGTH = 2000` and `MAX_CONTEXT_BLOCKS = 64`; each handler rejects oversized input with `400 PAYLOAD_TOO_LARGE` before logging/calling the provider.

- [ ] **Step 1: Write the failing tests**

Append to `server/test/aiRoutes.test.ts`:

```ts
describe('AI route abuse bounds', () => {
  it('rejects an over-long prompt with 400 and writes no log row', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'x'.repeat(2001) }, cookie),
    )
    expect(res.status).toBe(400)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })

  it('rejects an oversized suggest-layout context (too many blocks) with 400', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const blocks = Array.from({ length: 65 }, () => ({ type: 'CPU', x: 0, y: 0, w: 0.1, h: 0.1 }))
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', { context: { dieShape: 'rect', blocks } }, cookie),
    )
    expect(res.status).toBe(400)
    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(0)
  })

  it('rejects an oversized generate-variations context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const blocks = Array.from({ length: 65 }, () => ({ type: 'CPU', x: 0, y: 0, w: 0.1, h: 0.1 }))
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', { context: { theme: 'neon', dieShape: 'rect', blocks }, count: 3 }, cookie),
    )
    expect(res.status).toBe(400)
  })

  it('rejects an oversized generate-copy context (too many blockTypes) with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const blockTypes = Array.from({ length: 65 }, () => 'CPU')
    const res = await app.request(
      '/api/ai/generate-copy',
      jsonRequest('POST', { context: { theme: 'neon', dieShape: 'rect', blockTypes } }, cookie),
    )
    expect(res.status).toBe(400)
  })
})
```

> Note: `signIn` and `createTestApp`/`jsonRequest` are already imported at the top of `aiRoutes.test.ts`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace server -- aiRoutes`
Expected: FAIL — oversized requests currently return `200` (no bound check yet).

- [ ] **Step 3: Add the constants and bound checks**

In `server/src/ai/routes.ts`, add the constants near the top of the file (after the imports, before `aiRoutes`):

```ts
const MAX_PROMPT_LENGTH = 2000
const MAX_CONTEXT_BLOCKS = 64
```

In the **`/ai/generate-draft`** handler, after the existing empty-prompt check (`if (prompt.trim() === '') ...`) and **before** `logPrompt`, add:

```ts
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Prompt is too long.')
    }
```

In the **`/ai/generate-copy`** handler, after the `context` object is built and **before** `logPrompt`, add:

```ts
    if (context.blockTypes.length > MAX_CONTEXT_BLOCKS) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Too many blocks.')
    }
```

In the **`/ai/suggest-layout`** handler, after the `context` object is built and **before** `logPrompt`, add:

```ts
    if (context.blocks.length > MAX_CONTEXT_BLOCKS) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Too many blocks.')
    }
```

In the **`/ai/generate-variations`** handler, after the `context` object is built and **before** `logPrompt`, add:

```ts
    if (context.blocks.length > MAX_CONTEXT_BLOCKS) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Too many blocks.')
    }
```

> Note: each check goes *after* `context`/`prompt` is parsed and *before* the `logPrompt(...)` line, so an oversized request consumes no quota and writes no `ai_prompt_log` row. `PAYLOAD_TOO_LARGE` uses status `400`, already in `fail`'s union.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test --workspace server -- aiRoutes`
Expected: PASS (existing + 4 new). The earlier "logs a … prompt" tests still pass (their payloads are under the bounds).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/routes.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): reject oversized AI prompt/context with 400 before quota log"
```

---

### Task 3: `summarizeAiUsage` aggregation

**Files:**
- Create: `server/src/ai/usage.ts`
- Test: `server/test/aiUsage.test.ts`

**Interfaces:**
- Consumes: a `better-sqlite3` `Database` handle reading the `ai_prompt_log` table (columns `user_id`, `kind`, `created_at`).
- Produces: `type AiUsageSummary = { since: number; until: number; totalCalls: number; distinctUsers: number; byKind: Record<string, number> }`; `summarizeAiUsage(db: Database.Database, window: { since: number; until: number }): AiUsageSummary`. Used by Task 4.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiUsage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { logPrompt } from '../src/ai/quota'
import { summarizeAiUsage } from '../src/ai/usage'

function seedUser(db: ReturnType<typeof openDatabase>, id: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)',
  ).run(id, `${id}@e.c`, id, 'h', 0, 0)
}

describe('summarizeAiUsage', () => {
  it('aggregates calls per kind, distinct users, and respects the window', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seedUser(db, 'u1')
    seedUser(db, 'u2')

    let t = 1000
    logPrompt(db, { userId: 'u1', kind: 'generate-draft', prompt: 'a' }, () => (t += 1))
    logPrompt(db, { userId: 'u1', kind: 'generate-copy', prompt: 'b' }, () => (t += 1))
    logPrompt(db, { userId: 'u2', kind: 'generate-draft', prompt: 'c' }, () => (t += 1))
    // An old row outside the window:
    logPrompt(db, { userId: 'u2', kind: 'suggest-layout', prompt: 'd' }, () => 100)

    const summary = summarizeAiUsage(db, { since: 500, until: 10_000 })
    expect(summary.totalCalls).toBe(3)
    expect(summary.distinctUsers).toBe(2)
    expect(summary.byKind).toEqual({ 'generate-draft': 2, 'generate-copy': 1 })
  })

  it('returns zeros and an empty byKind for an empty window', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    const summary = summarizeAiUsage(db, { since: 0, until: 10 })
    expect(summary).toEqual({ since: 0, until: 10, totalCalls: 0, distinctUsers: 0, byKind: {} })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace server -- aiUsage`
Expected: FAIL — cannot resolve `../src/ai/usage`.

- [ ] **Step 3: Write the aggregation**

Create `server/src/ai/usage.ts`:

```ts
import type Database from 'better-sqlite3'

export type AiUsageSummary = {
  since: number
  until: number
  totalCalls: number
  distinctUsers: number
  byKind: Record<string, number>
}

/** Aggregates ai_prompt_log over [since, until] — the owner-facing AI usage/cost signal. */
export function summarizeAiUsage(
  db: Database.Database,
  window: { since: number; until: number },
): AiUsageSummary {
  const { since, until } = window
  const totals = db
    .prepare(
      'SELECT COUNT(*) AS n, COUNT(DISTINCT user_id) AS u FROM ai_prompt_log WHERE created_at >= ? AND created_at <= ?',
    )
    .get(since, until) as { n: number; u: number }
  const rows = db
    .prepare(
      'SELECT kind, COUNT(*) AS n FROM ai_prompt_log WHERE created_at >= ? AND created_at <= ? GROUP BY kind',
    )
    .all(since, until) as { kind: string; n: number }[]
  const byKind: Record<string, number> = {}
  for (const row of rows) byKind[row.kind] = row.n
  return { since, until, totalCalls: totals.n, distinctUsers: totals.u, byKind }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace server -- aiUsage`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/usage.ts server/test/aiUsage.test.ts
git commit -m "feat(v8): add summarizeAiUsage aggregation over ai_prompt_log"
```

---

### Task 4: `GET /api/ai/usage` admin endpoint

**Files:**
- Modify: `server/src/ai/routes.ts` (accept `adminEmails` from deps; widen `fail` to `403`; import `isAdminEmail` + `summarizeAiUsage`; add the handler)
- Test: `server/test/aiRoutes.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: the existing `getSignedCookie`/`SESSION_COOKIE`/`getSessionUser` in `aiRoutes`; `AppDeps.adminEmails`; `isAdminEmail` (`../moderation/adminAuth`); `summarizeAiUsage` (Task 3).
- Produces: `GET /ai/usage?windowHours=H` returning the `AiUsageSummary` JSON; 401 (no session), 403 (non-admin), 200 (admin).

- [ ] **Step 1: Write the failing tests**

Append to `server/test/aiRoutes.test.ts`:

```ts
const USAGE_ADMIN_OPTS = { signupsOpen: true, adminEmails: ['ada@example.com'] }
const USAGE_NON_ADMIN = { email: 'eve@example.com', displayName: 'Eve', password: 'hunter22hunter22' }

describe('GET /api/ai/usage', () => {
  it('rejects anonymous callers with 401', async () => {
    const { app } = createTestApp(Date.now, USAGE_ADMIN_OPTS)
    const res = await app.request('/api/ai/usage')
    expect(res.status).toBe(401)
  })

  it('rejects non-admins with 403', async () => {
    const { app } = createTestApp(Date.now, USAGE_ADMIN_OPTS)
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', USAGE_NON_ADMIN))
    const cookie = sessionCookie(signup)
    const res = await app.request('/api/ai/usage', { headers: { cookie } })
    expect(res.status).toBe(403)
  })

  it('returns an aggregate usage summary for an admin', async () => {
    const { app } = createTestApp(Date.now, USAGE_ADMIN_OPTS)
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)
    await app.request('/api/ai/generate-draft', jsonRequest('POST', { prompt: 'a neon chip' }, cookie))
    const res = await app.request('/api/ai/usage', { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { totalCalls: number; byKind: Record<string, number> }
    expect(body.totalCalls).toBeGreaterThanOrEqual(1)
    expect(body.byKind['generate-draft']).toBeGreaterThanOrEqual(1)
  })
})
```

> Note: `sessionCookie` must be imported in this test file. If the existing import line is `import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'`, it is already present; otherwise add `sessionCookie` to it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test --workspace server -- aiRoutes`
Expected: FAIL — `/api/ai/usage` returns 404 (not mounted).

- [ ] **Step 3: Wire deps, widen `fail`, add imports**

In `server/src/ai/routes.ts`:

Add imports near the top (with the other imports):

```ts
import { isAdminEmail } from '../moderation/adminAuth'
import { summarizeAiUsage } from './usage'
```

Add `adminEmails` to the destructured `aiRoutes` parameters:

```ts
export function aiRoutes({
  db,
  sessionSecret,
  now = Date.now,
  aiProvider = createFakeProvider(),
  aiDailyQuota = 20,
  adminEmails = [],
}: AppDeps) {
```

Widen the `fail` status union to include `403`:

```ts
  function fail(c: Context, status: 400 | 401 | 403 | 429 | 503, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }
```

- [ ] **Step 4: Add the handler**

In `server/src/ai/routes.ts`, add the handler **before** `return routes`:

```ts
  routes.get('/ai/usage', async (c) => {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    const user = typeof token === 'string' && token !== '' ? getSessionUser(db, token, now) : null
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    if (!isAdminEmail(user.email, adminEmails)) {
      return fail(c, 403, 'FORBIDDEN', 'Admin access required.')
    }
    const rawHours = Number(c.req.query('windowHours'))
    const hours = Number.isFinite(rawHours) && rawHours > 0 ? Math.min(720, Math.floor(rawHours)) : 24
    const until = now()
    const since = until - hours * 60 * 60 * 1000
    return c.json(summarizeAiUsage(db, { since, until }))
  })
```

- [ ] **Step 5: Run the tests + server typecheck**

Run: `npm test --workspace server -- aiRoutes`
Expected: PASS (existing + 3 new).

Run: `npm run typecheck --workspace server`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add server/src/ai/routes.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): admin-only GET /api/ai/usage aggregate read"
```

---

### Task 5: Client prompt length cap (defense in depth)

**Files:**
- Modify: `src/features/projects/ProjectDashboard.tsx` (the AI prompt `<input>`)
- Test: `src/features/projects/ProjectDashboard.test.tsx` (add a `maxLength` assertion)

**Interfaces:**
- Consumes: the existing AI prompt input (`aria-label="AI chip prompt"`).
- Produces: that input gains `maxLength={2000}` (mirrors the server `MAX_PROMPT_LENGTH`).

- [ ] **Step 1: Add the failing assertion**

In `src/features/projects/ProjectDashboard.test.tsx`, add a test (or extend an existing render). A self-contained test:

```tsx
  it('caps the AI prompt input length at 2000 characters', () => {
    renderDashboard() // existing helper in this file that renders ProjectDashboard with stub props
    expect(screen.getByLabelText('AI chip prompt')).toHaveAttribute('maxlength', '2000')
  })
```

> Note: this file already renders `ProjectDashboard` with stub props in its other tests — reuse that file's existing render helper (named `renderDashboard` here as a placeholder for whatever the file already uses). If the file renders inline, copy that inline render into this test. `screen` and `toHaveAttribute` (jest-dom) are already available via the shared test setup.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/features/projects/ProjectDashboard.test.tsx`
Expected: FAIL — the input has no `maxlength` attribute.

- [ ] **Step 3: Add `maxLength` to the input**

In `src/features/projects/ProjectDashboard.tsx`, add `maxLength={2000}` to the AI prompt input:

```tsx
              <input
                className="v2-ai-prompt"
                aria-label="AI chip prompt"
                placeholder="Describe a chip…"
                maxLength={2000}
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
              />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:client -- src/features/projects/ProjectDashboard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/ProjectDashboard.tsx src/features/projects/ProjectDashboard.test.tsx
git commit -m "feat(v8): cap AI prompt input at 2000 chars (defense in depth)"
```

---

### Task 6: End-to-end fake-provider test (full AI surface)

**Files:**
- Create: `server/test/aiEndToEnd.test.ts`

**Interfaces:**
- Consumes: `createTestApp`, `jsonRequest`, `sessionCookie`, `VALID_SIGNUP` (`./helpers`); the four mounted AI routes; the shared 24h quota.
- Produces: one integration test proving the full AI surface end to end with the fake provider, including cross-kind shared-quota exhaustion.

- [ ] **Step 1: Write the failing test**

Create `server/test/aiEndToEnd.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

const DRAFT = { prompt: 'a neon dream chip' }
const COPY = { context: { name: 'NOVA', theme: 'neon', dieShape: 'rect', blockTypes: ['CPU', 'Cache'] } }
const SUGGEST = { context: { dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] } }
const VARIATIONS = {
  context: { name: 'NOVA', theme: 'neon', dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
  count: 3,
}

async function signIn(app: ReturnType<typeof createTestApp>['app']) {
  const res = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
  return sessionCookie(res)
}

describe('AI surface end-to-end (fake provider)', () => {
  it('runs all four AI endpoints for a signed-in user and logs each call', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)

    const draft = await app.request('/api/ai/generate-draft', jsonRequest('POST', DRAFT, cookie))
    expect(draft.status).toBe(200)
    expect(((await draft.json()) as { project: { schemaVersion: number } }).project.schemaVersion).toBe(5)

    const copy = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY, cookie))
    expect(copy.status).toBe(200)
    expect(typeof ((await copy.json()) as { spec: { brand: string } }).spec.brand).toBe('string')

    const suggest = await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST, cookie))
    expect(suggest.status).toBe(200)
    expect(Array.isArray(((await suggest.json()) as { suggestions: unknown[] }).suggestions)).toBe(true)

    const variations = await app.request('/api/ai/generate-variations', jsonRequest('POST', VARIATIONS, cookie))
    expect(variations.status).toBe(200)
    expect(((await variations.json()) as { variations: unknown[] }).variations.length).toBeGreaterThan(0)

    const n = (db.prepare('SELECT COUNT(*) AS n FROM ai_prompt_log').get() as { n: number }).n
    expect(n).toBe(4)
  })

  it('shares the 24h quota across all AI kinds', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 4 })
    const cookie = await signIn(app)

    expect((await app.request('/api/ai/generate-draft', jsonRequest('POST', DRAFT, cookie))).status).toBe(200)
    expect((await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY, cookie))).status).toBe(200)
    expect((await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST, cookie))).status).toBe(200)
    expect((await app.request('/api/ai/generate-variations', jsonRequest('POST', VARIATIONS, cookie))).status).toBe(200)

    // The shared quota of 4 is now exhausted regardless of kind:
    const fifth = await app.request('/api/ai/generate-draft', jsonRequest('POST', DRAFT, cookie))
    expect(fifth.status).toBe(429)
  })
})
```

- [ ] **Step 2: Run the test to verify it passes immediately**

Run: `npm test --workspace server -- aiEndToEnd`
Expected: PASS (2 tests). This is a **characterization / integration** test over already-built endpoints (M0–M4) plus the M5 shared-quota guarantee — it should pass on first run. If any assertion fails, that is a real regression in the AI surface; fix the offending route before continuing (do not weaken the test).

- [ ] **Step 3: Commit**

```bash
git add server/test/aiEndToEnd.test.ts
git commit -m "test(v8): end-to-end fake-provider coverage of the full AI surface"
```

---

### Task 7: Version bump, final gates, docs, milestone status

**Files:**
- Modify: `README.md` (version line → `0.6 v8`)
- Modify: `implementation.md` (append a dated V8-M5 entry, Korean)
- Modify: `CLAUDE.md` (Working Context v8 bullet + the `### v8 AI-Assisted Creation` Milestone Status block + v8 marked complete)

**Interfaces:** none (verification + documentation).

- [ ] **Step 1: Bump the version line**

In `README.md`, find the existing version line (set to `0.5 v7` at v7-M6 close) and update it to `0.6 v8`. Use the existing line's exact surrounding text; only change the version token.

```bash
grep -n "0.5 v7\|version" README.md
```
Then edit the matched line so it reads `0.6 v8` (leave `package.json` at `1.0.0`).

- [ ] **Step 2: Run all gates**

```bash
npm test
npm run build
npm run typecheck --workspace server
npm run lint
```
Expected: all green. Record the client/server file+test counts from `npm test` (the known >500 kB chunk warning on build is acceptable).

- [ ] **Step 3: Confirm no API key leaks client-side**

Run: `npm run build && grep -rl "ANTHROPIC_API_KEY" dist/assets || echo "no api key in client bundle"`
Expected: prints `no api key in client bundle`.

- [ ] **Step 4: Record the V8-M5 outcome in `implementation.md`**

Append a `## V8-M5 QA & Cost Hardening (2026-06-20)` section (Korean, matching the file's style): the abuse bounds (`MAX_PROMPT_LENGTH` 2000 / `MAX_CONTEXT_BLOCKS` 64, rejected with `400 PAYLOAD_TOO_LARGE` before quota log on all four AI routes, + client `maxLength` 2000); the AI burst rate-limit overrides (10/min/IP per AI endpoint via `SENSITIVE_RATE_LIMIT_OVERRIDES`, production-only); the admin-only `GET /api/ai/usage` backed by `summarizeAiUsage` over `ai_prompt_log` (inline admin guard, no migration, no admin-UI); the end-to-end fake-provider test (4 endpoints + cross-kind shared quota); version line → `0.6 v8`; no migration/schema/export/`src/domain` change; key server-only; final gate counts; browser QA owner-manual/pending. Note this closes v8.

- [ ] **Step 5: Update `CLAUDE.md`**

In the `### v8 AI-Assisted Creation` Milestone Status block, add a **V8-M5** line summarizing the above and pointing to the spec (`docs/superpowers/specs/2026-06-20-v8-m5-qa-cost-hardening-design.md`) and this plan; mark v8 as **complete through M5** (the closing milestone). Update the Working Context v8 bullet to note v8 is complete through M5 (QA & cost hardening: input bounds + AI burst rate-limit + admin usage read + E2E test; no schema/migration/export change; local-first unchanged; version line `0.6 v8`; public launch remains a separate gate; browser QA pending owner-manual).

- [ ] **Step 6: Commit**

```bash
git add -f README.md implementation.md CLAUDE.md
git commit -m "docs(v8): record v8-M5 QA & cost hardening; bump version line to 0.6 v8"
```

---

## Self-Review

**1. Spec coverage:**
- Prompt-abuse bounds reject oversized with 400 before quota log (prompt 2000 / context 64) → Task 2; client `maxLength` → Task 5. ✅
- AI burst rate-limit overrides (10/min/IP per AI endpoint) → Task 1. ✅
- Cost monitoring: `summarizeAiUsage` over `ai_prompt_log` → Task 3; admin-only `GET /api/ai/usage` (inline guard, 401/403/200, no migration, no admin-UI) → Task 4. ✅
- End-to-end fake-provider test (4 endpoints + shared-quota) → Task 6. ✅
- Version bump `0.6 v8` + final gates + docs → Task 7. ✅
- No migration / no schema bump / key server-only / no Konva export / no `src/domain` change → Global Constraints; honored across all tasks; key-leak grep in Task 7. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" — every code step shows full code. Task 5's render-helper name (`renderDashboard`) is explicitly flagged as a placeholder for whatever the existing test file uses, with the fallback (copy the inline render) given. Doc/test counts in Task 7 are runtime-filled by design.

**3. Type consistency:** `MAX_PROMPT_LENGTH`/`MAX_CONTEXT_BLOCKS` (Task 2) are the same constants referenced in the client cap (Task 5, value 2000) and the spec. `summarizeAiUsage(db, { since, until }): AiUsageSummary` (Task 3) is consumed exactly by the `GET /ai/usage` handler (Task 4). `fail`'s widened union `400 | 401 | 403 | 429 | 503` (Task 4) covers the `403` the usage handler returns and the `400 PAYLOAD_TOO_LARGE` from Task 2. The four override keys `POST:/api/ai/<endpoint>` (Task 1) match the actual mounted route paths (`/api` + `/ai/<endpoint>`). The E2E bodies (Task 6) match each endpoint's contract from M0/M1/M3/M4 (`{prompt}`, `{context:{...blockTypes}}`, `{context:{...blocks}}`, `{context, count}`).

## Notes

- M5 is server-side hardening + a one-line client change; it touches **no** `@anthropic-ai/sdk` code and **no** `src/domain/` code.
- `aiRoutes` importing `../moderation/adminAuth` (`isAdminEmail`) is an intra-server import and follows the existing cross-module pattern (moderation already imports `accounts/service`). The usage endpoint is guarded **inline** and lives under `/ai/` (not `/admin/`) to avoid the moderation `/admin/*` sub-app middleware overlap (the v4 contests lesson).
- The AI rate-limit overrides only take effect when `deps.rateLimit` is set (production config). Dev/test (`createTestApp`) leaves rate limiting off, so the route/E2E tests exercise the quota + bounds, not the burst cap; the burst cap is asserted at the config layer (Task 1).
- Abuse bounds are checked after the auth+quota guard and before `logPrompt`, so an oversized request from an authed under-quota user is rejected without consuming quota or writing a log row (asserted in Task 2).
- This is the final v8 milestone. After M5, v8 is complete on `v8-ai-assisted-creation`; merge/PR and the public-launch gate remain the owner's separate decisions.
