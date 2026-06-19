# v7-M5 Gallery / Share Integration + Performance Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the existing 3D showcase on the gallery detail page (interactive, lazy, snapshot-derived), link to it from the server-rendered share viewer, and add a pure capability/performance budget that falls back to the static poster — with no schema/API/upload change.

**Architecture:** The editor's in-component showcase glue (model derivation, WebGL guard, error boundary, lazy `Chip3DViewer`, modal a11y) is extracted into a shared presentational `src/three/Chip3DShowcase.tsx`. The editor and the gallery become thin consumers of it; the editor passes a `renderExtras` render-prop to mount its export panel, the gallery stays view-only. A new pure `resolveChip3DRenderMode` helper centralizes the interactive-vs-poster decision. The share viewer gains one static anchor to the gallery page.

**Tech Stack:** React + TypeScript, Three.js (lazy-loaded only inside `Chip3DViewer`), Vitest + React Testing Library, Hono server-rendered share HTML.

## Global Constraints

- Node.js `20.19+` or `22.12+`.
- `three` stays **lazy-loaded / code-split**; it must NOT enter the gallery route's initial chunk. Only `src/three/Chip3DViewer.tsx` imports `three`, behind `lazy(() => import('./Chip3DViewer'))`.
- **No schema / migration / API / upload change.** The gallery already returns the published snapshot; the `Chip3DModel` is derived client-side.
- Konva 2D PNG export contract unchanged (die `pixelRatio:4`, poster `3200x1800`); export stages untouched.
- `src/domain/` and `src/visual/chip3d/chip3dBudget.ts` stay pure: no React/Three/Konva/IndexedDB/browser imports.
- Server-rendered `/s/:slug` share boundary preserved: no client JS, no Three on the share route; OG/poster/crawler output unchanged except the one added link.
- The gallery showcase is **view-only** (orbit + play/pause + reset; no `VideoExportPanel`).
- Tests use explicit `import { describe, expect, it, vi } from 'vitest'` (no globals). Konva/Three rendering is browser-verified, not unit-tested (jsdom lacks canvas).
- Each task ends green on `npm test` and is committed. The milestone closes green on `npm test`, `npm run build`, `npm run typecheck --workspace server`, and lint.

---

### Task 1: Pure render-mode budget helper

**Files:**
- Create: `src/visual/chip3d/chip3dBudget.ts`
- Test: `src/visual/chip3d/chip3dBudget.test.ts`

**Interfaces:**
- Consumes: nothing (pure, standalone).
- Produces: `type Chip3DRenderMode = 'interactive' | 'poster'`; `const CHIP_3D_PIECE_BUDGET = 400`; `resolveChip3DRenderMode(input: { pieceCount: number; webglAvailable: boolean }): Chip3DRenderMode`. Used by Task 2's `Chip3DShowcase`.

- [ ] **Step 1: Write the failing test**

Create `src/visual/chip3d/chip3dBudget.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  CHIP_3D_PIECE_BUDGET,
  resolveChip3DRenderMode,
} from './chip3dBudget'

describe('resolveChip3DRenderMode', () => {
  it('falls back to the poster when WebGL is unavailable', () => {
    expect(resolveChip3DRenderMode({ pieceCount: 10, webglAvailable: false })).toBe('poster')
  })

  it('renders interactively within the piece budget when WebGL is available', () => {
    expect(resolveChip3DRenderMode({ pieceCount: 10, webglAvailable: true })).toBe('interactive')
  })

  it('treats the budget boundary as still interactive', () => {
    expect(
      resolveChip3DRenderMode({ pieceCount: CHIP_3D_PIECE_BUDGET, webglAvailable: true }),
    ).toBe('interactive')
  })

  it('falls back to the poster when the chip exceeds the piece budget', () => {
    expect(
      resolveChip3DRenderMode({ pieceCount: CHIP_3D_PIECE_BUDGET + 1, webglAvailable: true }),
    ).toBe('poster')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/visual/chip3d/chip3dBudget.test.ts`
Expected: FAIL — cannot resolve `./chip3dBudget`.

- [ ] **Step 3: Write minimal implementation**

Create `src/visual/chip3d/chip3dBudget.ts`:

```ts
export type Chip3DRenderMode = 'interactive' | 'poster'

// Mesh count is the dominant 3D cost driver: every package/die/block piece is one
// mesh. A chip beyond this many pieces falls back to the static poster. The die
// polygon is a single piece, so segment count is negligible and intentionally omitted.
export const CHIP_3D_PIECE_BUDGET = 400

export function resolveChip3DRenderMode(input: {
  pieceCount: number
  webglAvailable: boolean
}): Chip3DRenderMode {
  if (!input.webglAvailable) return 'poster'
  if (input.pieceCount > CHIP_3D_PIECE_BUDGET) return 'poster'
  return 'interactive'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/visual/chip3d/chip3dBudget.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/visual/chip3d/chip3dBudget.ts src/visual/chip3d/chip3dBudget.test.ts
git commit -m "feat(v7): pure 3D render-mode budget helper"
```

---

### Task 2: Extract shared `Chip3DShowcase`; editor becomes a thin consumer

This is a refactor guarded by the **existing** `Chip3DPreviewToggle.test.tsx` (it must stay green) plus the new budget wiring from Task 1. No behavior change for the editor.

**Files:**
- Create: `src/three/Chip3DShowcase.tsx`
- Modify: `src/features/editor/Chip3DPreviewToggle.tsx` (replace the in-file `Chip3DShowcase`/`ShowcaseErrorBoundary`/`webglAvailable` with a thin wrapper)
- Test (existing, must stay green): `src/features/editor/Chip3DPreviewToggle.test.tsx`

**Interfaces:**
- Consumes: `resolveChip3DRenderMode` (Task 1); `buildChip3DModel`, `Chip3DModel` from `../visual/chip3d/chip3dModel`; `resolveChip3DStyle` from `../visual/chip3d/chip3dMaterials`; `buildChipLayers` from `../visual/chipLayers`; lazy `./Chip3DViewer`.
- Produces: `export function Chip3DShowcase({ project, onClose, renderExtras }: { project: Project; onClose: () => void; renderExtras?: (model: Chip3DModel) => ReactNode })`; `export function webglAvailable(): boolean`. Both used by Task 3's gallery page.

- [ ] **Step 1: Confirm the existing editor tests pass before refactoring**

Run: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx`
Expected: PASS (7 tests). This suite is the regression guard for the extraction.

- [ ] **Step 2: Create the shared showcase component**

Create `src/three/Chip3DShowcase.tsx`:

```tsx
import { Component, lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { Project } from '../domain/project'
import { buildChip3DModel, type Chip3DModel } from '../visual/chip3d/chip3dModel'
import { resolveChip3DStyle } from '../visual/chip3d/chip3dMaterials'
import { buildChipLayers } from '../visual/chipLayers'
import { resolveChip3DRenderMode } from '../visual/chip3d/chip3dBudget'

const Chip3DViewer = lazy(() => import('./Chip3DViewer'))

class ShowcaseErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The modal remains usable; a future telemetry layer can report this.
  }

  render() {
    return this.state.failed ? <p>3D showcase failed to load.</p> : this.props.children
  }
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function Chip3DShowcase({
  project,
  onClose,
  renderExtras,
}: {
  project: Project
  onClose: () => void
  renderExtras?: (model: Chip3DModel) => ReactNode
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const model = useMemo(
    () => buildChip3DModel(buildChipLayers(project), project.die, resolveChip3DStyle(project.theme)),
    [project],
  )
  const interactive =
    resolveChip3DRenderMode({
      pieceCount: model.pieces.length,
      webglAvailable: webglAvailable(),
    }) === 'interactive'

  return (
    <section
      aria-label={`${project.name} 3D showcase`}
      aria-modal="true"
      className="chip-3d-showcase"
      role="dialog"
    >
      <header className="chip-3d-showcase__header">
        <div>
          <p className="editor-kicker">Derived from the active 2D project</p>
          <h2>{project.name}</h2>
        </div>
        {interactive && renderExtras ? renderExtras(model) : null}
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          Close 3D showcase
        </button>
      </header>
      {interactive ? (
        <ShowcaseErrorBoundary>
          <Suspense fallback={<p>Loading 3D showcase…</p>}>
            <Chip3DViewer model={model} />
          </Suspense>
        </ShowcaseErrorBoundary>
      ) : (
        <p>3D is not available in this browser.</p>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Replace the editor toggle with a thin wrapper**

Overwrite `src/features/editor/Chip3DPreviewToggle.tsx` with:

```tsx
import { useState } from 'react'
import type { Project } from '../../domain/project'
import { Chip3DShowcase } from '../../three/Chip3DShowcase'
import { VideoExportPanel } from '../export/VideoExportPanel'

export default function Chip3DPreviewToggle({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="editor-showcase-button" type="button" onClick={() => setOpen(true)}>
        Open 3D showcase
      </button>
      {open ? (
        <Chip3DShowcase
          project={project}
          onClose={() => setOpen(false)}
          renderExtras={(model) => <VideoExportPanel model={model} name={project.name} />}
        />
      ) : null}
    </>
  )
}
```

- [ ] **Step 4: Run the editor + full client suite to verify the refactor is behavior-preserving**

Run: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx`
Expected: PASS (7 tests) — the existing tests now exercise the shared component through the editor wrapper. The `vi.mock('../../three/Chip3DViewer', …)` in that test still intercepts the dynamic `./Chip3DViewer` import (same resolved module), and the WebGL-unavailable test still renders "3D is not available in this browser."

Then run: `npm run test:client`
Expected: PASS (full client suite, no regressions).

- [ ] **Step 5: Commit**

```bash
git add src/three/Chip3DShowcase.tsx src/features/editor/Chip3DPreviewToggle.tsx
git commit -m "refactor(v7): extract shared Chip3DShowcase; budget-gate the viewer"
```

---

### Task 3: Gallery detail "View in 3D"

**Files:**
- Modify: `src/features/gallery/GalleryDetailPage.tsx`
- Test: `src/features/gallery/GalleryDetailPage.test.tsx`

**Interfaces:**
- Consumes: `Chip3DShowcase`, `webglAvailable` from `../../three/Chip3DShowcase` (Task 2). The loaded `chip.project` (a `Project`) is passed straight in; the gallery omits `renderExtras` (view-only).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Add to `src/features/gallery/GalleryDetailPage.test.tsx`. First, add a module mock for the viewer near the top of the file (after the imports, before the `describe`), and a new test inside the existing `describe`:

```tsx
vi.mock('../../three/Chip3DViewer', () => ({
  default: ({ model }: { model: { pieces: unknown[] } }) => (
    <div data-testid="mock-viewer">pieces:{model.pieces.length}</div>
  ),
}))
```

```tsx
it('opens an interactive 3D showcase from the gallery detail page', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
  const user = userEvent.setup()
  render(
    <AuthStoreProvider api={fakeAuthApi()}>
      <MemoryRouter initialEntries={['/gallery/ada-chip-deadbeef']}>
        <Routes>
          <Route
            path="/gallery/:slug"
            element={<GalleryDetailPage api={fakeApi()} reactions={fakeReactions()} />}
          />
        </Routes>
      </MemoryRouter>
    </AuthStoreProvider>,
  )

  await user.click(await screen.findByRole('button', { name: 'View in 3D' }))

  expect(await screen.findByRole('dialog', { name: 'Ada Chip 3D showcase' })).toBeInTheDocument()
  expect(await screen.findByTestId('mock-viewer')).toBeInTheDocument()
})
```

> Note: confirm `userEvent`, `MemoryRouter`, `Routes`, `Route`, `AuthStoreProvider`, `fakeApi`, `fakeAuthApi`, and `fakeReactions` are already imported/defined in this test file (they are, per the existing tests). If `userEvent` is not imported, add `import userEvent from '@testing-library/user-event'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/gallery/GalleryDetailPage.test.tsx`
Expected: FAIL — no "View in 3D" button exists yet.

- [ ] **Step 3: Wire the button + modal into the gallery page**

In `src/features/gallery/GalleryDetailPage.tsx`:

1. Add the import after the existing `Project` import:

```tsx
import { Chip3DShowcase, webglAvailable } from '../../three/Chip3DShowcase'
```

2. Add the state next to the other `useState` calls (near `const [draft, setDraft] = useState('')`):

```tsx
const [show3D, setShow3D] = useState(false)
```

3. In the slug-change reset block, add `setShow3D(false)` alongside the other resets:

```tsx
  if (loadedSlug !== slug) {
    setLoadedSlug(slug)
    setChip('loading')
    setLikeState(null)
    setReported(false)
    setActionError(null)
    setComments([])
    setLineage(null)
    setDraft('')
    setShow3D(false)
  }
```

4. In the loaded hero copy block, add the button immediately after the existing "Remix into my projects" `</button>`:

```tsx
          {webglAvailable() && (
            <button type="button" className="v2-inline-action" onClick={() => setShow3D(true)}>
              View in 3D
            </button>
          )}
```

5. Render the showcase at the very end of the returned `<main>`, immediately before its closing `</main>` tag:

```tsx
      {show3D && <Chip3DShowcase project={chip.project} onClose={() => setShow3D(false)} />}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/gallery/GalleryDetailPage.test.tsx`
Expected: PASS (existing tests + the new one).

- [ ] **Step 5: Commit**

```bash
git add src/features/gallery/GalleryDetailPage.tsx src/features/gallery/GalleryDetailPage.test.tsx
git commit -m "feat(v7): View in 3D showcase on gallery detail (view-only, lazy)"
```

---

### Task 4: Share viewer "View in 3D" link

**Files:**
- Modify: `server/src/share/viewer.ts:104-107` (the `cta` block in `renderViewerHtml`)
- Test: `server/test/shareHelpers.test.ts`

**Interfaces:**
- Consumes: existing `baseUrl`, `slug`, `escapeHtml` already in scope in `renderViewerHtml`.
- Produces: nothing downstream. The link targets `/gallery/:slug` (where the interactive 3D lives). No client JS added.

- [ ] **Step 1: Write the failing test**

Add to `server/test/shareHelpers.test.ts`, inside the existing `describe('renderViewerHtml', …)` block:

```ts
  it('links to the gallery 3D showcase from the share viewer', () => {
    const html = renderViewerHtml({
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      slug: 'ada-chip-deadbeef',
      project: sampleProject,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).toContain('View in 3D')
    expect(html).toContain('href="https://chips.example.com/gallery/ada-chip-deadbeef"')
  })
```

> Note: reuse the same `renderViewerHtml(...)` argument shape as the existing tests in this file. If those tests build the project via a shared `sampleProject`/inline object, match that name; otherwise copy the inline `project` object from the adjacent OG-meta test in the same `describe`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- shareHelpers`
Expected: FAIL — "View in 3D" not present in the rendered HTML.

- [ ] **Step 3: Add the link to the CTA block**

In `server/src/share/viewer.ts`, change the `cta` paragraph from:

```ts
  <p class="cta">
    <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(slug)}">Remix this chip</a>
    <a href="${escapeHtml(baseUrl)}/">Open the Lab</a>
  </p>
```

to:

```ts
  <p class="cta">
    <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(slug)}">Remix this chip</a>
    <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(slug)}">View in 3D</a>
    <a href="${escapeHtml(baseUrl)}/">Open the Lab</a>
  </p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- shareHelpers`
Expected: PASS, including the new assertion. The OG/poster meta assertions are unaffected.

- [ ] **Step 5: Commit**

```bash
git add server/src/share/viewer.ts server/test/shareHelpers.test.ts
git commit -m "feat(v7): link the share viewer to the gallery 3D showcase"
```

---

### Task 5: Milestone close-out — gates, bundle check, docs, M4 drop record

**Files:**
- Modify: `implementation.md` (Korean running log)
- Modify: `CLAUDE.md` (Milestone Status)
- Modify: `docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md` (mark M4 dropped, M5 done)

**Interfaces:** none (documentation + verification only).

- [ ] **Step 1: Run all gates**

```bash
npm test
npm run build
npm run typecheck --workspace server
npm run lint
```
Expected: all green. Record the client/server file+test counts from `npm test` output for the docs.

- [ ] **Step 2: Verify `three` stays code-split out of the gallery route**

Run: `npm run build 2>&1 | grep -iE 'Chip3DViewer|index'`
Expected: a separate lazy `Chip3DViewer-*.js` chunk is emitted, and the core `index-*.js` chunk does not balloon (consistent with M1–M3, where `three` lives only in the lazy viewer chunk). `GalleryDetailPage` statically imports only `Chip3DShowcase` (no `three`), so the gallery route's initial chunk stays Three-free. Record the chunk size.

- [ ] **Step 3: Record the M5 outcome + M4 drop in `implementation.md`**

Append a new dated section (Korean, matching the file's style) covering: the shared `Chip3DShowcase` extraction; gallery "View in 3D" (view-only, lazy, snapshot-derived, no schema change); the share viewer gallery link; the pure `resolveChip3DRenderMode` budget + poster fallback; the final gate counts and the lazy `Chip3DViewer` chunk size. In the same entry, record the **v7-M4 drop**: shader-grade 2D enhancement was not built because M1–M3 closed the 2D/3D gap and any export-visible effect would still need Konva re-implementation (PixiJS rejected); cite the spec's "v7-M4 disposition" section.

- [ ] **Step 4: Update `CLAUDE.md` Milestone Status**

Under "### v7 Visual Depth", add two entries after the existing **V7-M3** line:

- A **V7-M4** line: "✅ dropped (recorded decision) — optional shader-grade 2D enhancement not built; M1–M3 closed the 2D/3D gap and any export-visible effect would need Konva re-implementation (PixiJS rejected, no new dep). Recorded in the M5 spec's 'v7-M4 disposition' section + `implementation.md`."
- A **V7-M5** line: "✅ done — shared `Chip3DShowcase` (`src/three/`) extracted from the editor toggle; gallery detail gains a lazy, snapshot-derived, view-only 'View in 3D' modal; server-rendered share viewer links to `/gallery/:slug`; pure `resolveChip3DRenderMode` budget falls back to the static poster when WebGL is absent or the chip exceeds `CHIP_3D_PIECE_BUDGET`. No schema/migration/API/upload change; `three` stays code-split out of the gallery route. Final gates: client/server counts <fill from Step 1>, build/typecheck/lint green. Spec: `docs/superpowers/specs/2026-06-19-v7-m5-gallery-share-integration-design.md`; plan: this file."

Also update the top-of-file "Working Context" v7 bullet to note M0–M5 complete (M4 dropped).

- [ ] **Step 5: Update the detailed-plans doc**

In `docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md`, in the "v7-M4" section header add "— **DROPPED** (recorded decision; see `2026-06-19-v7-m5-…-design.md`)", and in the "v7-M5" section add a one-line "**Resolved:** interactive snapshot-derived gallery viewer + share link, no stored video; see the M5 spec/plan."

- [ ] **Step 6: Commit**

```bash
git add -f implementation.md CLAUDE.md docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md
git commit -m "docs(v7): close out M5 gallery/share 3D integration; record M4 drop"
```

> Browser QA (manual, before any branch integration — record in the plan or `docs/ops/3d-showcase-qa.md`): on a real published chip, gallery "View in 3D" renders identically to the editor showcase; a WebGL-disabled session hides the gallery button and keeps the poster; the share page "View in 3D" link resolves to the correct `/gallery/:slug`; the editor showcase + MP4 export panel are unchanged after the extraction.

---

## Self-Review

**Spec coverage:**
- Interactive snapshot-derived gallery viewer → Task 3. ✅
- Shared `Chip3DShowcase` extraction (editor + gallery thin consumers; view-only gallery via `renderExtras`) → Task 2. ✅
- Share viewer link to gallery, server-rendered boundary preserved → Task 4. ✅
- Pure performance/capability budget + interactive→poster fallback → Task 1 (logic) + Tasks 2/3 (wiring). ✅
- No schema/API/upload change; `three` code-split out of the gallery route → Global Constraints + Task 5 Step 2 verification. ✅
- v7-M4 drop recorded → Task 5 Steps 3–5. ✅
- Gates + docs → Task 5. ✅

**Placeholder scan:** No "TBD"/"add error handling"/"similar to" placeholders; every code step shows complete code. The two `> Note:` blocks point at concrete existing fixtures to match, not unspecified work.

**Type consistency:** `resolveChip3DRenderMode({ pieceCount, webglAvailable })` and `CHIP_3D_PIECE_BUDGET` (Task 1) are used verbatim in Task 2. `Chip3DShowcase({ project, onClose, renderExtras })` and `webglAvailable()` (Task 2) are imported/used verbatim in Task 3. `model.pieces` matches the `Chip3DModel.pieces` field in `chip3dModel.ts`. Editor wrapper's `renderExtras={(model) => <VideoExportPanel model={model} name={project.name} />}` matches `VideoExportPanel`'s existing `{ model, name }` usage.
