# v8-M1 AI Naming + Fake-Spec Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Before Task 4 (the real `@anthropic-ai/sdk` adapter method), re-invoke the `claude-api` skill** to confirm the current TypeScript binding for structured outputs — do not guess SDK syntax.

**Goal:** Add the first user-facing AI feature — a zero-input "Generate from this chip" control in the editor that produces a surreal product name + tagline + fake spec sheet, previewed then applied into the existing `FakeSpec` via `setSpec`.

**Architecture:** Mirror the M0 valid-output pattern: a pure `src/domain/ai/` factory maps a loose `AiSpecDraft` to a domain-valid `FakeSpec` (coerce/clamp/default), and a pure `deriveAiChipContext` turns the live `Project` into a minimal `AiChipContext`. The existing `AiProvider` gains a `generateSpecCopy` method (fake + anthropic); a new `POST /api/ai/generate-copy` route reuses M0's auth + shared 24h quota + `ai_prompt_log`. The client adds `aiCopyApi` + an additive `AiSpecPanel` mounted above `FakeSpecForm`.

**Tech Stack:** TypeScript, React + Vitest + React Testing Library (client), Hono + better-sqlite3 + `@anthropic-ai/sdk` (server workspace). Shared domain reused server-side via the `@domain/*` alias.

## Global Constraints

- Node.js `20.19+` or `22.12+`; package manager **npm**.
- **Domain invariants live in the factory mapping, not the AI schema.** Structured outputs enforce shape only (no numeric `min/max`, no string length, no array length; every object `additionalProperties: false`). String trimming/length caps, `cores` integer/range, `features` count/length, and all defaults are enforced by `mapAiSpecDraftToFakeSpec`.
- `src/domain/ai/` stays **pure**: no React/Konva/Zustand/IndexedDB/AI/network imports.
- `ANTHROPIC_API_KEY` is **server-only** — never serialized into any client response or bundle.
- **No new migration, no `Project`/`FakeSpec` schema change** (`CURRENT_SCHEMA_VERSION` stays `5`); `ai_prompt_log` (M0's `013_ai`) is reused with `kind='generate-copy'`; no Konva 2D PNG export change.
- The quota is **shared with M0** — `countRecentGenerations` counts all `ai_prompt_log` rows in the trailing 24h regardless of kind. Default model `claude-opus-4-8`; default quota `20`.
- The `AiSpecPanel` is **purely additive**: every failure path (offline, 401, 429, 503) renders an inline message and never disables `FakeSpecForm`. No client AI keys, no BYOK, no payments (out of scope).
- Vitest with explicit `import { describe, expect, it } from 'vitest'`. **No real Anthropic network calls in tests** (fake provider, or SDK mocked).
- Each task ends green on `npm test` and is committed. Final gate: `npm test` / `npm run build` / `npm run typecheck --workspace server` / `npm run lint` green.

---

### Task 1: Pure `AiSpecDraft` + `AiChipContext` types + `deriveAiChipContext`

**Files:**
- Create: `src/domain/ai/aiSpecDraft.ts`
- Create: `src/domain/ai/deriveAiChipContext.ts`
- Test: `src/domain/ai/deriveAiChipContext.test.ts`

**Interfaces:**
- Consumes: `DieShape`/`StyleTheme`/`Project` (`src/domain/project.ts`).
- Produces: `type AiSpecDraft = { brand?: string; series?: string; generation?: string; process?: string; cores?: number; bandwidth?: string; features?: string[]; description?: string }`; `type AiChipContext = { name?: string; theme: StyleTheme; dieShape: DieShape; blockTypes: string[] }`; `deriveAiChipContext(project: Project): AiChipContext`. Used by Tasks 3, 4, 5, 6, 7.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/deriveAiChipContext.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from '../projectFactory'
import { buildBlock } from '../blockFactory'
import { deriveAiChipContext } from './deriveAiChipContext'

describe('deriveAiChipContext', () => {
  it('derives name, theme, die shape, and a deduped block-type list', () => {
    const project = createProject('NEON DREAM', 'p1', 0)
    project.theme = 'mono'
    project.die = { ...project.die, shape: 'hexagon' }
    project.blocks = [
      { ...buildBlock(project, 'CPU'), zIndex: 0 },
      { ...buildBlock(project, 'CPU'), zIndex: 1 },
      { ...buildBlock(project, 'Cache'), zIndex: 2 },
    ]
    const ctx = deriveAiChipContext(project)
    expect(ctx.name).toBe('NEON DREAM')
    expect(ctx.theme).toBe('mono')
    expect(ctx.dieShape).toBe('hexagon')
    expect(ctx.blockTypes).toEqual(['CPU', 'Cache'])
  })

  it('returns an empty block-type list for a blank project', () => {
    const ctx = deriveAiChipContext(createProject('Blank', 'p2', 0))
    expect(ctx.blockTypes).toEqual([])
    expect(ctx.theme).toBe('neon')
    expect(ctx.dieShape).toBe('rect')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/deriveAiChipContext.test.ts`
Expected: FAIL — cannot resolve `./deriveAiChipContext`.

- [ ] **Step 3: Write the types module**

Create `src/domain/ai/aiSpecDraft.ts`:

```ts
import type { DieShape, StyleTheme } from '../project'

/** A loose, AI-produced spec. All fields optional — the mapper coerces and fills defaults. */
export type AiSpecDraft = {
  brand?: string
  series?: string
  generation?: string
  process?: string
  cores?: number
  bandwidth?: string
  features?: string[]
  description?: string
}

/** Minimal chip context sent to the AI as flavor for copy generation. */
export type AiChipContext = {
  name?: string
  theme: StyleTheme
  dieShape: DieShape
  blockTypes: string[]
}
```

- [ ] **Step 4: Write the derivation**

Create `src/domain/ai/deriveAiChipContext.ts`:

```ts
import type { Project } from '../project'
import type { AiChipContext } from './aiSpecDraft'

/** Pure: turns the live project into the minimal context the AI uses as copy flavor. */
export function deriveAiChipContext(project: Project): AiChipContext {
  const blockTypes: string[] = []
  for (const block of project.blocks) {
    if (!blockTypes.includes(block.type)) blockTypes.push(block.type)
  }
  return {
    name: project.name,
    theme: project.theme,
    dieShape: project.die.shape,
    blockTypes,
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/deriveAiChipContext.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/ai/aiSpecDraft.ts src/domain/ai/deriveAiChipContext.ts src/domain/ai/deriveAiChipContext.test.ts
git commit -m "feat(v8): AiSpecDraft/AiChipContext types + pure deriveAiChipContext"
```

---

### Task 2: Pure `mapAiSpecDraftToFakeSpec` (the valid-spec guarantee)

**Files:**
- Create: `src/domain/ai/mapAiSpecDraftToFakeSpec.ts`
- Test: `src/domain/ai/mapAiSpecDraftToFakeSpec.test.ts`

**Interfaces:**
- Consumes: `FakeSpec` (`src/domain/project.ts`), `AiSpecDraft` (Task 1).
- Produces: `mapAiSpecDraftToFakeSpec(draft: AiSpecDraft): FakeSpec`. Used by Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/mapAiSpecDraftToFakeSpec.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mapAiSpecDraftToFakeSpec } from './mapAiSpecDraftToFakeSpec'
import type { AiSpecDraft } from './aiSpecDraft'

describe('mapAiSpecDraftToFakeSpec', () => {
  it('passes a well-formed draft through, trimming strings', () => {
    const draft: AiSpecDraft = {
      brand: '  AURORA  ',
      series: 'C-1',
      generation: '3rd-gen',
      process: '0.5nm soul-etched',
      cores: 88,
      bandwidth: 'infinity TB/s',
      features: ['Dream Engine', 'Lucid Cache'],
      description: 'Parallel consciousness processing.',
    }
    const spec = mapAiSpecDraftToFakeSpec(draft)
    expect(spec.brand).toBe('AURORA')
    expect(spec.series).toBe('C-1')
    expect(spec.cores).toBe(88)
    expect(spec.features).toEqual(['Dream Engine', 'Lucid Cache'])
  })

  it('fills defaults for a fully empty draft', () => {
    const spec = mapAiSpecDraftToFakeSpec({})
    expect(typeof spec.brand).toBe('string')
    expect(spec.brand.length).toBeGreaterThan(0)
    expect(spec.cores).toBe(8)
    expect(spec.features).toEqual([])
    expect(typeof spec.description).toBe('string')
  })

  it('coerces a non-integer / negative core count to a clamped integer', () => {
    expect(mapAiSpecDraftToFakeSpec({ cores: -5 }).cores).toBe(0)
    expect(mapAiSpecDraftToFakeSpec({ cores: 12.9 }).cores).toBe(12)
    expect(mapAiSpecDraftToFakeSpec({ cores: 1e9 }).cores).toBe(4096)
    expect(mapAiSpecDraftToFakeSpec({ cores: Number.NaN }).cores).toBe(8)
  })

  it('bounds the features array (count + per-item length) and drops empties', () => {
    const draft: AiSpecDraft = {
      features: ['  one  ', '', '   ', 'two', 'three', 'four', 'five', 'six', 'seven'],
    }
    const spec = mapAiSpecDraftToFakeSpec(draft)
    expect(spec.features).toHaveLength(6)
    expect(spec.features[0]).toBe('one')
    expect(spec.features.every((f) => f.length <= 80)).toBe(true)
  })

  it('caps over-long strings', () => {
    const long = 'x'.repeat(500)
    const spec = mapAiSpecDraftToFakeSpec({ brand: long, description: long })
    expect(spec.brand.length).toBeLessThanOrEqual(80)
    expect(spec.description.length).toBeLessThanOrEqual(280)
  })

  it('survives wrong-typed fields by falling back to defaults', () => {
    const spec = mapAiSpecDraftToFakeSpec({
      brand: 123 as unknown as string,
      features: 'not an array' as unknown as string[],
    })
    expect(typeof spec.brand).toBe('string')
    expect(spec.features).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/mapAiSpecDraftToFakeSpec.test.ts`
Expected: FAIL — cannot resolve `./mapAiSpecDraftToFakeSpec`.

- [ ] **Step 3: Write the mapper**

Create `src/domain/ai/mapAiSpecDraftToFakeSpec.ts`:

```ts
import type { FakeSpec } from '../project'
import type { AiSpecDraft } from './aiSpecDraft'

const MAX_TEXT = 80
const MAX_DESCRIPTION = 280
const MAX_FEATURES = 6
const MAX_FEATURE_LEN = 80
const MAX_CORES = 4096

const DEFAULTS: FakeSpec = {
  brand: 'AI FOUNDRY',
  series: 'GEN-1',
  generation: 'AI-I',
  process: '0.5nm dream-etched',
  cores: 8,
  bandwidth: '4.2 TB/s',
  features: [],
  description: 'An AI-dreamed processor.',
}

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (trimmed === '') return fallback
  return trimmed.slice(0, max)
}

function cores(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULTS.cores
  return Math.max(0, Math.min(MAX_CORES, Math.floor(value)))
}

function features(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, MAX_FEATURE_LEN))
    .filter((item) => item !== '')
    .slice(0, MAX_FEATURES)
}

/**
 * Maps any AiSpecDraft to a domain-valid FakeSpec. Strings are trimmed and length-capped,
 * cores becomes a clamped non-negative integer, features is a bounded array of non-empty
 * trimmed strings, and missing/wrong-typed fields fall back to defaults — so adversarial AI
 * copy can never produce an invalid FakeSpec. The M1 valid-output guarantee.
 */
export function mapAiSpecDraftToFakeSpec(draft: AiSpecDraft): FakeSpec {
  return {
    brand: text(draft.brand, DEFAULTS.brand, MAX_TEXT),
    series: text(draft.series, DEFAULTS.series, MAX_TEXT),
    generation: text(draft.generation, DEFAULTS.generation, MAX_TEXT),
    process: text(draft.process, DEFAULTS.process, MAX_TEXT),
    cores: cores(draft.cores),
    bandwidth: text(draft.bandwidth, DEFAULTS.bandwidth, MAX_TEXT),
    features: features(draft.features),
    description: text(draft.description, DEFAULTS.description, MAX_DESCRIPTION),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/mapAiSpecDraftToFakeSpec.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/ai/mapAiSpecDraftToFakeSpec.ts src/domain/ai/mapAiSpecDraftToFakeSpec.test.ts
git commit -m "feat(v8): pure AiSpecDraft -> FakeSpec mapping (valid-spec guarantee)"
```

---

### Task 3: Extend `AiProvider` with `generateSpecCopy` + fake implementation

**Files:**
- Modify: `server/src/ai/provider.ts`
- Modify: `server/src/ai/fakeProvider.ts`
- Test: `server/test/aiFakeProvider.test.ts` (append a case)

**Interfaces:**
- Consumes: `AiSpecDraft`/`AiChipContext` (`@domain/ai/aiSpecDraft`, Task 1).
- Produces: `type AiSpecCopyInput = { context: AiChipContext }`; `AiProvider.generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>`; the fake provider's deterministic implementation. Used by Tasks 4, 5.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiFakeProvider.test.ts` (inside the existing file, after the existing `describe`):

```ts
import type { AiChipContext } from '@domain/ai/aiSpecDraft'

describe('createFakeProvider.generateSpecCopy', () => {
  const context: AiChipContext = {
    name: 'NEON DREAM',
    theme: 'neon',
    dieShape: 'hexagon',
    blockTypes: ['CPU', 'Cache', 'DreamSynth'],
  }

  it('returns a deterministic spec draft derived from the chip context', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateSpecCopy({ context })
    const b = await provider.generateSpecCopy({ context })
    expect(a).toEqual(b)
    expect(typeof a.brand).toBe('string')
    expect(a.brand).toContain('NEON')
    expect(Array.isArray(a.features)).toBe(true)
  })
})
```

> Note: keep the existing `import { createFakeProvider } from '../src/ai/fakeProvider'` at the top; add only the `AiChipContext` import and the new `describe`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: FAIL — `generateSpecCopy` is not a function / not on the type.

- [ ] **Step 3: Extend the provider interface**

Replace the contents of `server/src/ai/provider.ts`:

```ts
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiChipContext, AiSpecDraft } from '@domain/ai/aiSpecDraft'

export type AiGenerateInput = { prompt: string }
export type AiSpecCopyInput = { context: AiChipContext }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
  generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>
}
```

- [ ] **Step 4: Implement the fake `generateSpecCopy`**

In `server/src/ai/fakeProvider.ts`, add the second method to the returned object (after `generateChipDraft`):

```ts
    async generateSpecCopy(input) {
      const { context } = input
      const themeWord = context.theme.toUpperCase()
      const nameWord = (context.name ?? '').trim().toUpperCase()
      return {
        brand: nameWord !== '' ? `${nameWord} ${themeWord}` : themeWord,
        series: context.dieShape.toUpperCase(),
        generation: 'AI-I',
        process: '0.5nm dream-etched',
        cores: Math.max(1, context.blockTypes.length) * 8,
        bandwidth: '4.2 TB/s',
        features: context.blockTypes.slice(0, 3).map((type) => `${type} accelerator`),
        description: `An AI-dreamed ${context.theme} chip with ${context.blockTypes.length} block types.`,
      }
    },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: PASS (existing + 1 new test).

- [ ] **Step 6: Commit**

```bash
git add server/src/ai/provider.ts server/src/ai/fakeProvider.ts server/test/aiFakeProvider.test.ts
git commit -m "feat(v8): AiProvider.generateSpecCopy interface + deterministic fake"
```

---

### Task 4: Anthropic adapter `generateSpecCopy`

> **First, re-invoke the `claude-api` skill** and confirm the current `@anthropic-ai/sdk` TypeScript call for structured outputs (`output_config.format` json_schema on `messages.create`). The test mocks the SDK, so no network call is made — but write the adapter body against the verified binding, matching the existing `generateChipDraft` style in the same file.

**Files:**
- Modify: `server/src/ai/anthropicProvider.ts`
- Test: `server/test/aiAnthropicProvider.test.ts` (append cases)

**Interfaces:**
- Consumes: `AiSpecDraft`/`AiChipContext` (`@domain/ai/aiSpecDraft`), the existing `Anthropic` client created in `createAnthropicProvider`.
- Produces: `AiProvider.generateSpecCopy` on the anthropic provider.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiAnthropicProvider.test.ts` (after the existing `describe`):

```ts
describe('createAnthropicProvider.generateSpecCopy', () => {
  it('requests opus-4-8 with a json_schema format and parses the spec draft', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            brand: 'NOCTURNE',
            series: 'X-2',
            generation: 'AI-II',
            process: '0.3nm',
            cores: 64,
            bandwidth: '9 TB/s',
            features: ['Lucid Cache'],
            description: 'Dreams in parallel.',
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const draft = await provider.generateSpecCopy({
      context: { name: 'X', theme: 'neon', dieShape: 'rect', blockTypes: ['CPU'] },
    })

    expect(draft.brand).toBe('NOCTURNE')
    expect(draft.cores).toBe(64)
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(
      provider.generateSpecCopy({
        context: { theme: 'neon', dieShape: 'rect', blockTypes: [] },
      }),
    ).rejects.toThrow()
  })
})
```

> Note: the file already declares `const create = vi.fn()` and `vi.mock('@anthropic-ai/sdk', …)` at the top and imports `createAnthropicProvider`. Reuse them — add only the new `describe`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: FAIL — `generateSpecCopy` is not a function.

- [ ] **Step 3: Add the spec schema and the method**

In `server/src/ai/anthropicProvider.ts`:

1. Update the imports at the top to add the spec-draft type:

```ts
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiSpecDraft } from '@domain/ai/aiSpecDraft'
import type { AiProvider } from './provider'
```

2. Add a `SPEC_SCHEMA` constant after the existing `DRAFT_SCHEMA` block:

```ts
const SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    brand: { type: 'string' },
    series: { type: 'string' },
    generation: { type: 'string' },
    process: { type: 'string' },
    cores: { type: 'integer' },
    bandwidth: { type: 'string' },
    features: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
  },
  required: [
    'brand', 'series', 'generation', 'process', 'cores', 'bandwidth', 'features', 'description',
  ],
} as const
```

3. Add `generateSpecCopy` to the returned object (after `generateChipDraft`), mirroring its style:

```ts
    async generateSpecCopy(input) {
      const { context } = input
      const summary =
        `theme=${context.theme}, dieShape=${context.dieShape}, ` +
        `blocks=[${context.blockTypes.join(', ')}]` +
        (context.name !== undefined ? `, currentName=${context.name}` : '')
      const response = await client.messages.create({
        model: opts.model,
        max_tokens: 2048,
        output_config: { format: { type: 'json_schema', schema: SPEC_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              'Return ONLY a JSON fake spec sheet (surreal sci-fi product name via brand+series, ' +
              'a tagline via description, plus generation/process/cores/bandwidth/features) for a ' +
              `fictional chip with this context: ${summary}`,
          },
        ],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming)

      if ((response.stop_reason as string) === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as AiSpecDraft
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: PASS (existing + 2 new tests). Then `npm run typecheck --workspace server`.

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/anthropicProvider.ts server/test/aiAnthropicProvider.test.ts
git commit -m "feat(v8): Anthropic generateSpecCopy with json_schema structured output"
```

---

### Task 5: `POST /api/ai/generate-copy` route

**Files:**
- Modify: `server/src/ai/routes.ts`
- Test: `server/test/aiRoutes.test.ts` (append a `describe`)

**Interfaces:**
- Consumes: `mapAiSpecDraftToFakeSpec` (`@domain/ai/mapAiSpecDraftToFakeSpec`, Task 2), `AiChipContext` (`@domain/ai/aiSpecDraft`), `getSessionUser`, `countRecentGenerations`/`logPrompt`, `AppDeps.aiProvider`/`aiDailyQuota`.
- Produces: a `POST /ai/generate-copy` handler mounted by the existing `aiRoutes(deps)` returning `{ spec: FakeSpec }`.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiRoutes.test.ts` (after the existing `describe('POST /api/ai/generate-draft', …)`):

```ts
const COPY_BODY = {
  context: { name: 'NEON', theme: 'neon', dieShape: 'rect', blockTypes: ['CPU', 'Cache'] },
}

describe('POST /api/ai/generate-copy', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY))
    expect(res.status).toBe(401)
  })

  it('returns a valid FakeSpec and logs a generate-copy prompt for an authed user', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { spec: { brand: string; features: unknown[]; cores: number } }
    expect(typeof body.spec.brand).toBe('string')
    expect(Array.isArray(body.spec.features)).toBe(true)
    expect(Number.isInteger(body.spec.cores)).toBe(true)
    const row = db.prepare('SELECT kind FROM ai_prompt_log').get() as { kind: string }
    expect(row.kind).toBe('generate-copy')
  })

  it('rejects a missing context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', {}, cookie))
    expect(res.status).toBe(400)
  })

  it('enforces the shared daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
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
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/generate-copy', jsonRequest('POST', COPY_BODY, cookie))
    expect(res.status).toBe(503)
  })
})
```

> Note: `signIn`, `createTestApp`, `jsonRequest` are already defined/imported at the top of this file from Task 6 of the M0 plan. Reuse them.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiRoutes`
Expected: FAIL — `/ai/generate-copy` not mounted (404).

- [ ] **Step 3: Add the route handler**

In `server/src/ai/routes.ts`:

1. Add imports near the existing ones:

```ts
import { mapAiSpecDraftToFakeSpec } from '@domain/ai/mapAiSpecDraftToFakeSpec'
import type { AiChipContext } from '@domain/ai/aiSpecDraft'
```

2. Add the new handler **before** `return routes` (after the existing `generate-draft` handler):

```ts
  routes.post('/ai/generate-copy', async (c) => {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') {
      return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    }
    const user = getSessionUser(db, token, now)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    if (countRecentGenerations(db, user.id, now) >= aiDailyQuota) {
      return fail(c, 429, 'QUOTA_EXCEEDED', 'Daily AI generation limit reached.')
    }

    const body = (await c.req.json().catch(() => null)) as { context?: unknown } | null
    const raw = body?.context
    if (typeof raw !== 'object' || raw === null) {
      return fail(c, 400, 'INVALID_CONTEXT', 'Chip context is required.')
    }
    const source = raw as Record<string, unknown>
    const context: AiChipContext = {
      name: typeof source.name === 'string' ? source.name : undefined,
      theme: (typeof source.theme === 'string' ? source.theme : 'neon') as AiChipContext['theme'],
      dieShape: (typeof source.dieShape === 'string'
        ? source.dieShape
        : 'rect') as AiChipContext['dieShape'],
      blockTypes: Array.isArray(source.blockTypes)
        ? source.blockTypes.filter((t): t is string => typeof t === 'string')
        : [],
    }

    // Log before calling out so failed/abused attempts still count against the shared quota.
    logPrompt(db, { userId: user.id, kind: 'generate-copy', prompt: JSON.stringify(context) }, now)

    let draft
    try {
      draft = await aiProvider.generateSpecCopy({ context })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    return c.json({ spec: mapAiSpecDraftToFakeSpec(draft) })
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiRoutes`
Expected: PASS (existing generate-draft + 5 new generate-copy tests). Then `npm test --workspace server` to confirm no regression.

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/routes.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): POST /api/ai/generate-copy (auth + shared quota -> FakeSpec)"
```

---

### Task 6: Client `aiCopyApi`

**Files:**
- Create: `src/features/specs/aiCopyApi.ts`
- Test: `src/features/specs/aiCopyApi.test.ts`

**Interfaces:**
- Consumes: `FakeSpec` (`src/domain/project.ts`), `AiChipContext` (`src/domain/ai/aiSpecDraft`).
- Produces: `class AiApiError extends Error { code: string }`; `class AiServerUnreachableError extends Error`; `type AiCopyApi = { generateCopy(context: AiChipContext): Promise<FakeSpec> }`; `const liveAiCopyApi: AiCopyApi`. Used by Task 7.

- [ ] **Step 1: Write the failing test**

Create `src/features/specs/aiCopyApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiChipContext } from '../../domain/ai/aiSpecDraft'
import { AiApiError, AiServerUnreachableError, liveAiCopyApi } from './aiCopyApi'

const context: AiChipContext = { theme: 'neon', dieShape: 'rect', blockTypes: ['CPU'] }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiCopyApi.generateCopy', () => {
  it('POSTs the context and returns the spec on success', async () => {
    const spec = { brand: 'X', series: 'Y', generation: 'g', process: 'p', cores: 4, bandwidth: 'b', features: [], description: 'd' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ spec }), { status: 200 }),
    )
    const result = await liveAiCopyApi.generateCopy(context)
    expect(result).toEqual(spec)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/generate-copy')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ context })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiCopyApi.generateCopy(context)).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiCopyApi.generateCopy(context)).rejects.toBeInstanceOf(AiServerUnreachableError)
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiCopyApi.generateCopy(context)).rejects.toBeInstanceOf(AiServerUnreachableError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/specs/aiCopyApi.test.ts`
Expected: FAIL — cannot resolve `./aiCopyApi`.

- [ ] **Step 3: Write the api client**

Create `src/features/specs/aiCopyApi.ts`:

```ts
import type { AiChipContext } from '../../domain/ai/aiSpecDraft'
import type { FakeSpec } from '../../domain/project'

export class AiApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'AiApiError'
  }
}

export class AiServerUnreachableError extends Error {
  constructor() {
    super('AI server is unreachable.')
    this.name = 'AiServerUnreachableError'
  }
}

export type AiCopyApi = {
  generateCopy: (context: AiChipContext) => Promise<FakeSpec>
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

export const liveAiCopyApi: AiCopyApi = {
  async generateCopy(context) {
    let res: Response
    try {
      res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { spec: FakeSpec }
    return body.spec
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/specs/aiCopyApi.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/specs/aiCopyApi.ts src/features/specs/aiCopyApi.test.ts
git commit -m "feat(v8): client aiCopyApi (generate-copy + error mapping)"
```

---

### Task 7: `AiSpecPanel` + editor wiring

**Files:**
- Create: `src/features/specs/AiSpecPanel.tsx`
- Test: `src/features/specs/AiSpecPanel.test.tsx`
- Modify: `src/features/editor/EditorInspectorRail.tsx`

**Interfaces:**
- Consumes: `Project`/`FakeSpec` (`src/domain/project.ts`), `deriveAiChipContext` (Task 1), `AiCopyApi`/`AiApiError`/`AiServerUnreachableError`/`liveAiCopyApi` (Task 6).
- Produces: `function AiSpecPanel(props: { project: Project; onApply: (spec: FakeSpec) => void; api?: AiCopyApi }): JSX.Element`. Mounted in `EditorInspectorRail` above `FakeSpecForm`.

- [ ] **Step 1: Write the failing test**

Create `src/features/specs/AiSpecPanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createProject } from '../../domain/projectFactory'
import type { FakeSpec } from '../../domain/project'
import { AiApiError, type AiCopyApi } from './aiCopyApi'
import { AiSpecPanel } from './AiSpecPanel'

const SPEC: FakeSpec = {
  brand: 'NOVA',
  series: 'Z-1',
  generation: 'AI-I',
  process: '0.3nm',
  cores: 16,
  bandwidth: '9 TB/s',
  features: ['Lucid Cache'],
  description: 'Dreams in parallel.',
}

function renderPanel(api: AiCopyApi, onApply = vi.fn()) {
  render(<AiSpecPanel project={createProject('Chip', 'p1', 0)} onApply={onApply} api={api} />)
  return { onApply }
}

describe('AiSpecPanel', () => {
  it('generates, previews, and applies the spec', async () => {
    const api: AiCopyApi = { generateCopy: vi.fn().mockResolvedValue(SPEC) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate from this chip/i }))
    await waitFor(() => expect(screen.getByText('NOVA')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(onApply).toHaveBeenCalledWith(SPEC)
    // After applying, the preview is dismissed.
    expect(screen.queryByText('NOVA')).not.toBeInTheDocument()
  })

  it('discards the preview without applying', async () => {
    const api: AiCopyApi = { generateCopy: vi.fn().mockResolvedValue(SPEC) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate from this chip/i }))
    await waitFor(() => expect(screen.getByText('NOVA')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByText('NOVA')).not.toBeInTheDocument()
  })

  it('shows a friendly message for a quota error and does not apply', async () => {
    const api: AiCopyApi = {
      generateCopy: vi.fn().mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many')),
    }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate from this chip/i }))
    await waitFor(() => expect(screen.getByText(/daily ai limit/i)).toBeInTheDocument())
    expect(onApply).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/specs/AiSpecPanel.test.tsx`
Expected: FAIL — cannot resolve `./AiSpecPanel`.

- [ ] **Step 3: Write the panel**

Create `src/features/specs/AiSpecPanel.tsx`:

```tsx
import { useState } from 'react'
import { deriveAiChipContext } from '../../domain/ai/deriveAiChipContext'
import type { FakeSpec, Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError, liveAiCopyApi, type AiCopyApi } from './aiCopyApi'

type Props = {
  project: Project
  onApply: (spec: FakeSpec) => void
  api?: AiCopyApi
}

function messageForError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI generation.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return 'The AI provider is unavailable right now.'
      default:
        return error.message
    }
  }
  return 'Something went wrong generating copy.'
}

export function AiSpecPanel({ project, onApply, api = liveAiCopyApi }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [preview, setPreview] = useState<FakeSpec | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('loading')
    setError(null)
    setPreview(null)
    try {
      const spec = await api.generateCopy(deriveAiChipContext(project))
      setPreview(spec)
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setStatus('idle')
    }
  }

  function apply() {
    if (preview === null) return
    onApply(preview)
    setPreview(null)
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-cyan-900 bg-[#040a0f] p-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">AI Spec Copy</h2>
      <button
        type="button"
        className="rounded border border-cyan-700 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
        onClick={generate}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Generating…' : '✨ Generate from this chip'}
      </button>

      {error !== null && <p className="text-[11px] text-amber-400">{error}</p>}

      {preview !== null && (
        <div className="flex flex-col gap-1 rounded border border-cyan-800 bg-[#06121a] p-2 text-cyan-100">
          <p className="text-sm font-semibold">
            {preview.brand} {preview.series}
          </p>
          <p className="text-[11px] text-cyan-300">{preview.description}</p>
          {preview.features.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-cyan-200">
              {preview.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          )}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded border border-cyan-500 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-50 hover:border-cyan-300"
              onClick={apply}
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded border border-cyan-900 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300 hover:border-cyan-600"
              onClick={() => setPreview(null)}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/specs/AiSpecPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the panel into the inspector rail**

In `src/features/editor/EditorInspectorRail.tsx`:

1. Add the import next to the other spec imports (near `import { FakeSpecForm } …`):

```ts
import { AiSpecPanel } from '../specs/AiSpecPanel'
```

2. Mount it directly above `FakeSpecForm` (line ~99). Replace:

```tsx
        <FakeSpecForm spec={project.spec} onChange={onSetSpec} />
```

with:

```tsx
        <AiSpecPanel project={project} onApply={onSetSpec} />
        <FakeSpecForm spec={project.spec} onChange={onSetSpec} />
```

> No new prop is needed — `project` and `onSetSpec` are already in scope. The panel makes no network call until its button is clicked, so existing `EditorInspectorRail` render tests stay green.

- [ ] **Step 6: Run the broader client suite to verify no regression**

Run: `npm run test:client -- src/features/editor/EditorInspectorRail src/features/specs/AiSpecPanel`
Expected: PASS (panel tests + the existing inspector-rail tests).

- [ ] **Step 7: Commit**

```bash
git add src/features/specs/AiSpecPanel.tsx src/features/specs/AiSpecPanel.test.tsx src/features/editor/EditorInspectorRail.tsx
git commit -m "feat(v8): AiSpecPanel preview/apply control wired into the editor"
```

---

### Task 8: Gates, browser QA, docs, milestone status

**Files:**
- Modify: `implementation.md` (append a dated V8-M1 entry, Korean)
- Modify: `CLAUDE.md` (Working Context v8 bullet + the `### v8 AI-Assisted Creation` Milestone Status block)

**Interfaces:** none (verification + documentation).

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
Expected: prints `no api key in client bundle`.

- [ ] **Step 3: Browser QA the accept/apply flow**

Run `npm run dev:server` and `npm run dev -- --host 127.0.0.1`, sign in, open a chip in the editor, click **✨ Generate from this chip**, confirm a preview appears (with the fake provider), click **Apply**, and confirm the Spec Sheet fields update and undo reverts the change. Stop the server and confirm the button shows the unreachable message while manual spec editing still works.

- [ ] **Step 4: Record the V8-M1 outcome in `implementation.md`**

Append a `## V8-M1 AI Naming + Fake-Spec Copy (2026-06-19)` section (Korean, matching the file's style): the pure `deriveAiChipContext` + `mapAiSpecDraftToFakeSpec` valid-spec guarantee (trim/length caps, cores clamp, bounded features, defaults); `AiProvider.generateSpecCopy` (fake + anthropic `json_schema`, `claude-opus-4-8`); `POST /api/ai/generate-copy` behind M0 auth + shared 24h quota, `kind='generate-copy'`, **no new migration**; client `aiCopyApi` + additive `AiSpecPanel` (zero-input, preview → Apply via `setSpec` / Discard) above `FakeSpecForm`; local-first/degradation behavior; key server-only; final gate counts.

- [ ] **Step 5: Update `CLAUDE.md`**

In the `### v8 AI-Assisted Creation` Milestone Status block, add a **V8-M1** line summarizing the above and pointing to the spec (`docs/superpowers/specs/2026-06-19-v8-m1-ai-naming-spec-copy-design.md`) and this plan. Update the Working Context v8 bullet to note M1 is done (first user-facing AI feature: zero-input chip→FakeSpec copy with preview/Apply via `setSpec`; reuses M0 quota/log/provider; no schema/migration change; local-first unchanged).

- [ ] **Step 6: Commit**

```bash
git add -f implementation.md CLAUDE.md
git commit -m "docs(v8): record v8-M1 AI naming + fake-spec copy"
```

---

## Self-Review

**1. Spec coverage:**
- Zero-input "Generate from this chip" (chip-context only) → Tasks 1 (context), 7 (button). ✅
- Apply scope = `FakeSpec` only via `setSpec` → Task 7 (`onApply={onSetSpec}`). ✅
- Preview → Apply/Discard review flow → Task 7. ✅
- Valid-output guarantee (`AiSpecDraft → FakeSpec` pure mapping, coerce/clamp/default) → Task 2. ✅
- `AiProvider.generateSpecCopy` fake + anthropic (`json_schema`, opus-4-8) → Tasks 3, 4. ✅
- `POST /api/ai/generate-copy` w/ auth + shared 24h quota + `kind='generate-copy'`, no new migration → Task 5. ✅
- Client `aiCopyApi` error mapping (401/429/503/offline) → Task 6. ✅
- Additive panel, local-first degradation, manual editing unaffected → Tasks 6, 7 (error messages), 8 (browser QA). ✅
- Key server-only, gates green, docs → Task 8. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" — every code step shows full code. The single runtime-dependent spot (anthropic structured-output binding) carries an explicit "re-consult `claude-api`" instruction plus a mock-based test that doesn't depend on the live type, exactly mirroring the M0 plan. Doc/test counts in Task 8 are runtime-filled by design.

**3. Type consistency:** `AiSpecDraft`/`AiChipContext` (Task 1) are used verbatim in Tasks 3 (`AiSpecCopyInput`), 4, 5 (`context`), 6, 7. `AiProvider.generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>` (Task 3) is implemented in Tasks 3–4 and called in Task 5. `mapAiSpecDraftToFakeSpec` (Task 2) is consumed in Task 5. `AiCopyApi`/`AiApiError`/`AiServerUnreachableError`/`liveAiCopyApi` (Task 6) are used in Task 7. `deriveAiChipContext` (Task 1) is used in Task 7's panel and (shape-compatibly) in Task 5's server-side sanitization. The route returns `{ spec }`; the client reads `{ spec }`; the panel applies it via `onApply`/`onSetSpec` (signature `(spec: FakeSpec) => void`, matching `EditorInspectorRail`'s existing `onSetSpec`).

## Notes

- The quota is intentionally **shared** with M0: `countRecentGenerations` counts every `ai_prompt_log` row in the trailing 24h, so generate-draft and generate-copy draw from the same daily cap. No new migration or counter.
- The route sanitizes the client-supplied context (string/array coercion) before logging and calling the provider; `theme`/`dieShape` are cast to their union types because the provider uses them only as prompt flavor and the mapper never reads them — invalid values cannot corrupt the resulting `FakeSpec`.
- `AiSpecPanel` is additive and lazy (no fetch until the button is clicked), so it cannot regress existing `EditorInspectorRail` render tests and never blocks manual `FakeSpecForm` editing.
- Confirm the migration list is unchanged (`grep -nE "id: '01" server/src/migrations.ts` should still end at `013_ai`) — M1 adds **no** migration.
