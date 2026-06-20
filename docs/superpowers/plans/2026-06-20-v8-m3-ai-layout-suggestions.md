# v8-M3 AI Layout Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Before Task 5 (the `@anthropic-ai/sdk` adapter method), re-invoke the `claude-api` skill** to confirm the current structured-output binding — mirror the existing `generateChipDraft`/`generateSpecCopy` usage in the same file. The test mocks the SDK; no network call.

**Goal:** Suggest new blocks to add to the chip being edited — an editor inspector-rail panel calls a new server endpoint, lists per-suggestion Accept/Reject, and Accept applies the addition through a new editor command (one undo step).

**Architecture:** Independent of M2; builds on M0's provider/quota/`ai_prompt_log` foundation and the existing editor command system. A pure `resolveAiSuggestionBlock` is the apply-time valid-output guarantee (drop unknown type, clamp into the die). A new `editorStore.applyAiSuggestion` routes one suggestion through the editor's `commit()`/undo machinery. The `AiProvider` gains `generateLayoutSuggestions` (fake + anthropic); a new `POST /api/ai/suggest-layout` reuses M0's auth + shared 24h quota + the M1 `requireUserWithinQuota` helper.

**Tech Stack:** TypeScript, React + Vitest + React Testing Library (client), Hono + better-sqlite3 + `@anthropic-ai/sdk` (server workspace). Shared domain reused server-side via the `@domain/*` alias.

## Global Constraints

- Node.js `20.19+` or `22.12+`; package manager **npm**.
- **The valid-output guarantee lives in `resolveAiSuggestionBlock` (apply time), not the AI schema.** Structured outputs enforce shape only. Unknown block types are dropped (→ a no-op); positions/sizes are clamped into the die's bounding box.
- `src/domain/ai/` stays **pure**: no React/Konva/Zustand/IndexedDB/AI/network imports, and **no import from `src/features/`** (so the die clamp is inline/fractional, not the features `clampBlockToDie`).
- `ANTHROPIC_API_KEY` is **server-only** — never serialized into any client response or bundle.
- **No new migration, no `Project` `schemaVersion` change** (`CURRENT_SCHEMA_VERSION` stays `5`); `AiLayoutSuggestion`/`AiLayoutContext` are in-memory intermediate shapes. No new endpoint beyond `POST /api/ai/suggest-layout`; `ai_prompt_log` and the shared 24h quota are reused with `kind='suggest-layout'`. No Konva 2D PNG export change.
- Each accept is **one editor command = one undo step**; **reject leaves the project untouched**. The panel is additive: every failure path (offline / 401 / 429 / 503 / refusal) renders an inline message and never disables manual editing; **no project change on failure**.
- Default model `claude-opus-4-8`; the 16 known block types are `CPU, GPU, DSP, SRAM, Cache, DAC, ADC, PLL, IO, USB, EmotionEngine, DreamSynth, QuantumMemory, ConsciousnessProcessor, RealityDistortionUnit, TimeCore`.
- Vitest with explicit `import { describe, expect, it } from 'vitest'`. **No real Anthropic network calls in tests** (fake provider, or SDK mocked).
- Each task ends green on `npm test` and is committed. Final gate: `npm test` / `npm run build` / `npm run typecheck --workspace server` / `npm run lint` green.

---

### Task 1: `AiLayoutSuggestion`/`AiLayoutContext` types + `deriveAiLayoutContext`

**Files:**
- Create: `src/domain/ai/aiLayoutSuggestion.ts`
- Create: `src/domain/ai/deriveAiLayoutContext.ts`
- Test: `src/domain/ai/deriveAiLayoutContext.test.ts`

**Interfaces:**
- Consumes: `DieShape`/`Project` (`src/domain/project.ts`).
- Produces: `type AiLayoutSuggestion = { type: string; label?: string; reason?: string; x: number; y: number; w: number; h: number }`; `type AiLayoutContext = { dieShape: DieShape; blocks: { type: string; x: number; y: number; w: number; h: number }[] }`; `deriveAiLayoutContext(project: Project): AiLayoutContext`. Used by Tasks 2, 4–8.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/deriveAiLayoutContext.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from '../projectFactory'
import { buildBlock } from '../blockFactory'
import { deriveAiLayoutContext } from './deriveAiLayoutContext'

describe('deriveAiLayoutContext', () => {
  it('derives the die shape and existing blocks as fractional rectangles', () => {
    const project = createProject('Chip', 'p1', 0)
    project.die = { ...project.die, shape: 'square', width: 800, height: 800 }
    project.blocks = [{ ...buildBlock(project, 'CPU', 'cpu'), x: 80, y: 160, w: 200, h: 80, zIndex: 0 }]
    const ctx = deriveAiLayoutContext(project)
    expect(ctx.dieShape).toBe('square')
    expect(ctx.blocks).toEqual([{ type: 'CPU', x: 0.1, y: 0.2, w: 0.25, h: 0.1 }])
  })

  it('returns an empty block list for a blank project', () => {
    const ctx = deriveAiLayoutContext(createProject('Blank', 'p2', 0))
    expect(ctx.blocks).toEqual([])
    expect(ctx.dieShape).toBe('rect')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/deriveAiLayoutContext.test.ts`
Expected: FAIL — cannot resolve `./deriveAiLayoutContext`.

- [ ] **Step 3: Write the types**

Create `src/domain/ai/aiLayoutSuggestion.ts`:

```ts
import type { DieShape } from '../project'

/** One AI-suggested new block. x/y/w/h are fractions of the die, in [0, 1]. */
export type AiLayoutSuggestion = {
  type: string
  label?: string
  reason?: string
  x: number
  y: number
  w: number
  h: number
}

/** The current chip layout the AI reasons over when suggesting additions. */
export type AiLayoutContext = {
  dieShape: DieShape
  blocks: { type: string; x: number; y: number; w: number; h: number }[]
}
```

- [ ] **Step 4: Write the derivation**

Create `src/domain/ai/deriveAiLayoutContext.ts`:

```ts
import type { Project } from '../project'
import type { AiLayoutContext } from './aiLayoutSuggestion'

/** Pure: the die shape + existing blocks as fractional rectangles (the layout the AI reasons over). */
export function deriveAiLayoutContext(project: Project): AiLayoutContext {
  const { width, height } = project.die
  return {
    dieShape: project.die.shape,
    blocks: project.blocks.map((block) => ({
      type: block.type,
      x: block.x / width,
      y: block.y / height,
      w: block.w / width,
      h: block.h / height,
    })),
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/deriveAiLayoutContext.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/ai/aiLayoutSuggestion.ts src/domain/ai/deriveAiLayoutContext.ts src/domain/ai/deriveAiLayoutContext.test.ts
git commit -m "feat(v8): AiLayoutSuggestion/AiLayoutContext types + deriveAiLayoutContext"
```

---

### Task 2: `blockClamp` helper + pure `resolveAiSuggestionBlock`

**Files:**
- Create: `src/domain/ai/blockClamp.ts`
- Create: `src/domain/ai/resolveAiSuggestionBlock.ts`
- Test: `src/domain/ai/resolveAiSuggestionBlock.test.ts`

**Interfaces:**
- Consumes: `buildBlock`/`nextZIndex` (`src/domain/blockFactory.ts`), `Block`/`BlockType`/`Project` (`src/domain/project.ts`), `AiLayoutSuggestion` (Task 1).
- Produces: `KNOWN_BLOCK_TYPES: ReadonlySet<string>`; `clampFractionalBlock(die: { width: number; height: number }, frac: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number }`; `resolveAiSuggestionBlock(project: Project, suggestion: AiLayoutSuggestion, id: string): Block | null`. Used by Task 3.

> Note: `blockClamp.ts` is a **new** pure module. It intentionally mirrors the inline block-type set + fractional clamp in M0's `mapAiDraftToProject` rather than refactoring that file, because the unmerged v8-M2 plan also edits `mapAiDraftToProject`; consolidating the two is deferred to avoid cross-plan coupling. Document this in the file's comment.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/resolveAiSuggestionBlock.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from '../projectFactory'
import { resolveAiSuggestionBlock } from './resolveAiSuggestionBlock'
import type { AiLayoutSuggestion } from './aiLayoutSuggestion'

const project = createProject('Chip', 'p1', 0) // rect die 960x640

describe('resolveAiSuggestionBlock', () => {
  it('resolves a valid suggestion into a clamped block carrying the label', () => {
    const suggestion: AiLayoutSuggestion = {
      type: 'Cache', label: 'L3', x: 0.1, y: 0.1, w: 0.2, h: 0.2,
    }
    const block = resolveAiSuggestionBlock(project, suggestion, 'b1')
    expect(block).not.toBeNull()
    expect(block!.id).toBe('b1')
    expect(block!.type).toBe('Cache')
    expect(block!.label).toBe('L3')
    expect(block!.x).toBeCloseTo(96)
    expect(block!.w).toBeCloseTo(192)
  })

  it('returns null for an unknown block type', () => {
    const block = resolveAiSuggestionBlock(
      project,
      { type: 'Nonsense', x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
      'b1',
    )
    expect(block).toBeNull()
  })

  it('clamps an out-of-bounds suggestion inside the die', () => {
    const block = resolveAiSuggestionBlock(
      project,
      { type: 'GPU', x: 5, y: 5, w: 9, h: 9 },
      'b1',
    )!
    const { width, height } = project.die
    expect(block.x).toBeGreaterThanOrEqual(0)
    expect(block.y).toBeGreaterThanOrEqual(0)
    expect(block.x + block.w).toBeLessThanOrEqual(width)
    expect(block.y + block.h).toBeLessThanOrEqual(height)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/resolveAiSuggestionBlock.test.ts`
Expected: FAIL — cannot resolve `./resolveAiSuggestionBlock`.

- [ ] **Step 3: Write the clamp helper**

Create `src/domain/ai/blockClamp.ts`:

```ts
import type { BlockType } from '../project'

/**
 * The 16 real + fantasy block types the editor can render. Mirrors the inline set in
 * mapAiDraftToProject; kept separate here (rather than refactoring that file) because the
 * unmerged v8-M2 plan also edits mapAiDraftToProject — consolidation is deferred to avoid
 * cross-plan coupling.
 */
export const KNOWN_BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
  'CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB',
  'EmotionEngine', 'DreamSynth', 'QuantumMemory', 'ConsciousnessProcessor',
  'RealityDistortionUnit', 'TimeCore',
])

const MIN_SIZE = 24

function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo
  return Math.max(lo, Math.min(hi, value))
}

/** Converts a fractional [0,1] block rect into a pixel rect clamped inside the die bounds. */
export function clampFractionalBlock(
  die: { width: number; height: number },
  frac: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const w = clamp(frac.w * die.width, MIN_SIZE, die.width)
  const h = clamp(frac.h * die.height, MIN_SIZE, die.height)
  const x = clamp(frac.x * die.width, 0, die.width - w)
  const y = clamp(frac.y * die.height, 0, die.height - h)
  return { x, y, w, h }
}
```

- [ ] **Step 4: Write the resolver**

Create `src/domain/ai/resolveAiSuggestionBlock.ts`:

```ts
import { buildBlock } from '../blockFactory'
import type { Block, BlockType, Project } from '../project'
import type { AiLayoutSuggestion } from './aiLayoutSuggestion'
import { KNOWN_BLOCK_TYPES, clampFractionalBlock } from './blockClamp'

/**
 * Resolves one AI layout suggestion into a domain-valid Block to add, or null if the suggested
 * block type is unknown. The block is clamped inside the die's bounding box (and carries the
 * next z-order via buildBlock), so an adversarial suggestion can never become an invalid block.
 * The apply-time valid-output guarantee for M3.
 */
export function resolveAiSuggestionBlock(
  project: Project,
  suggestion: AiLayoutSuggestion,
  id: string,
): Block | null {
  if (!KNOWN_BLOCK_TYPES.has(suggestion.type)) return null
  const built = buildBlock(project, suggestion.type as BlockType, id)
  const rect = clampFractionalBlock(project.die, suggestion)
  return { ...built, ...rect, label: suggestion.label }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/resolveAiSuggestionBlock.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain/ai/blockClamp.ts src/domain/ai/resolveAiSuggestionBlock.ts src/domain/ai/resolveAiSuggestionBlock.test.ts
git commit -m "feat(v8): pure resolveAiSuggestionBlock + blockClamp (apply-time guarantee)"
```

---

### Task 3: `editorStore.applyAiSuggestion`

**Files:**
- Modify: `src/stores/editorStore.ts`
- Test: `src/stores/editorStore.test.ts` (append cases)

**Interfaces:**
- Consumes: `resolveAiSuggestionBlock` (Task 2), `AiLayoutSuggestion` (Task 1), the store's existing `commit`/`replaceBlocks`/`reflowBlocksGlobally`/`createId`.
- Produces: `EditorState.applyAiSuggestion(suggestion: AiLayoutSuggestion): void`. Used by Task 8 (EditorPage wiring).

- [ ] **Step 1: Write the failing test**

Append to `src/stores/editorStore.test.ts` (inside a describe block — add it at the end of the file's outer `describe`, or a new `describe`):

```ts
describe('editor store AI suggestions', () => {
  it('applies a suggestion as one undoable block addition', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('sug-1') })
    const before = store.getState().project.blocks.length

    store.getState().applyAiSuggestion({ type: 'SRAM', x: 0.1, y: 0.1, w: 0.2, h: 0.2 })

    const added = store.getState().project.blocks
    expect(added).toHaveLength(before + 1)
    expect(added.at(-1)).toMatchObject({ id: 'sug-1', type: 'SRAM' })
    expect(store.getState().selectedBlockId).toBe('sug-1')

    store.getState().undo()
    expect(store.getState().project.blocks).toHaveLength(before)
  })

  it('ignores a suggestion with an unknown block type (no commit)', () => {
    const store = createEditorStore(seededProject())
    const before = store.getState().project.blocks.length

    store.getState().applyAiSuggestion({ type: 'Nonsense', x: 0.1, y: 0.1, w: 0.2, h: 0.2 })

    expect(store.getState().project.blocks).toHaveLength(before)
    expect(store.getState().past).toHaveLength(0)
  })
})
```

> Note: `seededProject` and `fixedIds` are already defined at the top of `editorStore.test.ts`. The new `describe` goes at the top level of the file (a sibling of the existing describes); add the `import` only if not present (it is).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/stores/editorStore.test.ts`
Expected: FAIL — `applyAiSuggestion` is not a function.

- [ ] **Step 3: Add the command**

In `src/stores/editorStore.ts`:

1. Add imports near the top (next to the existing domain imports):

```ts
import { resolveAiSuggestionBlock } from '../domain/ai/resolveAiSuggestionBlock'
import type { AiLayoutSuggestion } from '../domain/ai/aiLayoutSuggestion'
```

2. Add the method to the `EditorState` type (after `addDecoration`):

```ts
  applyAiSuggestion: (suggestion: AiLayoutSuggestion) => void
```

3. Add the implementation to the returned store object (right after the `addBlock` method, mirroring its reflow handling):

```ts
      applyAiSuggestion(suggestion) {
        const { project } = get()
        const block = resolveAiSuggestionBlock(project, suggestion, createId())
        if (block === null) return
        const blocks = [...project.blocks, block]
        const nextBlocks =
          project.studio.layoutMode === 'global-reflow'
            ? reflowBlocksGlobally({
                blocks,
                die: project.die,
                targetBlockId: block.id,
                target: { x: block.x, y: block.y },
              })
            : blocks
        commit(replaceBlocks(project, nextBlocks), {
          selectedBlockId: block.id,
          selectedStudioItem: null,
        })
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/stores/editorStore.test.ts`
Expected: PASS (existing + 2 new). Then `npm run test:client` once for no regression.

- [ ] **Step 5: Commit**

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat(v8): editorStore.applyAiSuggestion (one undoable block addition)"
```

---

### Task 4: `AiProvider.generateLayoutSuggestions` interface + fake

**Files:**
- Modify: `server/src/ai/provider.ts`
- Modify: `server/src/ai/fakeProvider.ts`
- Test: `server/test/aiFakeProvider.test.ts` (append a case)

**Interfaces:**
- Consumes: `AiLayoutContext`/`AiLayoutSuggestion` (`@domain/ai/aiLayoutSuggestion`, Task 1).
- Produces: `type AiLayoutSuggestionsInput = { context: AiLayoutContext }`; `AiProvider.generateLayoutSuggestions(input: AiLayoutSuggestionsInput): Promise<{ suggestions: AiLayoutSuggestion[] }>`; the fake's deterministic implementation. Used by Tasks 5, 6.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiFakeProvider.test.ts` (after the existing describes):

```ts
import type { AiLayoutContext } from '@domain/ai/aiLayoutSuggestion'

describe('createFakeProvider.generateLayoutSuggestions', () => {
  const context: AiLayoutContext = {
    dieShape: 'rect',
    blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
  }

  it('returns deterministic suggestions for new (not-yet-present) block types', async () => {
    const provider = createFakeProvider()
    const a = await provider.generateLayoutSuggestions({ context })
    const b = await provider.generateLayoutSuggestions({ context })
    expect(a).toEqual(b)
    expect(a.suggestions.length).toBeGreaterThan(0)
    expect(a.suggestions.every((s) => typeof s.type === 'string')).toBe(true)
    expect(a.suggestions.some((s) => s.type === 'CPU')).toBe(false)
  })
})
```

> Note: keep the existing imports; add the `AiLayoutContext` import and the new `describe`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: FAIL — `generateLayoutSuggestions` is not a function.

- [ ] **Step 3: Extend the provider interface**

Replace the contents of `server/src/ai/provider.ts`:

```ts
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiChipContext, AiSpecDraft } from '@domain/ai/aiSpecDraft'
import type { AiLayoutContext, AiLayoutSuggestion } from '@domain/ai/aiLayoutSuggestion'

export type AiGenerateInput = { prompt: string }
export type AiSpecCopyInput = { context: AiChipContext }
export type AiLayoutSuggestionsInput = { context: AiLayoutContext }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
  generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>
  generateLayoutSuggestions(
    input: AiLayoutSuggestionsInput,
  ): Promise<{ suggestions: AiLayoutSuggestion[] }>
}
```

- [ ] **Step 4: Implement the fake**

In `server/src/ai/fakeProvider.ts`, add the method to the returned object (after `generateSpecCopy`):

```ts
    async generateLayoutSuggestions(input) {
      const used = new Set(input.context.blocks.map((block) => block.type))
      const candidates = ['Cache', 'GPU', 'PLL']
      const suggestions = candidates
        .filter((type) => !used.has(type))
        .slice(0, 2)
        .map((type, index) => ({
          type,
          reason: `Add a ${type} to balance the layout`,
          x: 0.1 + index * 0.3,
          y: 0.6,
          w: 0.2,
          h: 0.2,
        }))
      return { suggestions }
    },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test --workspace server -- aiFakeProvider`
Expected: PASS (existing + 1 new).

- [ ] **Step 6: Commit**

```bash
git add server/src/ai/provider.ts server/src/ai/fakeProvider.ts server/test/aiFakeProvider.test.ts
git commit -m "feat(v8): AiProvider.generateLayoutSuggestions interface + deterministic fake"
```

---

### Task 5: Anthropic adapter `generateLayoutSuggestions`

> **First, re-invoke the `claude-api` skill** to confirm the structured-output binding. Mirror the existing `generateChipDraft`/`generateSpecCopy` in this same file. After Task 4 made the method required on `AiProvider`, this file does not typecheck until this task adds the method — `npm run typecheck --workspace server` is GREEN again after this task.

**Files:**
- Modify: `server/src/ai/anthropicProvider.ts`
- Test: `server/test/aiAnthropicProvider.test.ts` (append a describe)

**Interfaces:**
- Consumes: `AiLayoutSuggestion` (`@domain/ai/aiLayoutSuggestion`), the existing `Anthropic` client in `createAnthropicProvider`.
- Produces: `AiProvider.generateLayoutSuggestions` on the anthropic provider.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiAnthropicProvider.test.ts` (after the existing describes):

```ts
describe('createAnthropicProvider.generateLayoutSuggestions', () => {
  it('requests opus-4-8 with a json_schema format and parses the suggestions', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            suggestions: [{ type: 'Cache', reason: 'pair with CPU', x: 0.5, y: 0.5, w: 0.2, h: 0.2 }],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const result = await provider.generateLayoutSuggestions({
      context: { dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
    })
    expect(result.suggestions[0].type).toBe('Cache')
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(
      provider.generateLayoutSuggestions({ context: { dieShape: 'rect', blocks: [] } }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: FAIL — `generateLayoutSuggestions` is not a function.

- [ ] **Step 3: Add the schema and method**

In `server/src/ai/anthropicProvider.ts`:

1. Add the type import at the top:

```ts
import type { AiLayoutSuggestion } from '@domain/ai/aiLayoutSuggestion'
```

2. Add a `SUGGESTIONS_SCHEMA` constant after the existing `SPEC_SCHEMA`:

```ts
const SUGGESTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          label: { type: 'string' },
          reason: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
        required: ['type', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['suggestions'],
} as const
```

3. Add the method to the returned object (after `generateSpecCopy`), mirroring its style:

```ts
    async generateLayoutSuggestions(input) {
      const { context } = input
      const summary =
        `dieShape=${context.dieShape}, ` +
        `existingBlocks=[${context.blocks.map((block) => block.type).join(', ')}]`
      const response = await client.messages.create({
        model: opts.model,
        max_tokens: 2048,
        output_config: { format: { type: 'json_schema', schema: SUGGESTIONS_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              'Suggest a few NEW blocks to add to this fictional chip (each with a block type, a ' +
              'short reason, and fractional x,y,w,h in [0,1]). Context: ' +
              summary,
          },
        ],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming)

      if ((response.stop_reason as string) === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as { suggestions: AiLayoutSuggestion[] }
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace server -- aiAnthropicProvider`
Expected: PASS (existing + 2 new). Then `npm run typecheck --workspace server` (GREEN now).

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/anthropicProvider.ts server/test/aiAnthropicProvider.test.ts
git commit -m "feat(v8): Anthropic generateLayoutSuggestions with json_schema structured output"
```

---

### Task 6: `POST /api/ai/suggest-layout` route

**Files:**
- Modify: `server/src/ai/routes.ts`
- Test: `server/test/aiRoutes.test.ts` (append a describe)

**Interfaces:**
- Consumes: the existing `requireUserWithinQuota` helper, `fail`, `logPrompt`, `AppDeps.aiProvider` in `aiRoutes`; `AiLayoutContext` (`@domain/ai/aiLayoutSuggestion`).
- Produces: a `POST /ai/suggest-layout` handler returning `{ suggestions }`.

- [ ] **Step 1: Write the failing test**

Append to `server/test/aiRoutes.test.ts` (after the existing describes):

```ts
const SUGGEST_BODY = {
  context: { dieShape: 'rect', blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }] },
}

describe('POST /api/ai/suggest-layout', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const { app } = createTestApp()
    const res = await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST_BODY))
    expect(res.status).toBe(401)
  })

  it('returns suggestions and logs a suggest-layout prompt for an authed user', async () => {
    const { app, db } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST_BODY, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { suggestions: unknown[] }
    expect(Array.isArray(body.suggestions)).toBe(true)
    const row = db.prepare('SELECT kind FROM ai_prompt_log').get() as { kind: string }
    expect(row.kind).toBe('suggest-layout')
  })

  it('rejects a missing context with 400', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request('/api/ai/suggest-layout', jsonRequest('POST', {}, cookie))
    expect(res.status).toBe(400)
  })

  it('enforces the shared daily quota with 429', async () => {
    const { app } = createTestApp(Date.now, { aiDailyQuota: 1 })
    const cookie = await signIn(app)
    await app.request('/api/ai/suggest-layout', jsonRequest('POST', SUGGEST_BODY, cookie))
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST_BODY, cookie),
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
    }
    const { app } = createTestApp(Date.now, { aiProvider: failing })
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/suggest-layout',
      jsonRequest('POST', SUGGEST_BODY, cookie),
    )
    expect(res.status).toBe(503)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- aiRoutes`
Expected: FAIL — `/ai/suggest-layout` not mounted (404).

- [ ] **Step 3: Add the route handler**

In `server/src/ai/routes.ts`:

1. Add the import near the other `@domain` imports:

```ts
import type { AiLayoutContext } from '@domain/ai/aiLayoutSuggestion'
```

2. Add the handler **before** `return routes` (after the existing generate-copy handler):

```ts
  routes.post('/ai/suggest-layout', async (c) => {
    const guard = await requireUserWithinQuota(c)
    if ('response' in guard) return guard.response
    const user = guard.user

    const body = (await c.req.json().catch(() => null)) as { context?: unknown } | null
    const raw = body?.context
    if (typeof raw !== 'object' || raw === null) {
      return fail(c, 400, 'INVALID_CONTEXT', 'Chip context is required.')
    }
    const source = raw as Record<string, unknown>
    const context: AiLayoutContext = {
      dieShape: (typeof source.dieShape === 'string'
        ? source.dieShape
        : 'rect') as AiLayoutContext['dieShape'],
      blocks: Array.isArray(source.blocks)
        ? (source.blocks.filter(
            (b) => typeof b === 'object' && b !== null,
          ) as AiLayoutContext['blocks'])
        : [],
    }

    // Log before calling out so failed/abused attempts still count against the shared quota.
    logPrompt(db, { userId: user.id, kind: 'suggest-layout', prompt: JSON.stringify(context) }, now)

    let result
    try {
      result = await aiProvider.generateLayoutSuggestions({ context })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    return c.json({ suggestions: result.suggestions })
  })
```

> Note: `requireUserWithinQuota`, `fail`, `db`, `now`, `aiProvider`, and `logPrompt` are all already in scope inside `aiRoutes` from M0/M1. This handler adds no new dependency.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- aiRoutes`
Expected: PASS (existing + 5 new). Then `npm test --workspace server` for no regression.

- [ ] **Step 5: Commit**

```bash
git add server/src/ai/routes.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): POST /api/ai/suggest-layout (auth + shared quota -> suggestions)"
```

---

### Task 7: Client `aiSuggestApi`

**Files:**
- Create: `src/features/editor/aiSuggestApi.ts`
- Test: `src/features/editor/aiSuggestApi.test.ts`

**Interfaces:**
- Consumes: `AiLayoutContext`/`AiLayoutSuggestion` (`src/domain/ai/aiLayoutSuggestion`), `AiApiError`/`AiServerUnreachableError` (`src/features/specs/aiCopyApi.ts`, M1).
- Produces: `type AiSuggestApi = { generateSuggestions(context: AiLayoutContext): Promise<AiLayoutSuggestion[]> }`; `const liveAiSuggestApi: AiSuggestApi`. Used by Task 8.

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/aiSuggestApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiLayoutContext } from '../../domain/ai/aiLayoutSuggestion'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
import { liveAiSuggestApi } from './aiSuggestApi'

const context: AiLayoutContext = { dieShape: 'rect', blocks: [] }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiSuggestApi.generateSuggestions', () => {
  it('POSTs the context and returns the suggestions on success', async () => {
    const suggestions = [{ type: 'Cache', x: 0.5, y: 0.5, w: 0.2, h: 0.2 }]
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ suggestions }), { status: 200 }),
    )
    const result = await liveAiSuggestApi.generateSuggestions(context)
    expect(result).toEqual(suggestions)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/suggest-layout')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ context })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiSuggestApi.generateSuggestions(context)).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiSuggestApi.generateSuggestions(context)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiSuggestApi.generateSuggestions(context)).rejects.toBeInstanceOf(
      AiServerUnreachableError,
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/editor/aiSuggestApi.test.ts`
Expected: FAIL — cannot resolve `./aiSuggestApi`.

- [ ] **Step 3: Write the api client**

Create `src/features/editor/aiSuggestApi.ts`:

```ts
import type { AiLayoutContext, AiLayoutSuggestion } from '../../domain/ai/aiLayoutSuggestion'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export type AiSuggestApi = {
  generateSuggestions: (context: AiLayoutContext) => Promise<AiLayoutSuggestion[]>
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

export const liveAiSuggestApi: AiSuggestApi = {
  async generateSuggestions(context) {
    let res: Response
    try {
      res = await fetch('/api/ai/suggest-layout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { suggestions: AiLayoutSuggestion[] }
    return body.suggestions
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/editor/aiSuggestApi.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/aiSuggestApi.ts src/features/editor/aiSuggestApi.test.ts
git commit -m "feat(v8): client aiSuggestApi (suggest-layout + reused AI error types)"
```

---

### Task 8: `AiLayoutSuggestionsPanel` + editor wiring

**Files:**
- Create: `src/features/editor/AiLayoutSuggestionsPanel.tsx`
- Test: `src/features/editor/AiLayoutSuggestionsPanel.test.tsx`
- Modify: `src/features/editor/EditorInspectorRail.tsx`
- Modify: `src/features/editor/EditorPage.tsx`

**Interfaces:**
- Consumes: `Project` (`src/domain/project.ts`), `AiLayoutSuggestion` (`src/domain/ai/aiLayoutSuggestion`), `deriveAiLayoutContext` (Task 1), `AiSuggestApi`/`liveAiSuggestApi` (Task 7), `AiApiError`/`AiServerUnreachableError` (`src/features/specs/aiCopyApi.ts`), `editorStore.applyAiSuggestion` (Task 3).
- Produces: `function AiLayoutSuggestionsPanel(props: { project: Project; onApply: (s: AiLayoutSuggestion) => void; api?: AiSuggestApi }): JSX.Element`. Mounted in `EditorInspectorRail`; `EditorPage` passes `onApplyAiSuggestion={state.applyAiSuggestion}`.

- [ ] **Step 1: Write the failing test**

Create `src/features/editor/AiLayoutSuggestionsPanel.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createProject } from '../../domain/projectFactory'
import { AiApiError, type AiSuggestApi } from './aiSuggestApi' // type re-exported below
import { AiLayoutSuggestionsPanel } from './AiLayoutSuggestionsPanel'

const SUGGESTIONS = [
  { type: 'Cache', reason: 'pair with CPU', x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
  { type: 'GPU', reason: 'add compute', x: 0.2, y: 0.5, w: 0.2, h: 0.2 },
]

function renderPanel(api: AiSuggestApi, onApply = vi.fn()) {
  render(<AiLayoutSuggestionsPanel project={createProject('Chip', 'p1', 0)} onApply={onApply} api={api} />)
  return { onApply }
}

describe('AiLayoutSuggestionsPanel', () => {
  it('suggests, then accepts one suggestion (applies + removes it)', async () => {
    const api: AiSuggestApi = { generateSuggestions: vi.fn().mockResolvedValue(SUGGESTIONS) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByText(/pair with CPU/i)).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /^accept$/i })[0])
    expect(onApply).toHaveBeenCalledWith(SUGGESTIONS[0])
    expect(screen.queryByText(/pair with CPU/i)).not.toBeInTheDocument()
    // the other suggestion remains
    expect(screen.getByText(/add compute/i)).toBeInTheDocument()
  })

  it('rejects a suggestion without applying it', async () => {
    const api: AiSuggestApi = { generateSuggestions: vi.fn().mockResolvedValue(SUGGESTIONS) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByText(/pair with CPU/i)).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /^reject$/i })[0])
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByText(/pair with CPU/i)).not.toBeInTheDocument()
  })

  it('shows a friendly message on a quota error', async () => {
    const api: AiSuggestApi = {
      generateSuggestions: vi.fn().mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many')),
    }
    renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByText(/daily ai limit/i)).toBeInTheDocument())
  })
})
```

> Note: `AiApiError` is exported from `../specs/aiCopyApi`; re-import it from there if preferred — change the import to `import { AiApiError } from '../specs/aiCopyApi'` and `import type { AiSuggestApi } from './aiSuggestApi'`. (Both work; keep the test's imports resolvable.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/editor/AiLayoutSuggestionsPanel.test.tsx`
Expected: FAIL — cannot resolve `./AiLayoutSuggestionsPanel`.

- [ ] **Step 3: Write the panel**

Create `src/features/editor/AiLayoutSuggestionsPanel.tsx`:

```tsx
import { useState } from 'react'
import { deriveAiLayoutContext } from '../../domain/ai/deriveAiLayoutContext'
import type { AiLayoutSuggestion } from '../../domain/ai/aiLayoutSuggestion'
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
import { liveAiSuggestApi, type AiSuggestApi } from './aiSuggestApi'

type Props = {
  project: Project
  onApply: (suggestion: AiLayoutSuggestion) => void
  api?: AiSuggestApi
}

function messageForError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI suggestions.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return 'The AI provider is unavailable right now.'
      default:
        return error.message
    }
  }
  return 'Something went wrong fetching suggestions.'
}

export function AiLayoutSuggestionsPanel({ project, onApply, api = liveAiSuggestApi }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [suggestions, setSuggestions] = useState<AiLayoutSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)

  async function suggest() {
    setStatus('loading')
    setError(null)
    setSuggestions([])
    try {
      const next = await api.generateSuggestions(deriveAiLayoutContext(project))
      setSuggestions(next)
    } catch (caught) {
      setError(messageForError(caught))
    } finally {
      setStatus('idle')
    }
  }

  function removeAt(index: number) {
    setSuggestions((current) => current.filter((_, i) => i !== index))
  }

  function accept(index: number) {
    onApply(suggestions[index])
    removeAt(index)
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-cyan-900 bg-[#040a0f] p-2">
      <h2 className="text-xs uppercase tracking-[0.25em] text-cyan-300">AI Layout Suggestions</h2>
      <button
        type="button"
        className="rounded border border-cyan-700 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
        onClick={suggest}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Thinking…' : '✨ Suggest improvements'}
      </button>

      {error !== null && <p className="text-[11px] text-amber-400">{error}</p>}

      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className="flex flex-col gap-1 rounded border border-cyan-800 bg-[#06121a] p-2 text-cyan-100"
        >
          <p className="text-sm font-semibold">{suggestion.type}</p>
          {suggestion.reason !== undefined && (
            <p className="text-[11px] text-cyan-300">{suggestion.reason}</p>
          )}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="rounded border border-cyan-500 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-50 hover:border-cyan-300"
              onClick={() => accept(index)}
            >
              Accept
            </button>
            <button
              type="button"
              className="rounded border border-cyan-900 px-2 py-1 text-[11px] uppercase tracking-wider text-cyan-300 hover:border-cyan-600"
              onClick={() => removeAt(index)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the panel test to verify it passes**

Run: `npm run test:client -- src/features/editor/AiLayoutSuggestionsPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the panel into the inspector rail**

In `src/features/editor/EditorInspectorRail.tsx`:

1. Add the imports near the other spec/panel imports:

```ts
import { AiLayoutSuggestionsPanel } from './AiLayoutSuggestionsPanel'
import type { AiLayoutSuggestion } from '../../domain/ai/aiLayoutSuggestion'
```

2. Add `onApplyAiSuggestion` to the `Props` type (after `onSetSpec`):

```ts
  onApplyAiSuggestion: (suggestion: AiLayoutSuggestion) => void
```

3. Add it to the destructured params (after `onSetSpec`):

```ts
  onApplyAiSuggestion,
```

4. Mount the panel directly above `<FakeSpecForm …>` (the existing line `<FakeSpecForm spec={project.spec} onChange={onSetSpec} />`):

```tsx
        <AiLayoutSuggestionsPanel project={project} onApply={onApplyAiSuggestion} />
        <FakeSpecForm spec={project.spec} onChange={onSetSpec} />
```

> Note: if v8-M1's `AiSpecPanel` is also mounted here, place this panel adjacent to it. The panel makes no network call until its button is clicked, so existing `EditorInspectorRail` render tests stay green **once the new required prop is supplied** (next step's test note).

- [ ] **Step 6: Pass the command from EditorPage and fix the rail test**

In `src/features/editor/EditorPage.tsx`, add the prop to the `<EditorInspectorRail …>` element (after `onSetSpec={state.setSpec}`):

```tsx
        onSetSpec={state.setSpec}
        onApplyAiSuggestion={state.applyAiSuggestion}
```

In `src/features/editor/EditorInspectorRail.test.tsx`, add `onApplyAiSuggestion={vi.fn()}` to **every** existing `<EditorInspectorRail …>` render in the file (so the new required prop typechecks and the existing assertions keep passing).

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test:client -- src/features/editor/AiLayoutSuggestionsPanel src/features/editor/EditorInspectorRail`
Expected: PASS (panel + existing rail tests). Then `npm run test:client` once for no regression.

- [ ] **Step 8: Commit**

```bash
git add src/features/editor/AiLayoutSuggestionsPanel.tsx src/features/editor/AiLayoutSuggestionsPanel.test.tsx src/features/editor/EditorInspectorRail.tsx src/features/editor/EditorInspectorRail.test.tsx src/features/editor/EditorPage.tsx
git commit -m "feat(v8): AiLayoutSuggestionsPanel with per-item Accept/Reject wired into the editor"
```

---

### Task 9: Gates, browser QA, docs, milestone status

**Files:**
- Modify: `implementation.md` (append a dated V8-M3 entry, Korean)
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

- [ ] **Step 3: Browser QA (owner-manual — do NOT automate)**

Document the interactive suggest → Accept → undo flow (open a chip, click Suggest improvements, confirm suggestions list, Accept one and confirm a block is added, undo to remove it, Reject one and confirm no change; stop the server and confirm the inline error with manual editing unaffected) as **owner-manual / pending** in both docs. Do not run a browser session or claim it was performed; the automated gates + fake-provider tests are the evidence at this checkpoint.

- [ ] **Step 4: Record the V8-M3 outcome in `implementation.md`**

Append a `## V8-M3 AI Layout Suggestions (2026-06-20)` section (Korean, matching the file's style): the apply-time valid-output guarantee (`resolveAiSuggestionBlock` drops unknown types + clamps via `blockClamp`); `deriveAiLayoutContext`; the new `editorStore.applyAiSuggestion` (one undoable commit, mirrors `addBlock`); `AiProvider.generateLayoutSuggestions` (deterministic fake + anthropic `json_schema`); `POST /api/ai/suggest-layout` reusing M0 auth + the M1 `requireUserWithinQuota` helper + shared 24h quota (`kind='suggest-layout'`, **no new migration**); client `aiSuggestApi` + the additive `AiLayoutSuggestionsPanel` (per-item Accept via `applyAiSuggestion` / Reject) in the inspector rail; local-first/degradation; key server-only; final gate counts; browser QA owner-manual/pending. Note that `blockClamp.ts` intentionally mirrors `mapAiDraftToProject`'s inline set (consolidation deferred to avoid coupling with the unmerged M2 plan).

- [ ] **Step 5: Update `CLAUDE.md`**

In the `### v8 AI-Assisted Creation` Milestone Status block, add a **V8-M3** line summarizing the above and pointing to the spec (`docs/superpowers/specs/2026-06-20-v8-m3-ai-layout-suggestions-design.md`) and this plan. Update the Working Context v8 bullet to note M3 is done (AI layout suggestions: editor panel suggests new blocks, per-item Accept applies through a new undoable editor command, Reject leaves the project untouched; reuses M0 endpoint/quota; no schema/migration change; local-first unchanged; browser QA pending owner-manual).

- [ ] **Step 6: Commit**

```bash
git add -f implementation.md CLAUDE.md
git commit -m "docs(v8): record v8-M3 AI layout suggestions"
```

---

## Self-Review

**1. Spec coverage:**
- `AiLayoutSuggestion`/`AiLayoutContext` + `deriveAiLayoutContext` → Task 1. ✅
- Apply-time valid-output guarantee (`resolveAiSuggestionBlock` drop/clamp) → Task 2. ✅
- `editorStore.applyAiSuggestion` (one undo step, no-op on null) → Task 3. ✅
- `AiProvider.generateLayoutSuggestions` fake + anthropic (`json_schema`, opus-4-8) → Tasks 4, 5. ✅
- `POST /api/ai/suggest-layout` reusing M0 auth + M1 quota helper, `kind='suggest-layout'`, no migration → Task 6. ✅
- Client `aiSuggestApi` (reused AI error types) → Task 7. ✅
- Inspector-rail panel, per-item Accept/Reject, Accept routes through the command, Reject untouched, inline errors → Task 8. ✅
- Key server-only, gates green, browser QA owner-manual, docs → Task 9. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" — every code step shows full code. The runtime-dependent spot (anthropic structured-output binding) carries a "re-consult `claude-api`" note plus a mock-based test. Doc/test counts in Task 9 are runtime-filled by design.

**3. Type consistency:** `AiLayoutSuggestion`/`AiLayoutContext` (Task 1) flow through `resolveAiSuggestionBlock` (Task 2), `applyAiSuggestion` (Task 3), the provider interface `generateLayoutSuggestions(input): Promise<{ suggestions: AiLayoutSuggestion[] }>` (Tasks 4–6), `aiSuggestApi.generateSuggestions(context): Promise<AiLayoutSuggestion[]>` (Task 7), and the panel's `onApply`/`api` (Task 8). `KNOWN_BLOCK_TYPES`/`clampFractionalBlock` (Task 2) are used by `resolveAiSuggestionBlock` (Task 2). The route returns `{ suggestions }`; the client reads `{ suggestions }`; the panel's `onApply` matches `EditorInspectorRail`'s `onApplyAiSuggestion` and `EditorPage`'s `state.applyAiSuggestion` (signature `(suggestion: AiLayoutSuggestion) => void`). `AiApiError`/`AiServerUnreachableError` are imported from `src/features/specs/aiCopyApi.ts` (M1) in Tasks 7 and 8 — same classes, so the panel's `instanceof` mapping matches what `aiSuggestApi` throws.

## Notes

- M3 is independent of v8-M2. It builds on **M0** (provider interface, quota, `ai_prompt_log`, config) and **M1** (the `requireUserWithinQuota` route helper, the shared AI error classes) — both implemented and merged on this branch.
- `blockClamp.ts` deliberately mirrors the inline block-type set + fractional clamp in M0's `mapAiDraftToProject` rather than refactoring that file: the unmerged v8-M2 plan also edits `mapAiDraftToProject`, so consolidating now would create cross-plan coupling. A later cleanup can extract one shared helper.
- Adding `generateLayoutSuggestions` as a required `AiProvider` method (Task 4) makes `anthropicProvider.ts` not typecheck until Task 5 implements it — a planned transient (mirrors M1's interface/adapter split). Per-task `npm test` (vitest) stays green; `npm run typecheck --workspace server` is green again after Task 5.
- `applyAiSuggestion` mirrors `addBlock` exactly (including the `global-reflow` branch, targeting the new block at its clamped position), so it integrates with the editor's existing commit/undo machinery — each accept is one undo step.
- The route sanitizes the client-supplied context (string/array coercion) before logging and calling the provider; `dieShape` is cast to its union after a `typeof`-string check because the provider uses it only as prompt flavor and the resolver never reads the context.
