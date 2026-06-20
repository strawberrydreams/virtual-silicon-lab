# v8-M4 AI Remix / Variations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Before Task 3 (the `@anthropic-ai/sdk` adapter method), re-invoke the `claude-api` skill** to confirm the current structured-output binding — mirror the existing `generateChipDraft`/`generateSpecCopy`/`generateLayoutSuggestions` usage in the same file. The test mocks the SDK; no network call.

**Goal:** From the chip being edited, generate 2–4 stylistic variations (recolor/re-theme/re-arrange), preview each as a mini live Konva thumbnail in an editor inspector-rail panel, and save chosen ones as independent local projects — the source chip is never mutated.

**Architecture:** Independent feature reusing M0's provider/quota/`ai_prompt_log` foundation, M2's local-save pattern (`projectStore.createFromAiDraft` → `materializeAiDraftProject`, unchanged), and M3's full-layout context (`deriveAiLayoutContext`). A new pure `deriveAiVariationContext` adds name+theme to M3's layout context; the `AiProvider` gains `generateVariations`; a new `POST /api/ai/generate-variations` maps each returned `AiChipDraft` through the existing `mapAiDraftToProject` (the per-variation valid-project guarantee). Variation thumbnails reuse the existing read-only `MobileChipPreview`.

**Tech Stack:** TypeScript, React + Vitest + React Testing Library (client), Hono + better-sqlite3 + `@anthropic-ai/sdk` (server workspace). Shared domain reused server-side via the `@domain/*` alias.

## Global Constraints

Every task's requirements implicitly include this section. Exact values:

- **No migration, no schema bump.** `CURRENT_SCHEMA_VERSION` stays `5`. `AiVariationContext` is an in-memory intermediate shape; variations reuse the existing `AiChipDraft` and resolve to the existing `Block`/`Project` shapes.
- **Reuse M0 server foundation.** The new route reuses `requireUserWithinQuota`, the shared 24h quota, and the `ai_prompt_log` table with `kind='generate-variations'` — **one row / one quota unit per call** regardless of N. No new table, no new config.
- **Reuse M2 save path.** Saving a variation goes through the **existing** `projectStore.createFromAiDraft` → `materializeAiDraftProject` (migrate + deep-clone + fresh id/timestamps, name kept, no `remixedFrom`). **No new store method.** The source chip is only read, never written.
- **Per-variation valid-project guarantee.** Each `AiChipDraft` flows through the existing `mapAiDraftToProject` (server) and `migrateProject` on save (client). Structured outputs enforce shape only.
- **Count is clamped server-side to `[2, 4]`** (default 3 on missing/invalid); the panel control offers 2–4 (default 3).
- **AI model id is `claude-opus-4-8`** (existing `VSL_AI_MODEL` default), via the existing provider wiring.
- **`src/domain/` purity:** the new `src/domain/ai/` modules import nothing from React/Konva/Zustand/IndexedDB/AI SDK/network.
- **`ANTHROPIC_API_KEY` stays server-only** — never in any client `dist/assets` bundle or API response.
- **No Konva 2D PNG export change.** Local-first publish/export contracts unchanged.
- **TDD per CLAUDE.md:** Vitest with explicit `import { describe, expect, it } from 'vitest'` (no globals). Vanilla Zustand stores tested via `store.getState()`. **Konva rendering is NOT unit-tested** (jsdom lacks canvas) — the panel test mocks `MobileChipPreview`; thumbnails are browser-verified. Run `npm test` + `npm run build` after each task; server work also runs `npm run typecheck --workspace server` and `npm run lint`.

> **Planning note (deviation from spec, intentional):** the spec named a new `ChipVariationThumbnail` + a pure fit-scale helper. During planning we found the existing `src/features/editor/MobileChipPreview.tsx` already is a read-only, fit-to-width Konva preview reusing the shared `ChipArtwork`. M4 **reuses `MobileChipPreview`** directly (DRY) — no new thumbnail component and no new fit-scale helper/test. Its fit math is already browser-verified.

---

### Task 1: Pure `AiVariationContext` type + `deriveAiVariationContext`

**Files:**
- Create: `src/domain/ai/aiVariationContext.ts`
- Create: `src/domain/ai/deriveAiVariationContext.ts`
- Test: `src/domain/ai/deriveAiVariationContext.test.ts`

**Interfaces:**
- Consumes: `DieShape`/`StyleTheme`/`Project` (`src/domain/project`); `deriveAiLayoutContext` (`src/domain/ai/deriveAiLayoutContext`, M3).
- Produces: `type AiVariationContext = { name?: string; theme: StyleTheme; dieShape: DieShape; blocks: { type: string; x: number; y: number; w: number; h: number }[] }`; `deriveAiVariationContext(project: Project): AiVariationContext`. Used by Tasks 2, 3, 4, 5, 6.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/deriveAiVariationContext.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from '../projectFactory'
import { buildBlock } from '../blockFactory'
import { deriveAiVariationContext } from './deriveAiVariationContext'

describe('deriveAiVariationContext', () => {
  it('derives name, theme, die shape, and existing blocks as fractional rectangles', () => {
    const project = createProject('Nova Chip', 'p1', 0)
    project.theme = 'retro'
    project.die = { ...project.die, shape: 'square', width: 800, height: 800 }
    project.blocks = [{ ...buildBlock(project, 'CPU', 'cpu'), x: 80, y: 160, w: 200, h: 80, zIndex: 0 }]

    const ctx = deriveAiVariationContext(project)
    expect(ctx.name).toBe('Nova Chip')
    expect(ctx.theme).toBe('retro')
    expect(ctx.dieShape).toBe('square')
    expect(ctx.blocks).toEqual([{ type: 'CPU', x: 0.1, y: 0.2, w: 0.25, h: 0.1 }])
  })

  it('returns an empty block list for a blank project', () => {
    const ctx = deriveAiVariationContext(createProject('Blank', 'p2', 0))
    expect(ctx.blocks).toEqual([])
    expect(ctx.dieShape).toBe('rect')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/domain/ai/deriveAiVariationContext.test.ts`
Expected: FAIL — cannot resolve `./deriveAiVariationContext`.

- [ ] **Step 3: Write the type**

Create `src/domain/ai/aiVariationContext.ts`:

```ts
import type { DieShape, StyleTheme } from '../project'

/**
 * The source chip the AI re-styles into variations: M3's layout context
 * (die shape + existing blocks as fractions of the die) plus the chip's name + theme.
 */
export type AiVariationContext = {
  name?: string
  theme: StyleTheme
  dieShape: DieShape
  blocks: { type: string; x: number; y: number; w: number; h: number }[]
}
```

- [ ] **Step 4: Write the derivation**

Create `src/domain/ai/deriveAiVariationContext.ts`:

```ts
import type { Project } from '../project'
import type { AiVariationContext } from './aiVariationContext'
import { deriveAiLayoutContext } from './deriveAiLayoutContext'

/** Pure: name + theme + the M3 full-layout context (die shape + fractional blocks). */
export function deriveAiVariationContext(project: Project): AiVariationContext {
  return {
    name: project.name,
    theme: project.theme,
    ...deriveAiLayoutContext(project),
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:client -- src/domain/ai/deriveAiVariationContext.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/ai/aiVariationContext.ts src/domain/ai/deriveAiVariationContext.ts src/domain/ai/deriveAiVariationContext.test.ts
git commit -m "feat(v8): AiVariationContext type + deriveAiVariationContext"
```

---

### Task 2: `AiProvider.generateVariations` interface + deterministic fake

**Files:**
- Modify: `server/src/ai/provider.ts`
- Modify: `server/src/ai/fakeProvider.ts`
- Test: `server/test/aiFakeProvider.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `AiVariationContext` (`@domain/ai/aiVariationContext`, Task 1); `AiChipDraft` (`@domain/ai/aiChipDraft`); `StyleTheme` (`@domain/project`).
- Produces: `type AiVariationsInput = { context: AiVariationContext; count: number }`; `AiProvider.generateVariations(input: AiVariationsInput): Promise<{ variations: AiChipDraft[] }>`; the fake's deterministic implementation. Used by Tasks 3, 4.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiFakeProvider.test.ts`:

```ts
import type { AiVariationContext } from '@domain/ai/aiVariationContext'

describe('createFakeProvider.generateVariations', () => {
  const context: AiVariationContext = {
    name: 'NOVA',
    theme: 'neon',
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  }

  it('returns `count` deterministic variations that keep the layout but vary the theme', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateVariations({ context, count: 3 })
    const b = await provider.generateVariations({ context, count: 3 })
    expect(a).toEqual(b)
    expect(a.variations).toHaveLength(3)
    expect(a.variations.every((v) => v.blocks.length === 1)).toBe(true)
    expect(new Set(a.variations.map((v) => v.theme)).size).toBeGreaterThan(1)
  })

  it('honors the requested count', async () => {
    const provider = createFakeProvider()
    expect((await provider.generateVariations({ context, count: 2 })).variations).toHaveLength(2)
  })
})
```

> Note: keep the existing imports; add the `AiVariationContext` import and the new `describe`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: FAIL — `generateVariations` is not a function.

- [ ] **Step 3: Extend the provider interface**

Replace the contents of `server/src/ai/provider.ts`:

```ts
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiChipContext, AiSpecDraft } from '@domain/ai/aiSpecDraft'
import type { AiLayoutContext, AiLayoutSuggestion } from '@domain/ai/aiLayoutSuggestion'
import type { AiVariationContext } from '@domain/ai/aiVariationContext'

export type AiGenerateInput = { prompt: string }
export type AiSpecCopyInput = { context: AiChipContext }
export type AiLayoutInput = { context: AiLayoutContext }
export type AiVariationsInput = { context: AiVariationContext; count: number }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
  generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>
  generateLayoutSuggestions(
    input: AiLayoutInput,
  ): Promise<{ suggestions: AiLayoutSuggestion[] }>
  generateVariations(input: AiVariationsInput): Promise<{ variations: AiChipDraft[] }>
}
```

> Note: this file's exact existing shape may differ slightly (e.g. the M3 `AiLayoutInput`/`generateLayoutSuggestions` names) — if so, **add** the `AiVariationsInput` type and the `generateVariations` method to the existing interface rather than overwriting unrelated lines. The names above (`AiVariationsInput`, `generateVariations`, `{ variations }`) are authoritative for this plan.

- [ ] **Step 4: Implement the fake**

In `server/src/ai/fakeProvider.ts`, add the import at the top:

```ts
import type { StyleTheme } from '@domain/project'
```

Add the method to the object returned by `createFakeProvider` (after `generateLayoutSuggestions`):

```ts
    async generateVariations(input) {
      const { context, count } = input
      const themes: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']
      const baseName = (context.name ?? '').trim() || 'AI Chip'
      const baseIndex = Math.max(0, themes.indexOf(context.theme))
      const variations = Array.from({ length: count }, (_, index) => ({
        name: `${baseName} v${index + 1}`,
        dieShape: context.dieShape,
        theme: themes[(baseIndex + index + 1) % themes.length],
        blocks: context.blocks.map((block) => ({
          type: block.type,
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
        })),
      }))
      return { variations }
    },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: PASS (existing + 2 new).

- [ ] **Step 6: Server typecheck (transient note)**

Run: `npm run typecheck --workspace server`
Expected: errors are EXPECTED at this point — `anthropicProvider.ts` and the inline `failing` provider mocks in `server/test/aiRoutes.test.ts` do not yet implement `generateVariations`. Those are fixed in Tasks 3 and 4; typecheck is green again after Task 4. Per-task `npm test` (vitest/esbuild, no typecheck) stays green. Proceed.

- [ ] **Step 7: Commit**

```bash
git add server/src/ai/provider.ts server/src/ai/fakeProvider.ts server/test/aiFakeProvider.test.ts
git commit -m "feat(v8): AiProvider.generateVariations interface + deterministic fake"
```

---

### Task 3: Anthropic adapter `generateVariations`

> **First, re-invoke the `claude-api` skill** to confirm the structured-output binding. Mirror the existing `generateChipDraft`/`generateSpecCopy`/`generateLayoutSuggestions` in this same file.

**Files:**
- Modify: `server/src/ai/anthropicProvider.ts`
- Test: `server/test/aiAnthropicProvider.test.ts` (append a `describe`; the SDK is already mocked at the top of that file)

**Interfaces:**
- Consumes: the mocked `@anthropic-ai/sdk` `messages.create`; `AiChipDraft` (`@domain/ai/aiChipDraft`).
- Produces: `createAnthropicProvider(...).generateVariations({ context, count })` — issues `claude-opus-4-8` with an `output_config.format` json_schema for a `{ variations: [...] }` object, throws on a refusal `stop_reason`, and parses the structured JSON.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiAnthropicProvider.test.ts`:

```ts
describe('createAnthropicProvider.generateVariations', () => {
  it('requests opus-4-8 with a json_schema format and parses the variations', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            variations: [
              { name: 'A', dieShape: 'rect', theme: 'retro', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
            ],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const result = await provider.generateVariations({
      context: { name: 'A', theme: 'neon', dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
      count: 2,
    })
    expect(result.variations[0].theme).toBe('retro')
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(
      provider.generateVariations({ context: { theme: 'neon', dieShape: 'rect', blocks: [] }, count: 3 }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: FAIL — `generateVariations` is not a function.

- [ ] **Step 3: Add the schema and method**

In `server/src/ai/anthropicProvider.ts`, add a `VARIATIONS_SCHEMA` constant after the existing schemas:

```ts
const VARIATIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    variations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          dieShape: { type: 'string', enum: ['rect', 'square', 'circle', 'hexagon'] },
          theme: { type: 'string', enum: ['neon', 'retro', 'military', 'keynote', 'mono'] },
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
      },
    },
  },
  required: ['variations'],
} as const
```

Add the method to the object returned by `createAnthropicProvider` (after `generateLayoutSuggestions`), mirroring its style:

```ts
    async generateVariations(input) {
      const { context, count } = input
      const summary =
        `name=${context.name ?? 'unknown'}, theme=${context.theme}, dieShape=${context.dieShape}, ` +
        `blocks=[${context.blocks.map((block) => block.type).join(', ')}]`
      const response = await client.messages.create({
        model: opts.model,
        max_tokens: 4096,
        output_config: { format: { type: 'json_schema', schema: VARIATIONS_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              `Return ONLY JSON: an array "variations" of exactly ${count} stylistic variations ` +
              '(recolor / re-theme / re-arrange) of this surreal fictional chip. Each variation has a ' +
              'name, a dieShape, a theme from neon/retro/military/keynote/mono, and blocks with ' +
              `fractional x,y,w,h in [0,1]. Source chip: ${summary}`,
          },
        ],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming)

      if ((response.stop_reason as string) === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as { variations: AiChipDraft[] }
    },
```

> Note: `AiChipDraft` is already imported at the top of `anthropicProvider.ts` (used by `generateChipDraft`). If not, add `import type { AiChipDraft } from '@domain/ai/aiChipDraft'`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/anthropicProvider.ts server/test/aiAnthropicProvider.test.ts
git commit -m "feat(v8): Anthropic generateVariations with json_schema structured output"
```

---

### Task 4: `POST /api/ai/generate-variations` route

**Files:**
- Modify: `server/src/ai/routes.ts`
- Test: `server/test/aiRoutes.test.ts` (append a `describe`; **also** add `generateVariations` to the two existing inline `failing` provider mocks — in the `generate-copy` and `suggest-layout` 503 tests — so they still satisfy `AiProvider`)

**Interfaces:**
- Consumes: the existing `requireUserWithinQuota`, `fail`, `logPrompt`, `aiProvider`, `db`, `now` in `aiRoutes`; `mapAiDraftToProject` (already imported in `routes.ts`); `AiVariationContext` (`@domain/ai/aiVariationContext`).
- Produces: a `POST /ai/generate-variations` handler returning `{ variations: Project[] }`.

- [ ] **Step 1: Write the failing tests + fix the existing failing mocks**

Append to `server/test/aiRoutes.test.ts`:

```ts
const VARIATIONS_BODY = {
  context: { name: 'NOVA', theme: 'neon', dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
  count: 3,
}

describe('POST /api/ai/generate-variations', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/generate-variations', jsonRequest('POST', VARIATIONS_BODY))
    expect(res.status).toBe(401)
  })

  it('returns N valid variation projects and logs a generate-variations prompt', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { variations: { schemaVersion: number }[] }
    expect(body.variations).toHaveLength(3)
    expect(body.variations.every((v) => v.schemaVersion === 5)).toBe(true)
    const row = db.prepare('SELECT kind FROM ai_prompt_log').get() as { kind: string }
    expect(row.kind).toBe('generate-variations')
  })

  it('clamps the count into [2, 4]', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', { ...VARIATIONS_BODY, count: 9 }, cookie),
    )
    const body = (await res.json()) as { variations: unknown[] }
    expect(body.variations).toHaveLength(4)
  })

  it('rejects a missing context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-variations', jsonRequest('POST', { count: 3 }, cookie))
    expect(res.status).toBe(400)
  })

  it('enforces the shared daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/generate-variations', jsonRequest('POST', VARIATIONS_BODY, cookie))
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY, cookie),
    )
    expect(res.status).toBe(429)
  })

  it('returns 503 when the provider throws', async () => {
    const failing = {
      async generateChipDraft() {
        throw new Error('down')
      },
      async generateSpecCopy() {
        throw new Error('down')
      },
      async generateLayoutSuggestions() {
        throw new Error('down')
      },
      async generateVariations() {
        throw new Error('down')
      },
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-variations',
      jsonRequest('POST', VARIATIONS_BODY, cookie),
    )
    expect(res.status).toBe(503)
  })
})
```

Also, in the **existing** `generate-copy` 503 test and `suggest-layout` 503 test in this file, add `async generateVariations() { throw new Error('down') }` to each inline `failing` object so it still satisfies `AiProvider`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test --workspace server -- aiRoutes`
Expected: FAIL — `/ai/generate-variations` not mounted (404).

- [ ] **Step 3: Add the route handler**

In `server/src/ai/routes.ts`, add the import near the other `@domain` imports:

```ts
import type { AiVariationContext } from '@domain/ai/aiVariationContext'
```

Add the handler **before** `return routes` (after the existing handlers):

```ts
  routes.post('/ai/generate-variations', async (c) => {
    const guard = await requireUserWithinQuota(c)
    if ('response' in guard) return guard.response
    const user = guard.user

    const body = (await c.req.json().catch(() => null)) as
      | { context?: unknown; count?: unknown }
      | null
    const raw = body?.context
    if (typeof raw !== 'object' || raw === null) {
      return fail(c, 400, 'INVALID_CONTEXT', 'Chip context is required.')
    }
    const source = raw as Record<string, unknown>
    const context: AiVariationContext = {
      name: typeof source.name === 'string' ? source.name : undefined,
      theme: (typeof source.theme === 'string' ? source.theme : 'neon') as AiVariationContext['theme'],
      dieShape: (typeof source.dieShape === 'string'
        ? source.dieShape
        : 'rect') as AiVariationContext['dieShape'],
      blocks: Array.isArray(source.blocks)
        ? source.blocks
            .filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null)
            .map((b) => ({
              type: typeof b.type === 'string' ? b.type : '',
              x: typeof b.x === 'number' ? b.x : 0,
              y: typeof b.y === 'number' ? b.y : 0,
              w: typeof b.w === 'number' ? b.w : 0,
              h: typeof b.h === 'number' ? b.h : 0,
            }))
        : [],
    }
    const requested = typeof body?.count === 'number' ? Math.floor(body.count) : 3
    const count = Math.max(2, Math.min(4, Number.isFinite(requested) ? requested : 3))

    // Log before calling out so failed/abused attempts still count against the shared quota.
    logPrompt(db, { userId: user.id, kind: 'generate-variations', prompt: JSON.stringify({ context, count }) }, now)

    let result
    try {
      result = await aiProvider.generateVariations({ context, count })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    const variations = result.variations.slice(0, count).map((draft) => mapAiDraftToProject(draft))
    return c.json({ variations })
  })
```

> Note: `requireUserWithinQuota`, `fail`, `db`, `now`, `aiProvider`, `logPrompt`, and `mapAiDraftToProject` are all already in scope in `routes.ts` from M0/M2/M3. This handler adds only the `AiVariationContext` import.

- [ ] **Step 4: Run the tests + server typecheck to verify green**

Run: `npm test --workspace server -- aiRoutes`
Expected: PASS (existing + 6 new).

Run: `npm run typecheck --workspace server`
Expected: green (anthropic adapter from Task 3 + the patched failing mocks now satisfy `AiProvider`).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/routes.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): POST /api/ai/generate-variations (auth + shared quota -> N variations)"
```

---

### Task 5: Client `aiVariationsApi`

**Files:**
- Create: `src/features/editor/aiVariationsApi.ts`
- Test: `src/features/editor/aiVariationsApi.test.ts`

**Interfaces:**
- Consumes: `AiVariationContext` (`src/domain/ai/aiVariationContext`), `Project` (`src/domain/project`), `AiApiError`/`AiServerUnreachableError` (`src/features/specs/aiCopyApi`, M1).
- Produces: `type AiVariationsApi = { generateVariations(context: AiVariationContext, count: number): Promise<Project[]> }`; `const liveAiVariationsApi: AiVariationsApi`. Used by Task 6.

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/aiVariationsApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiVariationContext } from '../../domain/ai/aiVariationContext'
import { AiServerUnreachableError, liveAiVariationsApi } from './aiVariationsApi'

const context: AiVariationContext = { name: 'X', theme: 'neon', dieShape: 'rect', blocks: [] }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiVariationsApi.generateVariations', () => {
  it('POSTs the context and count and returns the variations on success', async () => {
    const variations = [{ id: 'a' }, { id: 'b' }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ variations }), { status: 200 }),
    )
    const result = await liveAiVariationsApi.generateVariations(context, 2)
    expect(result).toEqual(variations)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/generate-variations')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ context, count: 2 })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiVariationsApi.generateVariations(context, 3)).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiVariationsApi.generateVariations(context, 3)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiVariationsApi.generateVariations(context, 3)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/features/editor/aiVariationsApi.test.ts`
Expected: FAIL — cannot resolve `./aiVariationsApi`.

- [ ] **Step 3: Write the api client**

Create `src/features/editor/aiVariationsApi.ts`:

```ts
import type { AiVariationContext } from '../../domain/ai/aiVariationContext'
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export type AiVariationsApi = {
  generateVariations: (context: AiVariationContext, count: number) => Promise<Project[]>
}

const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504])

async function toApiError(res: Response): Promise<AiApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } }
    if (typeof body.error?.code === 'string' && typeof body.error.message === 'string') {
      return new AiApiError(body.error.code, body.error.message)
    }
  } catch {
    // non-JSON body falls through to the generic error
  }
  return new AiApiError('UNKNOWN', `Request failed (${res.status}).`)
}

export const liveAiVariationsApi: AiVariationsApi = {
  async generateVariations(context, count) {
    let res: Response
    try {
      res = await fetch('/api/ai/generate-variations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, count }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { variations: Project[] }
    return body.variations
  },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:client -- src/features/editor/aiVariationsApi.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/aiVariationsApi.ts src/features/editor/aiVariationsApi.test.ts
git commit -m "feat(v8): client aiVariationsApi (generate-variations + reused AI error types)"
```

---

### Task 6: `AiVariationsPanel` component

**Files:**
- Create: `src/features/editor/AiVariationsPanel.tsx`
- Test: `src/features/editor/AiVariationsPanel.test.tsx`

**Interfaces:**
- Consumes: `Project` (`src/domain/project`), `deriveAiVariationContext` (Task 1), `AiVariationsApi`/`liveAiVariationsApi` (Task 5), `AiApiError`/`AiServerUnreachableError` (`src/features/specs/aiCopyApi`), `MobileChipPreview` (`src/features/editor/MobileChipPreview`).
- Produces: `function AiVariationsPanel(props: { project: Project; onSaveVariation: (variation: Project) => Promise<unknown>; api?: AiVariationsApi }): JSX.Element`. Used by Task 7.

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/AiVariationsPanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createProject } from '../../domain/projectFactory'
import type { Project } from '../../domain/project'
import { AiApiError, type AiVariationsApi } from './aiVariationsApi' // AiApiError re-exported via aiCopyApi; see note
import { AiVariationsPanel } from './AiVariationsPanel'

// Konva needs a real canvas (absent in jsdom): stub the thumbnail.
vi.mock('./MobileChipPreview', () => ({
  MobileChipPreview: () => <div data-testid="thumb" />,
}))

function variation(name: string): Project {
  return { ...createProject(name, name, 0), theme: 'retro' }
}

const VARIATIONS: Project[] = [variation('Alpha'), variation('Beta'), variation('Gamma')]

function renderPanel(api: AiVariationsApi, onSaveVariation = vi.fn().mockResolvedValue(undefined)) {
  render(
    <AiVariationsPanel
      project={createProject('Source', 'src', 0)}
      onSaveVariation={onSaveVariation}
      api={api}
    />,
  )
  return { onSaveVariation }
}

describe('AiVariationsPanel', () => {
  it('generates with the selected count and renders a card per variation', async () => {
    const api: AiVariationsApi = { generateVariations: vi.fn().mockResolvedValue(VARIATIONS) }
    renderPanel(api)

    fireEvent.change(screen.getByLabelText(/variation count/i), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /generate variations/i }))

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    expect(screen.getAllByTestId('thumb')).toHaveLength(3)
    expect(api.generateVariations).toHaveBeenCalledWith(expect.anything(), 4)
  })

  it('Save calls onSaveVariation with that variation and marks the card saved', async () => {
    const api: AiVariationsApi = { generateVariations: vi.fn().mockResolvedValue(VARIATIONS) }
    const { onSaveVariation } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate variations/i }))
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /save as new project/i })[0])
    expect(onSaveVariation).toHaveBeenCalledWith(VARIATIONS[0])
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument())
  })

  it('shows a friendly message on a quota error and saves nothing', async () => {
    const api: AiVariationsApi = {
      generateVariations: vi.fn().mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many')),
    }
    const { onSaveVariation } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate variations/i }))
    await waitFor(() => expect(screen.getByText(/daily ai limit/i)).toBeInTheDocument())
    expect(onSaveVariation).not.toHaveBeenCalled()
  })
})
```

> Note: `AiApiError` is exported from `src/features/specs/aiCopyApi`. If importing it from `./aiVariationsApi` does not resolve (that module only re-uses it internally), change the test import to `import { AiApiError } from '../specs/aiCopyApi'` and `import type { AiVariationsApi } from './aiVariationsApi'`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/features/editor/AiVariationsPanel.test.tsx`
Expected: FAIL — cannot resolve `./AiVariationsPanel`.

- [ ] **Step 3: Write the panel**

Create `src/features/editor/AiVariationsPanel.tsx`:

```tsx
import { useState } from 'react'
import { deriveAiVariationContext } from '../../domain/ai/deriveAiVariationContext'
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
import { MobileChipPreview } from './MobileChipPreview'
import { liveAiVariationsApi, type AiVariationsApi } from './aiVariationsApi'

type Props = {
  project: Project
  onSaveVariation: (variation: Project) => Promise<unknown>
  api?: AiVariationsApi
}

function messageForError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI variations.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return 'The AI provider is unavailable right now.'
      default:
        return error.message
    }
  }
  return 'Something went wrong generating variations.'
}

export function AiVariationsPanel({ project, onSaveVariation, api = liveAiVariationsApi }: Props) {
  const [count, setCount] = useState(3)
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [variations, setVariations] = useState<Project[]>([])
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('loading')
    setError(null)
    setVariations([])
    setSavedIndices(new Set())
    try {
      const next = await api.generateVariations(deriveAiVariationContext(project), count)
      setVariations(next)
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setStatus('idle')
    }
  }

  async function save(index: number) {
    try {
      await onSaveVariation(variations[index])
      setSavedIndices((current) => new Set(current).add(index))
    } catch (caught) {
      setError(messageForError(caught))
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-cyan-900 bg-[#040a0f] p-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">AI Variations</h2>
      <div className="flex items-center gap-2">
        <label className="text-[11px] uppercase tracking-wider text-cyan-300" htmlFor="ai-variation-count">
          Count
        </label>
        <select
          id="ai-variation-count"
          aria-label="Variation count"
          className="rounded border border-cyan-800 bg-[#06121a] px-1 py-0.5 text-[11px] text-cyan-100"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
        <button
          type="button"
          className="rounded border border-cyan-700 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
          onClick={generate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Generating…' : '✨ Generate variations'}
        </button>
      </div>

      {error !== null && <p className="text-[11px] text-amber-400">{error}</p>}

      {variations.map((variation, index) => (
        <div
          key={index}
          className="flex flex-col gap-1 rounded border border-cyan-800 bg-[#06121a] p-2 text-cyan-100"
        >
          <MobileChipPreview project={variation} />
          <p className="text-sm font-semibold">{variation.name}</p>
          <p className="text-[11px] text-cyan-300">
            {variation.theme} · {variation.blocks.length} blocks
          </p>
          {savedIndices.has(index) ? (
            <span className="text-[11px] uppercase tracking-wider text-emerald-300">Saved ✓</span>
          ) : (
            <button
              type="button"
              className="rounded border border-cyan-500 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-50 hover:border-cyan-300"
              onClick={() => save(index)}
            >
              Save as new project
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:client -- src/features/editor/AiVariationsPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/AiVariationsPanel.tsx src/features/editor/AiVariationsPanel.test.tsx
git commit -m "feat(v8): AiVariationsPanel (count + generate + thumbnail cards + per-card save)"
```

---

### Task 7: Wire the panel into the editor

**Files:**
- Modify: `src/features/editor/EditorInspectorRail.tsx`
- Modify: `src/features/editor/EditorPage.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/features/editor/EditorInspectorRail.test.tsx` (add the new required prop + assert the panel button renders)

**Interfaces:**
- Consumes: `AiVariationsPanel` (Task 6); `projectStore.createFromAiDraft` (existing, M2); `Project` (`src/domain/project`).
- Produces: `EditorInspectorRail` gains an `onSaveVariation: (variation: Project) => Promise<unknown>` prop and mounts `AiVariationsPanel`. `EditorPage` gains the same prop and threads it. `App.EditorRoute` passes `onSaveVariation={store.createFromAiDraft}`.

- [ ] **Step 1: Update the failing rail test**

In `src/features/editor/EditorInspectorRail.test.tsx`, add `onSaveVariation={vi.fn()}` to the existing `<EditorInspectorRail …>` render's prop list, and after the existing assertions add:

```ts
    expect(screen.getByRole('button', { name: /generate variations/i })).toBeInTheDocument()
```

> Note: this test already mocks `../export/ExportPanel` and `../publish/PublishPanel`. Add a mock for the Konva thumbnail so the mounted `AiVariationsPanel` doesn't pull in `MobileChipPreview`'s canvas:
> ```ts
> vi.mock('./MobileChipPreview', () => ({ MobileChipPreview: () => <div /> }))
> ```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/features/editor/EditorInspectorRail.test.tsx`
Expected: FAIL — unknown `onSaveVariation` prop and no "Generate variations" button in the tree.

- [ ] **Step 3: Add the prop and mount the panel in the rail**

In `src/features/editor/EditorInspectorRail.tsx`:

Add the imports alongside the other panel imports:

```ts
import { AiVariationsPanel } from './AiVariationsPanel'
import type { Project } from '../../domain/project'
```

> Note: if `Project` is already imported in this file, reuse the existing import rather than adding a duplicate.

Add the prop to the `Props` type (next to `onSetSpec`):

```ts
  onSaveVariation: (variation: Project) => Promise<unknown>
```

Destructure it in the component parameters (next to `onSetSpec`):

```ts
  onSaveVariation,
```

Mount the panel directly above the existing `AiSpecPanel` line (`<AiSpecPanel project={project} onApply={onSetSpec} />`):

```tsx
        <AiVariationsPanel project={project} onSaveVariation={onSaveVariation} />
        <AiSpecPanel project={project} onApply={onSetSpec} />
```

> Note: if the M3 `AiLayoutSuggestionsPanel` is mounted here too, place `AiVariationsPanel` adjacent to the other AI panels — order among them is cosmetic.

- [ ] **Step 4: Thread the prop through EditorPage**

In `src/features/editor/EditorPage.tsx`:

Add to the `Props` type (after `persist`):

```ts
  onSaveVariation: (variation: Project) => Promise<unknown>
```

Add it to the component parameter destructure:

```ts
export function EditorPage({ project, persist, onSaveVariation }: Props) {
```

Pass it to the `<EditorInspectorRail …>` element (next to `onSetSpec={state.setSpec}`):

```tsx
        onSetSpec={state.setSpec}
        onSaveVariation={onSaveVariation}
```

> Note: `Project` is already imported in `EditorPage.tsx` (`import type { Project } from '../../domain/project'`).

- [ ] **Step 5: Provide the callback from App.EditorRoute**

In `src/app/App.tsx`, the `EditorRoute` already has `const store = useProjectStore()`. Update the `<EditorPage …>` render to pass the save callback:

```tsx
    <EditorPage
      key={project.id}
      project={project}
      persist={(nextProject) => void store.save(nextProject)}
      onSaveVariation={store.createFromAiDraft}
    />
```

- [ ] **Step 6: Run the rail test + full client suite**

Run: `npm run test:client -- src/features/editor/EditorInspectorRail.test.tsx`
Expected: PASS.

Run: `npm run test:client`
Expected: all client tests green (no regression).

- [ ] **Step 7: Commit**

```bash
git add src/features/editor/EditorInspectorRail.tsx src/features/editor/EditorInspectorRail.test.tsx src/features/editor/EditorPage.tsx src/app/App.tsx
git commit -m "feat(v8): mount AiVariationsPanel in the editor rail wired to createFromAiDraft"
```

---

### Task 8: Gates, browser QA, docs, milestone status

**Files:**
- Modify: `implementation.md` (append a dated V8-M4 entry, Korean)
- Modify: `CLAUDE.md` (Working Context v8 bullet + the `### v8 AI-Assisted Creation` Milestone Status block)

**Interfaces:** none (verification + documentation).

- [ ] **Step 1: Run all gates**

```bash
npm test
npm run build
npm run typecheck --workspace server
npm run lint
```
Expected: all green. Record the client/server file+test counts from `npm test` (the known >500 kB chunk warning on build is acceptable).

- [ ] **Step 2: Confirm no API key leaks client-side**

Run: `npm run build && grep -rl "ANTHROPIC_API_KEY" dist/assets || echo "no api key in client bundle"`
Expected: prints `no api key in client bundle`.

- [ ] **Step 3: Browser QA (owner-manual — do NOT automate)**

Document the interactive flow as **owner-manual / pending**: open a chip in the editor, pick a count (2–4), click Generate variations, confirm N thumbnail cards render; Save one and confirm it appears on the dashboard as a new project while the source chip is unchanged; stop the API server and confirm the inline "AI server is unreachable" message with manual editing unaffected. Do not run a browser session or claim it was performed; the automated gates + fake-provider tests are the evidence at this checkpoint.

- [ ] **Step 4: Record the V8-M4 outcome in `implementation.md`**

Append a `## V8-M4 AI Remix / Variations (2026-06-20)` section (Korean, matching the file's style): `deriveAiVariationContext` (M3 layout context + name/theme); `AiProvider.generateVariations` (deterministic fake re-themes while keeping layout + anthropic `json_schema`); `POST /api/ai/generate-variations` reusing M0 auth + the shared 24h quota + `requireUserWithinQuota` (`kind='generate-variations'`, one quota unit per call, count clamped to `[2,4]`, **no new migration**); client `aiVariationsApi`; the additive `AiVariationsPanel` (count 2–4, per-card Save via the existing `projectStore.createFromAiDraft`, **mini Konva thumbnails reuse `MobileChipPreview`**); each variation an independent local clone, source chip read-only; local-first/degradation; key server-only; final gate counts; browser QA owner-manual/pending. Note the planning deviation (reused `MobileChipPreview` instead of a new thumbnail component).

- [ ] **Step 5: Update `CLAUDE.md`**

In the `### v8 AI-Assisted Creation` Milestone Status block, add a **V8-M4** line summarizing the above and pointing to the spec (`docs/superpowers/specs/2026-06-20-v8-m4-ai-variations-design.md`) and this plan. Update the Working Context v8 bullet to note M4 is done (AI variations: editor panel generates 2–4 re-styled thumbnail variations of the current chip; per-card Save creates an independent local clone via the existing `createFromAiDraft`; source chip unchanged; reuses M0 quota/log with `kind='generate-variations'`, no schema/migration change; local-first unchanged; browser QA pending owner-manual).

- [ ] **Step 6: Commit**

```bash
git add -f implementation.md CLAUDE.md
git commit -m "docs(v8): record v8-M4 AI remix / variations"
```

---

## Self-Review

**1. Spec coverage:**
- `AiVariationContext` + `deriveAiVariationContext` (M3 layout + name/theme) → Task 1. ✅
- `AiProvider.generateVariations` fake + anthropic (`json_schema`, opus-4-8, refusal→throw) → Tasks 2, 3. ✅
- `POST /api/ai/generate-variations` reusing M0 auth + shared quota + `requireUserWithinQuota`, `kind='generate-variations'`, one quota unit/call, count clamp `[2,4]`, map each draft via `mapAiDraftToProject`, no migration → Task 4. ✅
- Per-variation valid-project guarantee (`mapAiDraftToProject` server + `createFromAiDraft`/`migrateProject` client) → Tasks 4, 7. ✅
- Editor inspector-rail panel, count 2–4 (default 3), N thumbnail cards, per-card Save (no navigation), source read-only → Tasks 6, 7. ✅
- Mini Konva thumbnails → reuse `MobileChipPreview` (Task 6); deviation from the spec's named `ChipVariationThumbnail` documented in Global Constraints + Task 8 docs. ✅
- Client `aiVariationsApi` (reused AI error types) → Task 5. ✅
- Key server-only, gates green, browser QA owner-manual, docs → Task 8. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" — every code step shows full code. The runtime-dependent spot (anthropic structured-output binding) carries a "re-consult `claude-api`" note plus a mock-based test. Doc/test counts in Task 8 are runtime-filled by design.

**3. Type consistency:** `AiVariationContext` (Task 1) flows through `AiVariationsInput`/`generateVariations(input): Promise<{ variations: AiChipDraft[] }>` (Tasks 2–4), `aiVariationsApi.generateVariations(context, count): Promise<Project[]>` (Task 5), and the panel's `api`/`deriveAiVariationContext` (Task 6). The route returns `{ variations: Project[] }`; the client reads `{ variations }`; the panel renders `Project[]`. `onSaveVariation: (variation: Project) => Promise<unknown>` is identical across the panel (Task 6), `EditorInspectorRail` and `EditorPage` (Task 7), and is satisfied by `store.createFromAiDraft: (snapshot: unknown) => Promise<Project>` (assignable — param `unknown` ⊇ `Project`, return `Promise<Project>` ⊆ `Promise<unknown>`). `AiApiError`/`AiServerUnreachableError` come from `src/features/specs/aiCopyApi` (M1) in Tasks 5 and 6 — same classes, so the panel's `instanceof` mapping matches what `aiVariationsApi` throws. The fake (Task 2) and anthropic adapter (Task 3) both return `{ variations: AiChipDraft[] }`, which the route maps per item via `mapAiDraftToProject`.

## Notes

- M4 is independent of nothing new on the server side beyond a route: it builds on **M0** (provider interface, quota, `ai_prompt_log`, `mapAiDraftToProject`, config), **M2** (`createFromAiDraft` / `materializeAiDraftProject` local-save), and **M3** (`deriveAiLayoutContext`, the `requireUserWithinQuota`/`fail` route helpers). All are implemented on this branch.
- **No new editor store method.** Saving a variation reuses the project store's existing `createFromAiDraft`; the source chip is only read to derive context, so "source unchanged" holds by construction.
- **Thumbnail reuse (deviation from spec):** the spec named a new `ChipVariationThumbnail` + a pure fit-scale helper; the existing `src/features/editor/MobileChipPreview.tsx` already provides a read-only, fit-to-width Konva preview over the shared `ChipArtwork`, so M4 reuses it. This drops one component and its fit-scale test from the original spec testing plan; the panel test mocks `MobileChipPreview` (Konva needs a canvas absent in jsdom).
- Adding `generateVariations` as a required `AiProvider` method (Task 2) makes `anthropicProvider.ts` and the inline `failing` provider mocks in `aiRoutes.test.ts` not typecheck until Tasks 3 and 4 — a planned transient (mirrors the M1/M3 interface/adapter split). Per-task `npm test` (vitest/esbuild) stays green; `npm run typecheck --workspace server` is green again after Task 4.
- One `generate-variations` call = one `ai_prompt_log` row = one quota unit, regardless of N. Quota tuning is deferred to M5.
