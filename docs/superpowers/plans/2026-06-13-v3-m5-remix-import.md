# V3-M5 Remix Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a viewer import a gallery/share published chip into a fresh, independent local project (migrate-on-import, new id/name/timestamps) and open it in the editor — completing the v3 share loop.

**Architecture:** A pure domain function `importRemixedProject` migrates the snapshot and clones it into a new independent `Project`. `projectStore.remixImport` persists it like `remixPreset`. The gallery detail page (which already carries the snapshot) gets a "Remix into my projects" button; App wires `store.remixImport` + navigation. The server share viewer's placeholder CTA becomes a real link to `/gallery/:slug`. No new server endpoint and no schema change.

**Tech Stack:** React + TypeScript, Zustand vanilla store, Vitest + Testing Library, shared `@domain/*`. Server: Hono share viewer (HTML string).

---

## File Structure

**New (client):**
- `src/domain/remixImport.ts` — pure `importRemixedProject(snapshot, id, now)`.
- `src/domain/remixImport.test.ts` — unit tests.

**Modified (client):**
- `src/stores/projectStore.ts` — add `remixImport` action.
- `src/stores/projectStore.test.ts` — store test.
- `src/features/gallery/GalleryDetailPage.tsx` — `onRemix` prop + remix button.
- `src/features/gallery/GalleryDetailPage.test.tsx` — button test.
- `src/app/App.tsx` — `GalleryDetailRoute` wires `remixImport` + `useNavigate`.
- `src/app/App.test.tsx` — end-to-end remix wiring test.

**Modified (server):**
- `server/src/share/viewer.ts` — replace remix placeholder with a `/gallery/:slug` link.
- `server/test/shareHelpers.test.ts` — assert the link.

**Docs:**
- `implementation.md`, `CLAUDE.md` — record M5.

---

## Task 1: Domain `importRemixedProject`

**Files:**
- Create: `src/domain/remixImport.ts`
- Test: `src/domain/remixImport.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/remixImport.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from './project'
import { createProject } from './projectFactory'
import { importRemixedProject } from './remixImport'

describe('importRemixedProject', () => {
  it('assigns a fresh id, "<name> Remix" name, and now timestamps', () => {
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const remix = importRemixedProject(snapshot, 'new-id', 5_000)

    expect(remix.id).toBe('new-id')
    expect(remix.name).toBe('Ada Chip Remix')
    expect(remix.createdAt).toBe(5_000)
    expect(remix.updatedAt).toBe(5_000)
    expect(remix.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('produces an independent deep clone (mutating the result never touches the input)', () => {
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const remix = importRemixedProject(snapshot, 'new-id', 5_000)
    remix.die.shape = 'circle'
    remix.spec.features.push('Injected')

    expect(snapshot.die.shape).toBe('rect')
    expect(snapshot.spec.features).not.toContain('Injected')
    expect(snapshot.id).toBe('source-id')
  })

  it('migrates an older-schema snapshot to the current schema', () => {
    const legacy = {
      ...createProject('Legacy Chip', 'old-id', 1_000),
      schemaVersion: 1,
    }
    // Schema 1 predates studio; strip it so the migration must rebuild it.
    delete (legacy as { studio?: unknown }).studio

    const remix = importRemixedProject(legacy, 'new-id', 5_000)

    expect(remix.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(remix.name).toBe('Legacy Chip Remix')
    expect(remix.studio.layoutMode).toBe('global-reflow')
  })

  it('throws on a corrupt snapshot', () => {
    expect(() => importRemixedProject({ not: 'a project' }, 'new-id', 5_000)).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- remixImport`
Expected: FAIL — cannot find module `./remixImport`.

- [ ] **Step 3: Write minimal implementation**

Create `src/domain/remixImport.ts`:

```typescript
import type { Project } from './project'
import { migrateProject } from './projectMigration'

/**
 * Materializes a published-chip snapshot into a fresh, independent local
 * project. The snapshot is migrated to the current schema (it may predate the
 * importer's app version), then deep-cloned with a new identity so editing or
 * republishing the remix never touches the source. No remix-lineage metadata is
 * stored in v3 — lineage trees are a v4 concern.
 */
export function importRemixedProject(snapshot: unknown, id: string, now: number): Project {
  const migrated = migrateProject(snapshot)
  return {
    ...structuredClone(migrated),
    id,
    name: `${migrated.name} Remix`,
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- remixImport`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/remixImport.ts src/domain/remixImport.test.ts
git commit -m "feat(domain): import a published snapshot into an independent local project"
```

---

## Task 2: Store `remixImport` action

**Files:**
- Modify: `src/stores/projectStore.ts`
- Test: `src/stores/projectStore.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/stores/projectStore.test.ts`, add a test inside the top-level `describe('project store', ...)` block (the file already has `createMemoryRepository`; add the `createProject` import at the top if not present — it is imported as a type only, so add a value import):

At the top of the file, ensure this import exists (the file currently imports `type { Project }`; add the factory value import on a new line):

```typescript
import { createProject } from '../domain/projectFactory'
```

Then add the test:

```typescript
  it('imports a published snapshot as an independent local project listed first', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(repository, () => 9_000, () => `import-${n++}`)
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const first = await store.getState().remixImport(snapshot)
    const second = await store.getState().remixImport(snapshot)

    expect(first).toMatchObject({ id: 'import-0', name: 'Ada Chip Remix', createdAt: 9_000 })
    expect(second.id).toBe('import-1')
    expect(store.getState().projects.map((project) => project.id)).toEqual(['import-1', 'import-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- projectStore`
Expected: FAIL — `store.getState().remixImport` is not a function.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/projectStore.ts`, add the import near the other domain imports:

```typescript
import { importRemixedProject } from '../domain/remixImport'
```

Add `remixImport` to the `ProjectState` type, right after `remixPreset`:

```typescript
  remixPreset: (presetId: PresetId) => Promise<Project>
  remixImport: (snapshot: unknown) => Promise<Project>
```

Add the action implementation right after `remixPreset` in the store body:

```typescript
    async remixImport(snapshot) {
      const project = importRemixedProject(snapshot, createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- projectStore`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/projectStore.test.ts
git commit -m "feat(store): add remixImport for materializing snapshots locally"
```

---

## Task 3: GalleryDetailPage remix button

**Files:**
- Modify: `src/features/gallery/GalleryDetailPage.tsx`
- Test: `src/features/gallery/GalleryDetailPage.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/features/gallery/GalleryDetailPage.test.tsx`, update `renderDetail` to accept and pass an `onRemix` prop, then add a test. Replace the existing `renderDetail` function with:

```typescript
function renderDetail(
  api: GalleryApi,
  slug = 'ada-chip-deadbeef',
  onRemix?: (project: GalleryChipDetail['project']) => void,
) {
  return render(
    <MemoryRouter initialEntries={[`/gallery/${slug}`]}>
      <Routes>
        <Route path="/gallery/:slug" element={<GalleryDetailPage api={api} onRemix={onRemix} />} />
      </Routes>
    </MemoryRouter>,
  )
}
```

Add this test inside the `describe('GalleryDetailPage', ...)` block:

```typescript
  it('remixes the loaded chip snapshot into local projects', async () => {
    const onRemix = vi.fn()
    renderDetail(fakeApi(), 'ada-chip-deadbeef', onRemix)

    await userEvent.click(await screen.findByRole('button', { name: /remix into my projects/i }))

    expect(onRemix).toHaveBeenCalledWith(detail.project)
  })

  it('does not show the remix button while loading or offline', async () => {
    renderDetail(fakeApi({ get: vi.fn().mockRejectedValue(new ServerUnreachableError()) }))

    await screen.findByText(/share server is offline/i)
    expect(screen.queryByRole('button', { name: /remix into my projects/i })).not.toBeInTheDocument()
  })
```

Add the `userEvent` import at the top of the file:

```typescript
import userEvent from '@testing-library/user-event'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- GalleryDetailPage`
Expected: FAIL — no "Remix into my projects" button found.

- [ ] **Step 3: Write minimal implementation**

In `src/features/gallery/GalleryDetailPage.tsx`, add `onRemix` to `Props`:

```typescript
type Props = {
  api?: GalleryApi
  onProjectLoaded?: (project: Project) => void
  onRemix?: (project: Project) => void
}
```

Destructure it in the component signature:

```typescript
export function GalleryDetailPage({ api = liveGalleryApi, onProjectLoaded, onRemix }: Props) {
```

In the final loaded-state `return`, add a remix button inside the hero copy block, right after the existing "Back to Gallery" link:

```tsx
          <Link className="v2-inline-action" to="/gallery">
            Back to Gallery
          </Link>
          <button type="button" className="v2-inline-action" onClick={() => onRemix?.(chip.project)}>
            Remix into my projects
          </button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- GalleryDetailPage`
Expected: PASS (existing tests + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/features/gallery/GalleryDetailPage.tsx src/features/gallery/GalleryDetailPage.test.tsx
git commit -m "feat(client): add a remix button to the gallery detail page"
```

---

## Task 4: App wiring (remixImport + navigation)

**Files:**
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/app/App.test.tsx`, add `afterEach` cleanup for stubbed globals and a new end-to-end test. First, update the existing `afterEach` to also unstub globals:

```typescript
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })
```

Add this test inside the `describe('App', ...)` block (it stubs `fetch` URL-aware: the gallery detail resolves, everything else 401s so the auth store settles cleanly):

```typescript
  it('remixes a gallery chip into a new local project and opens the editor', async () => {
    const project = {
      ...(await import('../domain/projectFactory')).createProject('Ada Chip', 'gallery-source', 1_000),
    }
    const detail = {
      id: 'pub1',
      slug: 'ada-chip-deadbeef',
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      dieImageUrl: 'data:image/png;base64,AAAA',
      posterImageUrl: 'data:image/png;base64,BBBB',
      version: 1,
      updatedAt: 2_000,
      publishedAt: 2_000,
      project,
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/gallery/')) {
          return new Response(JSON.stringify({ chip: detail }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'no' } }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      }),
    )

    render(
      <MemoryRouter initialEntries={['/gallery/ada-chip-deadbeef']}>
        <App />
      </MemoryRouter>,
    )

    await userEvent.click(await screen.findByRole('button', { name: /remix into my projects/i }))

    const editor = await screen.findByRole('main', { name: 'Chip editor workspace' })
    expect(editor).toHaveTextContent('Ada Chip Remix')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/app/App.test.tsx`
Expected: FAIL — the remix button click does nothing (no `onRemix` wired), so the editor never renders.

- [ ] **Step 3: Write minimal implementation**

In `src/app/App.tsx`, add `useNavigate` to the react-router import:

```typescript
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
```

Replace the `GalleryDetailRoute` function with one that wires remix import + navigation:

```typescript
function GalleryDetailRoute() {
  const store = useProjectStore()
  const navigate = useNavigate()
  const [, setPageTheme] = usePageTheme()
  const onProjectLoaded = useCallback(
    (project: Project) => {
      const heroSet = resolveHeroSetForProject(project)
      if (heroSet) setPageTheme(heroSet.pageTheme)
    },
    [setPageTheme],
  )
  const onRemix = useCallback(
    async (project: Project) => {
      const remix = await store.remixImport(project)
      navigate(`/editor/${remix.id}`)
    },
    [store, navigate],
  )
  return <GalleryDetailPage onProjectLoaded={onProjectLoaded} onRemix={onRemix} />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/app/App.test.tsx`
Expected: PASS (existing App tests + the new remix flow).

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat(client): wire gallery remix import to the editor route"
```

---

## Task 5: Server share viewer remix CTA

**Files:**
- Modify: `server/src/share/viewer.ts`
- Test: `server/test/shareHelpers.test.ts`

- [ ] **Step 1: Write the failing test**

In `server/test/shareHelpers.test.ts`, add an assertion inside the existing `describe('renderViewerHtml', ...)` block's first test (`renders absolute OG/Twitter meta pointing at the poster endpoint`). Append these two lines before that test's closing `})`:

```typescript
    expect(html).toContain('Remix this chip')
    expect(html).toContain('href="https://chips.example.com/gallery/ada-chip-deadbeef"')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace server -- shareHelpers`
Expected: FAIL — the viewer HTML has no remix link yet.

- [ ] **Step 3: Write minimal implementation**

In `server/src/share/viewer.ts`, in `renderViewerHtml`, replace the CTA line:

```html
  <p class="cta"><a href="${escapeHtml(baseUrl)}/">Open the Lab</a></p>
  <!-- Remix this chip: V3-M5 -->
```

with:

```html
  <p class="cta">
    <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(slug)}">Remix this chip</a>
    <a href="${escapeHtml(baseUrl)}/">Open the Lab</a>
  </p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace server -- shareHelpers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/share/viewer.ts server/test/shareHelpers.test.ts
git commit -m "feat(server): link the share viewer remix CTA to the gallery detail"
```

---

## Task 6: Docs + full verification

**Files:**
- Modify: `implementation.md`, `CLAUDE.md`

- [ ] **Step 1: Run the full suite + build**

Run: `npm test && npm run build`
Expected: client + server suites green; build succeeds (known Vite chunk warning acceptable).

- [ ] **Step 2: Record the milestone in `implementation.md`**

Append a `## V3-M5 리믹스 가져오기 (2026-06-13)` section (Korean, matching the file's style) covering: pure `importRemixedProject` (migrate-on-import + independent deep clone, `{name} Remix`, no schema change); `projectStore.remixImport`; GalleryDetailPage remix button + App wiring to the editor route; server share viewer CTA now links to `/gallery/:slug`; no new server endpoint; lineage/provenance deferred to v4. Note the final suite counts from Step 1.

- [ ] **Step 3: Update `CLAUDE.md` Milestone Status**

Change the combined planned line to mark M5 done and leave M6 planned:

```markdown
- **V3-M5 Remix Import**: ✅ done — pure `importRemixedProject` (migrate-on-import via `migrateProject` + independent `structuredClone`, fresh id/`{name} Remix`/timestamps, no schema change), `projectStore.remixImport`, a "Remix into my projects" button on the gallery detail page wired by App to `remixImport` + editor navigation, and the share viewer's "Remix this chip" CTA now linking to `/gallery/:slug`. No new server endpoint (gallery detail already returns the snapshot); lineage/provenance deferred to v4. Plan: `docs/superpowers/plans/2026-06-13-v3-m5-remix-import.md`.
- **V3-M6 Deploy Packaging & QA**: ⏳ planned (M6 owns rate limiting, Secure cookie flag, production secret enforcement, upload size limits, file-backed PNG storage, and the production `VSL_PUBLIC_BASE_URL`).
```

- [ ] **Step 4: Commit**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record V3-M5 remix import milestone"
```

- [ ] **Step 5: Browser QA (acceptance gate)**

Run the dev servers, publish a chip publicly (or reuse one), then:
1. Open `/gallery/:slug`, click "Remix into my projects" → editor opens with `{title} Remix`.
2. The remix appears first on `/dashboard` and survives a refresh (independent local project).
3. Edit the remix; confirm the original published chip/gallery entry is unchanged.
4. On the server share page `/s/:slug`, the "Remix this chip" link navigates to `/gallery/:slug`.
5. Stop the server → local editing/save/export unaffected.

Record results in `implementation.md`.

---

## Self-Review Notes

- **Spec coverage:** pure import + migrate (Task 1), store action (Task 2), gallery detail entry point (Task 3), App wiring + navigation (Task 4), share viewer CTA deep-link (Task 5), docs + browser QA (Task 6). No new server endpoint and no schema change, as designed.
- **Type consistency:** `importRemixedProject(snapshot, id, now)` and `remixImport(snapshot)` signatures are used identically across tasks; `onRemix?: (project: Project) => void` matches between GalleryDetailPage and App.
- **Out of scope (unchanged here):** remix-lineage tree + `remixedFrom` metadata (v4); gallery list-card remix button; file-backed images / rate limiting / production domain (M6).
