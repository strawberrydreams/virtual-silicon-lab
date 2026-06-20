# v8-M2 Prompt → Chip Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Before Task 4 (the `@anthropic-ai/sdk` schema change), re-invoke the `claude-api` skill** to confirm the current structured-output binding — do not guess SDK syntax. (The change is additive to an already-verified schema; mirror the existing `DRAFT_SCHEMA` usage in the same file.)

**Goal:** Turn a dashboard vibe prompt into a starting chip — call the existing M0 `POST /api/ai/generate-draft`, enrich the draft with an AI-chosen `theme`, save the result as a fresh local `Project`, and open it in the editor.

**Architecture:** The server side already exists (M0's generate-draft returns an unsaved draft `Project` via the pure `mapAiDraftToProject`). M2 adds the `theme` field end-to-end (pure mapper + both providers), a pure `materializeAiDraftProject` that clones a network-sourced draft snapshot into a fresh local project (reusing the v3 remix-import `migrateProject` pattern, name preserved), a `projectStore.createFromAiDraft`, a client `aiDraftApi`, and a dashboard prompt control wired through `App`.

**Tech Stack:** TypeScript, React + Vitest + React Testing Library (client), Hono + better-sqlite3 + `@anthropic-ai/sdk` (server workspace). Shared domain reused server-side via the `@domain/*` alias.

## Global Constraints

- Node.js `20.19+` or `22.12+`; package manager **npm**.
- **Domain invariants live in `mapAiDraftToProject`, not the AI schema.** Structured outputs enforce shape only. An invalid/missing `theme` falls back to the project default inside the mapper; die-clamp/z-order/`schemaVersion` are unchanged from M0.
- `src/domain/ai/` stays **pure**: no React/Konva/Zustand/IndexedDB/AI/network imports.
- `ANTHROPIC_API_KEY` is **server-only** — never serialized into any client response or bundle.
- **No new migration, no `Project` `schemaVersion` change** (`CURRENT_SCHEMA_VERSION` stays `5`); `AiChipDraft` is an in-memory intermediate shape, not persisted. No new endpoint — generate-draft, `ai_prompt_log`, and the shared 24h quota are reused from M0. No Konva 2D PNG export change.
- The dashboard AI control is **additive**: every failure path (offline / 401 / 429 / 503 / refusal) renders an inline message and never blocks the existing create / random / preset controls; **no project is created on failure**.
- Default model `claude-opus-4-8`; `StyleTheme` = `'neon' | 'retro' | 'military' | 'keynote' | 'mono'`.
- Vitest with explicit `import { describe, expect, it } from 'vitest'`. **No real Anthropic network calls in tests** (fake provider, or SDK mocked).
- Each task ends green on `npm test` and is committed. Final gate: `npm test` / `npm run build` / `npm run typecheck --workspace server` / `npm run lint` green.

---

### Task 1: Enrich `AiChipDraft` with `theme` + apply it in `mapAiDraftToProject`

**Files:**
- Modify: `src/domain/ai/aiChipDraft.ts`
- Modify: `src/domain/ai/mapAiDraftToProject.ts`
- Test: `src/domain/ai/mapAiDraftToProject.test.ts` (append cases)

**Interfaces:**
- Consumes: `StyleTheme`/`DieShape`/`Project` (`src/domain/project.ts`), `createProject`, `buildBlock`.
- Produces: `AiChipDraft` gains an optional `theme?: StyleTheme`; `mapAiDraftToProject` applies a valid `draft.theme` to `project.theme` (invalid/missing → unchanged default). Used by Tasks 4 (providers) and consumed by the M0 route.

- [ ] **Step 1: Write the failing test**

Append to `src/domain/ai/mapAiDraftToProject.test.ts` (inside the existing `describe('mapAiDraftToProject', …)`):

```ts
  it('applies a valid draft theme to the project', () => {
    const project = mapAiDraftToProject({ dieShape: 'rect', theme: 'mono', blocks: [] })
    expect(project.theme).toBe('mono')
  })

  it('falls back to the default theme for a missing or invalid theme', () => {
    const noTheme = mapAiDraftToProject({ dieShape: 'rect', blocks: [] })
    expect(noTheme.theme).toBe('neon')
    const bad = mapAiDraftToProject({
      dieShape: 'rect',
      theme: 'banana' as unknown as 'neon',
      blocks: [],
    })
    expect(bad.theme).toBe('neon')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/mapAiDraftToProject.test.ts`
Expected: FAIL — `theme` not on `AiChipDraft` / project.theme not set to `'mono'`.

- [ ] **Step 3: Add `theme` to the draft type**

In `src/domain/ai/aiChipDraft.ts`, update the import and the `AiChipDraft` type:

```ts
import type { DieShape, StyleTheme } from '../project'
```

```ts
/** The constrained intermediate shape an AiProvider returns. */
export type AiChipDraft = {
  name?: string
  dieShape: DieShape
  theme?: StyleTheme
  blocks: AiDraftBlock[]
}
```

- [ ] **Step 4: Apply the theme in the mapper**

In `src/domain/ai/mapAiDraftToProject.ts`:

1. Add `StyleTheme` to the type import:

```ts
import type { BlockType, DieShape, Project, StyleTheme } from '../project'
```

2. Add a `THEMES` set next to `DIE_SHAPES`:

```ts
const THEMES: ReadonlySet<string> = new Set<StyleTheme>([
  'neon', 'retro', 'military', 'keynote', 'mono',
])
```

3. After the `project.die = { ...project.die, shape }` line, apply the theme:

```ts
  if (draft.theme !== undefined && THEMES.has(draft.theme)) {
    project.theme = draft.theme
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/mapAiDraftToProject.test.ts`
Expected: PASS (existing M0 cases + 2 new). Then `npm run test:client` once for no regression.

- [ ] **Step 6: Commit**

```bash
git add src/domain/ai/aiChipDraft.ts src/domain/ai/mapAiDraftToProject.ts src/domain/ai/mapAiDraftToProject.test.ts
git commit -m "feat(v8): AiChipDraft.theme applied by mapAiDraftToProject (valid-or-default)"
```

---

### Task 2: Pure `materializeAiDraftProject`

**Files:**
- Create: `src/domain/ai/materializeAiDraftProject.ts`
- Test: `src/domain/ai/materializeAiDraftProject.test.ts`

**Interfaces:**
- Consumes: `Project` (`src/domain/project.ts`), `migrateProject` (`src/domain/projectMigration.ts`).
- Produces: `materializeAiDraftProject(snapshot: unknown, id: string, now: number): Project`. Used by Task 3.

- [ ] **Step 1: Write the failing test**

Create `src/domain/ai/materializeAiDraftProject.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from '../project'
import { createProject } from '../projectFactory'
import { materializeAiDraftProject } from './materializeAiDraftProject'

describe('materializeAiDraftProject', () => {
  it('assigns a fresh id and now timestamps while preserving the AI-chosen name', () => {
    const snapshot = createProject('NEON DREAM', 'draft-id', 1_000)
    const project = materializeAiDraftProject(snapshot, 'local-1', 5_000)
    expect(project.id).toBe('local-1')
    expect(project.name).toBe('NEON DREAM')
    expect(project.createdAt).toBe(5_000)
    expect(project.updatedAt).toBe(5_000)
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.remixedFrom).toBeUndefined()
  })

  it('produces an independent deep clone (mutating the result never touches the input)', () => {
    const snapshot = createProject('Chip', 'draft-id', 1_000)
    const project = materializeAiDraftProject(snapshot, 'local-1', 5_000)
    project.die.shape = 'circle'
    project.spec.features.push('Injected')
    expect(snapshot.die.shape).toBe('rect')
    expect(snapshot.spec.features).not.toContain('Injected')
    expect(snapshot.id).toBe('draft-id')
  })

  it('migrates an older-schema snapshot to the current schema', () => {
    const legacy = { ...createProject('Legacy', 'old-id', 1_000), schemaVersion: 1 }
    delete (legacy as { studio?: unknown }).studio
    const project = materializeAiDraftProject(legacy, 'local-1', 5_000)
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.name).toBe('Legacy')
    expect(project.studio.layoutMode).toBe('global-reflow')
  })

  it('throws on a corrupt snapshot', () => {
    expect(() => materializeAiDraftProject({ not: 'a project' }, 'local-1', 5_000)).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/ai/materializeAiDraftProject.test.ts`
Expected: FAIL — cannot resolve `./materializeAiDraftProject`.

- [ ] **Step 3: Write the materializer**

Create `src/domain/ai/materializeAiDraftProject.ts`:

```ts
import type { Project } from '../project'
import { migrateProject } from '../projectMigration'

/**
 * Materializes an AI-generated draft Project snapshot (from POST /api/ai/generate-draft)
 * into a fresh, independent local project. The snapshot is migrated to the current schema
 * (defense in depth — it arrived over the network) then deep-cloned with a new identity.
 * Unlike importRemixedProject, the AI-chosen name is preserved and no remixedFrom is set,
 * because AI generation is original creation, not a remix of a published chip.
 */
export function materializeAiDraftProject(snapshot: unknown, id: string, now: number): Project {
  const migrated = migrateProject(snapshot)
  return {
    ...structuredClone(migrated),
    id,
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/domain/ai/materializeAiDraftProject.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/ai/materializeAiDraftProject.ts src/domain/ai/materializeAiDraftProject.test.ts
git commit -m "feat(v8): pure materializeAiDraftProject (fresh local clone, name preserved)"
```

---

### Task 3: `projectStore.createFromAiDraft`

**Files:**
- Modify: `src/stores/projectStore.ts`
- Test: `src/stores/projectStore.test.ts` (append a case)

**Interfaces:**
- Consumes: `materializeAiDraftProject` (Task 2), the existing store `repository`/`createId`/`now`.
- Produces: `ProjectState.createFromAiDraft(snapshot: unknown): Promise<Project>`. Used by Task 6 (App wiring).

- [ ] **Step 1: Write the failing test**

Append to `src/stores/projectStore.test.ts` (inside `describe('project store', …)`):

```ts
  it('saves an AI draft as a fresh local project listed first, keeping its name', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(repository, () => 7_000, () => `ai-${n++}`)
    const draft = createProject('Prompted Chip', 'server-id', 1_000)

    const first = await store.getState().createFromAiDraft(draft)
    const second = await store.getState().createFromAiDraft(draft)

    expect(first).toMatchObject({ id: 'ai-0', name: 'Prompted Chip', createdAt: 7_000 })
    expect(first.remixedFrom).toBeUndefined()
    expect(second.id).toBe('ai-1')
    expect(store.getState().projects.map((p) => p.id)).toEqual(['ai-1', 'ai-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/stores/projectStore.test.ts`
Expected: FAIL — `createFromAiDraft` is not a function.

- [ ] **Step 3: Add the store command**

In `src/stores/projectStore.ts`:

1. Add the import next to the `importRemixedProject` import:

```ts
import { materializeAiDraftProject } from '../domain/ai/materializeAiDraftProject'
```

2. Add the method to the `ProjectState` type (after `remixImport`):

```ts
  createFromAiDraft: (snapshot: unknown) => Promise<Project>
```

3. Add the implementation to the store object (after the `remixImport` method):

```ts
    async createFromAiDraft(snapshot) {
      const project = materializeAiDraftProject(snapshot, createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/stores/projectStore.test.ts`
Expected: PASS (existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/projectStore.test.ts
git commit -m "feat(v8): projectStore.createFromAiDraft saves an AI draft as a local project"
```

---

### Task 4: Theme through the server providers + route assertion

> **First, re-invoke the `claude-api` skill** to confirm the structured-output binding before editing the schema. The change is an additive `theme` enum property on the existing `DRAFT_SCHEMA`; mirror the existing usage in the same file. The test mocks the SDK — no network call.

**Files:**
- Modify: `server/src/ai/fakeProvider.ts`
- Modify: `server/src/ai/anthropicProvider.ts`
- Test: `server/test/aiFakeProvider.test.ts` (append a case)
- Test: `server/test/aiAnthropicProvider.test.ts` (append a case)
- Test: `server/test/aiRoutes.test.ts` (append a case to the generate-draft describe)

**Interfaces:**
- Consumes: `AiChipDraft.theme` (Task 1), the existing fake/anthropic `generateChipDraft`.
- Produces: the fake `generateChipDraft` returns a deterministic prompt-derived `theme`; the anthropic `DRAFT_SCHEMA` includes a `theme` enum; the generate-draft route returns a project carrying that theme.

- [ ] **Step 1: Write the failing tests**

Append to `server/test/aiFakeProvider.test.ts` (inside the existing `describe('createFakeProvider', …)`):

```ts
  it('derives a deterministic theme from the prompt', async () => {
    const provider = createFakeProvider()
    expect((await provider.generateChipDraft({ prompt: 'a calm mono chip' })).theme).toBe('mono')
    expect((await provider.generateChipDraft({ prompt: 'a neon dream chip' })).theme).toBe('neon')
  })
```

Append to `server/test/aiAnthropicProvider.test.ts` (inside the existing `describe('createAnthropicProvider', …)` that covers `generateChipDraft`):

```ts
  it('includes a theme enum in the draft schema and parses a returned theme', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            dieShape: 'rect',
            theme: 'keynote',
            blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const draft = await provider.generateChipDraft({ prompt: 'keynote chip' })
    expect(draft.theme).toBe('keynote')
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.output_config.format.schema.properties.theme.enum).toContain('keynote')
  })
```

Append to `server/test/aiRoutes.test.ts` (inside the existing `describe('POST /api/ai/generate-draft', …)`):

```ts
  it('returns a project whose theme reflects the draft (fake provider, prompt-derived)', async () => {
    const { app } = createTestApp()
    const cookie = await signIn(app)
    const res = await app.request(
      '/api/ai/generate-draft',
      jsonRequest('POST', { prompt: 'a calm mono chip' }, cookie),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { project: { theme: string } }
    expect(body.project.theme).toBe('mono')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace server -- aiFakeProvider aiAnthropicProvider aiRoutes`
Expected: FAIL — fake draft has no `theme`; `DRAFT_SCHEMA.properties.theme` undefined; route project theme is the default, not `mono`.

- [ ] **Step 3: Add the prompt-derived theme to the fake provider**

In `server/src/ai/fakeProvider.ts`, inside `generateChipDraft`, derive a theme from the prompt and include it in the returned object:

```ts
    async generateChipDraft(input) {
      const name = input.prompt.trim().slice(0, 40) || 'AI Draft Chip'
      const lower = input.prompt.toLowerCase()
      const theme = lower.includes('mono')
        ? 'mono'
        : lower.includes('retro')
          ? 'retro'
          : lower.includes('military')
            ? 'military'
            : lower.includes('keynote')
              ? 'keynote'
              : 'neon'
      return {
        name,
        dieShape: 'rect',
        theme,
        blocks: [
          { type: 'CPU', label: 'Core', x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
          { type: 'Cache', label: 'L2', x: 0.55, y: 0.1, w: 0.3, h: 0.3 },
        ],
      }
    },
```

> Keep the existing `generateSpecCopy` method unchanged.

- [ ] **Step 4: Add the theme enum to the anthropic draft schema**

In `server/src/ai/anthropicProvider.ts`, add a `theme` property to `DRAFT_SCHEMA.properties` (after `dieShape`):

```ts
    dieShape: { type: 'string', enum: ['rect', 'square', 'circle', 'hexagon'] },
    theme: { type: 'string', enum: ['neon', 'retro', 'military', 'keynote', 'mono'] },
```

Then update the `generateChipDraft` user message to ask for a theme (replace the existing content string):

```ts
            content:
              'Return ONLY a JSON chip layout (die shape, a theme from ' +
              'neon/retro/military/keynote/mono, and blocks with fractional x,y,w,h in [0,1]) ' +
              `for this surreal chip idea: ${input.prompt}`,
```

> Leave `required` as-is (`['dieShape', 'blocks']`) — theme is optional and the mapper defaults it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test --workspace server -- aiFakeProvider aiAnthropicProvider aiRoutes`
Expected: PASS. Then `npm run typecheck --workspace server` and `npm test --workspace server` for no regression.

- [ ] **Step 6: Commit**

```bash
git add server/src/ai/fakeProvider.ts server/src/ai/anthropicProvider.ts server/test/aiFakeProvider.test.ts server/test/aiAnthropicProvider.test.ts server/test/aiRoutes.test.ts
git commit -m "feat(v8): AI draft theme through fake + anthropic providers and generate-draft"
```

---

### Task 5: Client `aiDraftApi`

**Files:**
- Create: `src/features/projects/aiDraftApi.ts`
- Test: `src/features/projects/aiDraftApi.test.ts`

**Interfaces:**
- Consumes: `Project` (`src/domain/project.ts`), `AiApiError`/`AiServerUnreachableError` (reused from `src/features/specs/aiCopyApi.ts`, M1).
- Produces: `type AiDraftApi = { generateDraft(prompt: string): Promise<Project> }`; `const liveAiDraftApi: AiDraftApi`. Used by Task 6.

- [ ] **Step 1: Write the failing test**

Create `src/features/projects/aiDraftApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
import { liveAiDraftApi } from './aiDraftApi'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('liveAiDraftApi.generateDraft', () => {
  it('POSTs the prompt and returns the project on success', async () => {
    const project = createProject('Prompted', 'p1', 0)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ project }), { status: 200 }),
    )
    const result = await liveAiDraftApi.generateDraft('a neon chip')
    expect(result).toEqual(project)
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/ai/generate-draft')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ prompt: 'a neon chip' })
  })

  it('maps an error body to AiApiError with its code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'too many' } }), {
        status: 429,
      }),
    )
    await expect(liveAiDraftApi.generateDraft('x')).rejects.toMatchObject({
      name: 'AiApiError',
      code: 'QUOTA_EXCEEDED',
    })
  })

  it('throws AiServerUnreachableError when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    await expect(liveAiDraftApi.generateDraft('x')).rejects.toBeInstanceOf(AiServerUnreachableError)
  })

  it('throws AiServerUnreachableError on a gateway status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    await expect(liveAiDraftApi.generateDraft('x')).rejects.toBeInstanceOf(AiServerUnreachableError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/projects/aiDraftApi.test.ts`
Expected: FAIL — cannot resolve `./aiDraftApi`.

- [ ] **Step 3: Write the api client**

Create `src/features/projects/aiDraftApi.ts`:

```ts
import type { Project } from '../../domain/project'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'

export type AiDraftApi = {
  generateDraft: (prompt: string) => Promise<Project>
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

export const liveAiDraftApi: AiDraftApi = {
  async generateDraft(prompt) {
    let res: Response
    try {
      res = await fetch('/api/ai/generate-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
    } catch {
      throw new AiServerUnreachableError()
    }
    if (GATEWAY_ERROR_STATUSES.has(res.status)) throw new AiServerUnreachableError()
    if (!res.ok) throw await toApiError(res)
    const body = (await res.json()) as { project: Project }
    return body.project
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/projects/aiDraftApi.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/aiDraftApi.ts src/features/projects/aiDraftApi.test.ts
git commit -m "feat(v8): client aiDraftApi (generate-draft + reused AI error types)"
```

---

### Task 6: Dashboard prompt control + App wiring

**Files:**
- Modify: `src/features/projects/ProjectDashboard.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/features/projects/ProjectDashboard.test.tsx` (append cases)

**Interfaces:**
- Consumes: `liveAiDraftApi` (Task 5), `store.createFromAiDraft` (Task 3), `AiApiError`/`AiServerUnreachableError` (`src/features/specs/aiCopyApi.ts`).
- Produces: `ProjectDashboard` gains a `generateAiChip: (prompt: string) => Promise<Project>` prop and a prompt control; `App`'s `DashboardRoute` wires it.

- [ ] **Step 1: Write the failing test**

Append to `src/features/projects/ProjectDashboard.test.tsx` (inside `describe('ProjectDashboard', …)`):

```ts
  it('generates a chip from a prompt and navigates on success', async () => {
    const generateAiChip = vi.fn().mockResolvedValue(createProject('AI Chip', 'ai-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          generateAiChip={generateAiChip}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByPlaceholderText(/describe a chip/i), 'a calm mono chip')
    await userEvent.click(screen.getByRole('button', { name: /generate with ai/i }))

    expect(generateAiChip).toHaveBeenCalledWith('a calm mono chip')
  })

  it('shows an inline message and creates no project when generation fails', async () => {
    const generateAiChip = vi
      .fn()
      .mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many'))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          generateAiChip={generateAiChip}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByPlaceholderText(/describe a chip/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: /generate with ai/i }))

    expect(await screen.findByText(/daily ai limit/i)).toBeInTheDocument()
  })
```

Add the `AiApiError` import to the test file's imports:

```ts
import { AiApiError } from '../specs/aiCopyApi'
```

> Note: the existing `ProjectDashboard` tests construct the component without `generateAiChip`; add `generateAiChip={vi.fn()}` to each of those existing render calls so they keep typechecking. (There are render calls in the empty-state, first-run, blank-project, and any other existing cases — add the prop to all of them.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/projects/ProjectDashboard.test.tsx`
Expected: FAIL — `generateAiChip` not a prop / no prompt control rendered.

- [ ] **Step 3: Add the prompt control to the dashboard**

In `src/features/projects/ProjectDashboard.tsx`:

1. Update the imports at the top:

```ts
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import type { Project } from '../../domain/project'
import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'
import { MiniChipPreview } from './MiniChipPreview'
import { chipFinishLabel } from '../../visual/themeFinish'
import { PresetCard } from './PresetCard'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
```

2. Add `generateAiChip` to `Props` (after `remixPreset`):

```ts
  generateAiChip: (prompt: string) => Promise<Project>
```

3. Add it to the destructured params (after `remixPreset`):

```ts
  generateAiChip,
```

4. Add an error mapper above the component and the handler/state inside it. Above the `export function ProjectDashboard`:

```ts
function messageForAiError(error: unknown): string {
  if (error instanceof AiServerUnreachableError) return 'AI server is unreachable. Try again later.'
  if (error instanceof AiApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        return 'Sign in to use AI generation.'
      case 'QUOTA_EXCEEDED':
        return 'Daily AI limit reached. Try again tomorrow.'
      case 'AI_UNAVAILABLE':
        return "The AI couldn't generate a chip right now."
      default:
        return error.message
    }
  }
  return 'Something went wrong generating a chip.'
}
```

Inside the component, after `const starterPresets = …`:

```ts
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading'>('idle')
  const [aiError, setAiError] = useState<string | null>(null)

  async function startAiChip() {
    const trimmed = aiPrompt.trim()
    if (trimmed === '') return
    setAiStatus('loading')
    setAiError(null)
    try {
      const project = await generateAiChip(trimmed)
      navigate(`/editor/${project.id}`)
    } catch (error) {
      setAiError(messageForAiError(error))
      setAiStatus('idle')
    }
  }
```

5. Render the control. In the `v2-action-row` (right after the `Random Chip` button), add the prompt field, button, and inline error:

```tsx
            <button className="v2-button" onClick={startRandomProject}>
              Random Chip
            </button>
            <input
              className="v2-ai-prompt"
              aria-label="AI chip prompt"
              placeholder="Describe a chip…"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
            />
            <button
              className="v2-button"
              onClick={startAiChip}
              disabled={aiStatus === 'loading' || aiPrompt.trim() === ''}
            >
              {aiStatus === 'loading' ? 'Generating…' : 'Generate with AI'}
            </button>
```

And immediately after the closing `</div>` of `v2-action-row`, render the error message:

```tsx
          {aiError !== null && <p className="v2-ai-error">{aiError}</p>}
```

- [ ] **Step 4: Wire the dashboard in App**

In `src/app/App.tsx`:

1. Add the import near the other feature imports:

```ts
import { liveAiDraftApi } from '../features/projects/aiDraftApi'
```

2. In `DashboardRoute`, pass `generateAiChip` (after `remixPreset={store.remixPreset}`):

```tsx
      remixPreset={store.remixPreset}
      generateAiChip={async (prompt) => store.createFromAiDraft(await liveAiDraftApi.generateDraft(prompt))}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:client -- src/features/projects/ProjectDashboard.test.tsx`
Expected: PASS (existing + 2 new). Then `npm run test:client` once for no regression (App route typechecks via the build/lint gate in Task 7).

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/ProjectDashboard.tsx src/app/App.tsx src/features/projects/ProjectDashboard.test.tsx
git commit -m "feat(v8): dashboard prompt -> generate -> save -> open in editor"
```

---

### Task 7: Gates, browser QA, docs, milestone status

**Files:**
- Modify: `implementation.md` (append a dated V8-M2 entry, Korean)
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

Document the interactive prompt → generate → editor flow (sign in, type a vibe prompt on the dashboard, click Generate with AI, confirm a new project opens in the editor with the AI-chosen theme; stop the server and confirm the inline error with no project created) as **owner-manual / pending** in both docs. Do not run a browser session or claim it was performed; the automated gates + fake-provider tests are the evidence at this checkpoint.

- [ ] **Step 4: Record the V8-M2 outcome in `implementation.md`**

Append a `## V8-M2 Prompt → Chip Layout (2026-06-20)` section (Korean, matching the file's style): the `AiChipDraft.theme` enrichment applied by `mapAiDraftToProject` (valid-or-default, valid-project guarantee unchanged); pure `materializeAiDraftProject` (migrate + fresh-id clone, name preserved, no `remixedFrom`); `projectStore.createFromAiDraft`; the fake (prompt-derived theme) + anthropic (`DRAFT_SCHEMA` theme enum) providers and the generate-draft route reflecting the theme — **reusing M0's endpoint/quota/log, no new migration**; client `aiDraftApi` (reusing M1's AI error types) + the dashboard prompt control wired through `App` (save → navigate, inline error on failure, no project created); local-first/degradation; key server-only; final gate counts; browser QA owner-manual/pending.

- [ ] **Step 5: Update `CLAUDE.md`**

In the `### v8 AI-Assisted Creation` Milestone Status block, add a **V8-M2** line summarizing the above and pointing to the spec (`docs/superpowers/specs/2026-06-20-v8-m2-prompt-chip-layout-design.md`) and this plan. Update the Working Context v8 bullet to note M2 is done (signature feature: dashboard vibe prompt → server generate-draft → AI-chosen theme → fresh local project opened in the editor; reuses M0 endpoint/quota; no schema/migration change; local-first unchanged; browser QA pending owner-manual).

- [ ] **Step 6: Commit**

```bash
git add -f implementation.md CLAUDE.md
git commit -m "docs(v8): record v8-M2 prompt -> chip layout"
```

---

## Self-Review

**1. Spec coverage:**
- Draft shape enriched with `theme`, applied valid-or-default → Task 1. ✅
- Local save reusing the remix-import clone pattern, name preserved, no `remixedFrom` → Tasks 2, 3. ✅
- Providers emit/accept theme (fake prompt-derived, anthropic schema enum); route reflects theme → Task 4. ✅
- Client `aiDraftApi` reusing M1 error types → Task 5. ✅
- Dashboard prompt control next to Random Chip, save → navigate, inline error, no project on failure → Task 6. ✅
- No new endpoint/migration, shared quota, key server-only, no schema bump → Global Constraints + Tasks 1/4 (reuse M0 route). ✅
- Gates green, key-leak check, browser QA owner-manual, docs → Task 7. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" — every code step shows full code. The one runtime-dependent spot (anthropic schema binding) carries a "re-consult `claude-api`" note plus a mock-based test that doesn't depend on the live type. Doc/test counts in Task 7 are runtime-filled by design.

**3. Type consistency:** `AiChipDraft.theme?: StyleTheme` (Task 1) is read by the mapper (Task 1) and emitted by both providers (Task 4). `materializeAiDraftProject(snapshot, id, now): Project` (Task 2) is consumed by `projectStore.createFromAiDraft(snapshot): Promise<Project>` (Task 3), which is consumed by `App`'s `generateAiChip` wiring (Task 6). `liveAiDraftApi.generateDraft(prompt): Promise<Project>` (Task 5) is composed with `createFromAiDraft` in Task 6. `AiApiError`/`AiServerUnreachableError` are imported from `src/features/specs/aiCopyApi.ts` (M1) in Tasks 5 and 6 — same classes, so the dashboard's `instanceof` mapping matches what `aiDraftApi` throws. The `generateAiChip: (prompt: string) => Promise<Project>` prop name/signature is consistent between `ProjectDashboard` (Task 6) and the `App` wiring (Task 6).

## Notes

- The server endpoint, quota, prompt log, and provider selection are all **reused from M0** — M2 adds no route, no migration, and no quota change. The only server edits are the additive `theme` on the two providers (Task 4).
- `materializeAiDraftProject` deliberately runs `migrateProject` even though the server already produced a valid v5 Project: the snapshot crosses the network, and the client persists it, so the client re-validates exactly as `importRemixedProject` does for gallery snapshots (defense in depth).
- The dashboard control catches errors **before** navigating, so a failed/refused generation leaves the user on the dashboard with an inline message and no project created — satisfying the graceful-degradation gate.
- If the `v2-ai-prompt` / `v2-ai-error` class names need styling, that is cosmetic CSS in the existing dashboard stylesheet; the functional gate does not depend on it. Match the surrounding `v2-*` button styles if adding rules.
