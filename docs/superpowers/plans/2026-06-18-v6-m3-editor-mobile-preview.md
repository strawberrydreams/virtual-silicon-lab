# V6-M3 Editor Read-Only Mobile Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On mobile, `/editor/:id` renders a read-only chip preview (shared artwork render fit to viewport) + fake spec + die/poster export + copy-share-link + a prominent "Edit on desktop" CTA, instead of the unusable Konva authoring shell. Desktop authoring is unchanged.

**Architecture:** A new presentational component `MobileEditorPreview` reuses the existing serializable `Project` data and the shared `ChipArtwork` render (the same path `DieExportStage` uses) on a display-only Konva stage scaled to container width, plus the existing `PublishPanel` (copy share link if published) and `ExportPanel` (die/poster PNG). The route component `EditorRoute` in `App.tsx` branches on `useIsMobile()` **before** mounting `EditorPage`, so the editor's stateful hooks (`useAutosave`, `useEditorShortcuts`, editor store) never mount on mobile and Rules-of-Hooks are respected.

**Tech Stack:** Vite · React + TypeScript · react-konva (display-only stage; not unit-tested) · existing `PublishPanel`/`ExportPanel` · Vitest + React Testing Library (matchMedia mocked, Konva child + panels mocked).

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- **No database schema change, no migration, no new API** (per spec). The mobile preview reads the same local project JSON and **never mutates it**; local-first is preserved.
- The export contract is untouched: the preview stage is **display-only and separate** from the export stages (die `pixelRatio:4`, poster `3200x1800`). `ExportPanel` still owns export via its own offscreen stages.
- Breakpoint is **768px**; `useIsMobile()` (from V6-M0, `src/app/useIsMobile.ts`) is the only JS gate.
- Konva rendering is **not** unit-tested (jsdom lacks canvas). The preview's Konva child is isolated into its own component so component tests can mock it; pure structure (spec text, CTA, panels) is asserted. Full mobile **browser QA + visual gate is folded into V6-M4**.
- `src/domain/` purity and the canvas "no DOM scraping" rule are untouched — the preview composites from `project` data only.
- One concern per commit.

## File Structure

- `src/features/editor/MobileChipPreview.tsx` — **new.** The display-only Konva stage: `<Stage>` sized to the measured container width, scaled by `containerWidth / project.die.width`, rendering `<Layer><ChipArtwork project renderMode="die-only" /></Layer>`. Mirrors `DieExportStage` but for on-screen display, not export. Not unit-tested.
- `src/features/editor/MobileEditorPreview.tsx` — **new.** Composes `MobileChipPreview` + a fake-spec section + `PublishPanel` + `ExportPanel` + the "Edit on desktop" notice. Component-tested (Konva child + panels mocked).
- `src/app/App.tsx` — **modify.** `EditorRoute` branches on `useIsMobile()`.
- `src/styles.css` — **modify.** Add `.mobile-editor-preview*` layout (single-column, centered, comfortable spacing).

---

### Task 1: `MobileChipPreview` — display-only fit-to-width Konva stage

**Files:**
- Create: `src/features/editor/MobileChipPreview.tsx`

**Interfaces:**
- Consumes: `ChipArtwork` from `./canvas/ChipArtwork` (`{ project: Project; renderMode?: 'full' | 'die-only' }`); `Project` from `../../domain/project`.
- Produces: `export function MobileChipPreview({ project }: { project: Project }): JSX.Element` — a div wrapper (`className="mobile-editor-preview__stage"`) containing a Konva `Stage` whose width equals the measured wrapper width and whose height preserves the die aspect ratio, scaled so the die fills the width.

**Why no unit test:** this component only renders a Konva `Stage` (jsdom has no canvas). Per project convention Konva rendering is verified in-browser (V6-M4), and pure structure is kept out of it. Keeping it as its own file lets `MobileEditorPreview`'s test mock it.

- [ ] **Step 1: Write the component**

```tsx
// src/features/editor/MobileChipPreview.tsx
import { useEffect, useRef, useState } from 'react'
import { Layer, Stage } from 'react-konva'
import type { Project } from '../../domain/project'
import { ChipArtwork } from './canvas/ChipArtwork'

// Display-only preview of the chip die for the mobile editor route. It reuses the
// shared ChipArtwork render (same path as DieExportStage) but scales to the
// container width for on-screen display. It is NOT an export stage: the export
// raster contract lives in ExportPanel's own offscreen stages.
export function MobileChipPreview({ project }: { project: Project }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (el === null) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const dieWidth = project.die.width
  const dieHeight = project.die.height
  const scale = width > 0 ? width / dieWidth : 0
  const height = Math.round(dieHeight * scale)

  return (
    <div ref={wrapRef} className="mobile-editor-preview__stage">
      {width > 0 ? (
        <Stage width={width} height={height} scaleX={scale} scaleY={scale}>
          <Layer>
            <ChipArtwork project={project} renderMode="die-only" />
          </Layer>
        </Stage>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck the new file via the build**

Run: `npm run build`
Expected: exit 0 (the file compiles; known chunk warning acceptable). No unit test for this Konva component by project convention.

- [ ] **Step 3: Commit**

```bash
git add src/features/editor/MobileChipPreview.tsx
git commit -m "feat(v6): display-only mobile chip preview stage"
```

---

### Task 2: `MobileEditorPreview` — read-only surface composition

**Files:**
- Create: `src/features/editor/MobileEditorPreview.tsx`
- Test: `src/features/editor/MobileEditorPreview.test.tsx`

**Interfaces:**
- Consumes: `MobileChipPreview` (Task 1); `PublishPanel` from `../publish/PublishPanel` (`{ project }`); `ExportPanel` from `../export/ExportPanel` (`{ project }`); `Project` from `../../domain/project`.
- Produces: `export function MobileEditorPreview({ project }: { project: Project }): JSX.Element` rendering, in order: the preview stage, a fake-spec section (brand/series/generation/process/cores/bandwidth/description/features from `project.spec`), `PublishPanel`, `ExportPanel`, and an "Edit on desktop" notice. The surface is a `<main aria-label="Chip preview">`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/editor/MobileEditorPreview.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createDefaultProject } from '../../domain/project'
import { MobileEditorPreview } from './MobileEditorPreview'

// Konva stage + the publish/export panels are environment-heavy; mock them so the
// test asserts the read-only surface structure (spec + CTA), not canvas rendering.
vi.mock('./MobileChipPreview', () => ({
  MobileChipPreview: () => <div data-testid="mobile-chip-preview" />,
}))
vi.mock('../publish/PublishPanel', () => ({
  PublishPanel: () => <div data-testid="publish-panel" />,
}))
vi.mock('../export/ExportPanel', () => ({
  ExportPanel: () => <div data-testid="export-panel" />,
}))

describe('MobileEditorPreview', () => {
  it('renders the read-only preview, spec, panels, and an edit-on-desktop CTA', () => {
    const project = createDefaultProject('Pocket Chip')
    render(<MobileEditorPreview project={project} />)

    expect(screen.getByTestId('mobile-chip-preview')).toBeInTheDocument()
    expect(screen.getByTestId('publish-panel')).toBeInTheDocument()
    expect(screen.getByTestId('export-panel')).toBeInTheDocument()
    expect(screen.getByText(/edit on desktop/i)).toBeInTheDocument()
    // Spec brand/series surfaced from project.spec
    expect(screen.getByText(project.spec.brand, { exact: false })).toBeInTheDocument()
  })
})
```

> If `createDefaultProject`'s exact name/signature differs, use the same factory the existing editor/export tests import (confirm with `grep -rn "createDefaultProject\|createProject" src/domain`). The assertion contract is: preview + spec + both panels + "Edit on desktop".

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/features/editor/MobileEditorPreview.test.tsx`
Expected: FAIL — cannot resolve `./MobileEditorPreview`.

- [ ] **Step 3: Write the component**

```tsx
// src/features/editor/MobileEditorPreview.tsx
import { Link } from 'react-router-dom'
import type { Project } from '../../domain/project'
import { ExportPanel } from '../export/ExportPanel'
import { PublishPanel } from '../publish/PublishPanel'
import { MobileChipPreview } from './MobileChipPreview'

// Mobile editor route: the Konva authoring canvas is desktop-only, so on phones we
// show a read-only preview of the chip plus its fake spec, share/export actions,
// and a clear path back to desktop. Reads the same project JSON; never mutates it.
export function MobileEditorPreview({ project }: { project: Project }) {
  const spec = project.spec
  return (
    <main aria-label="Chip preview" className="v2-page mobile-editor-preview">
      <div className="mobile-editor-preview__inner">
        <p className="v2-kicker">Concept Fabrication Terminal</p>
        <h1 className="mobile-editor-preview__title">{project.name}</h1>

        <MobileChipPreview project={project} />

        <section className="mobile-editor-preview__spec" aria-label="Fake spec sheet">
          <h2>
            {spec.brand} {spec.series}
          </h2>
          <dl className="gallery-spec__grid">
            <div>
              <dt>Generation</dt>
              <dd>{spec.generation}</dd>
            </div>
            <div>
              <dt>Process</dt>
              <dd>{spec.process}</dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{spec.cores}</dd>
            </div>
            <div>
              <dt>Bandwidth</dt>
              <dd>{spec.bandwidth}</dd>
            </div>
          </dl>
          {spec.description !== '' ? <p>{spec.description}</p> : null}
          {spec.features.length > 0 ? (
            <div className="gallery-spec__features">
              {spec.features.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
          ) : null}
        </section>

        <PublishPanel project={project} />
        <ExportPanel project={project} />

        <section className="mobile-editor-preview__cta" aria-label="Edit on desktop">
          <p>Editing the canvas is a desktop experience. Open this project on a larger screen to design.</p>
          <Link className="v2-button v2-button--muted" to="/dashboard">
            Back to Projects
          </Link>
        </section>
      </div>
    </main>
  )
}
```

> The fake-spec field names (`spec.brand`, `spec.series`, `spec.generation`, `spec.process`, `spec.cores`, `spec.bandwidth`, `spec.description`, `spec.features`) match the `FakeSpec` shape used by the server share viewer (`server/src/share/viewer.ts`). If a field name differs, align to the actual `FakeSpec` type in `src/domain/`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:client -- src/features/editor/MobileEditorPreview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/MobileEditorPreview.tsx src/features/editor/MobileEditorPreview.test.tsx
git commit -m "feat(v6): mobile editor read-only preview surface"
```

---

### Task 3: Branch `EditorRoute` on mobile

**Files:**
- Modify: `src/app/App.tsx` (`EditorRoute`; add `useIsMobile` + `MobileEditorPreview` imports)
- Test: `src/app/App.test.tsx` (add a mobile editor-route test)

**Interfaces:**
- Consumes: `useIsMobile` from `./useIsMobile` (already imported in `App.tsx` since V6-M0); `MobileEditorPreview` from `../features/editor/MobileEditorPreview`.
- Produces: `EditorRoute` returns `<MobileEditorPreview project={project} />` when `useIsMobile()` is true and the project is loaded; otherwise the existing `<EditorPage ... />`. Loading/missing states unchanged.

- [ ] **Step 1: Write the failing test**

Add to `src/app/App.test.tsx` inside `describe('App', ...)`. Reuse the file's existing project-store mock setup (the existing editor-route tests already stub a loadable project — mirror their `/editor/:id` setup verbatim, then override `matchMedia` to mobile):

```ts
  it('renders the read-only preview on the editor route when mobile', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }))

    render(
      <MemoryRouter initialEntries={['/editor/seed-project']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/edit on desktop/i)).toBeInTheDocument()
    expect(screen.queryByRole('main', { name: 'Chip editor workspace' })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })
```

> `seed-project` must be a project id the App test's project-store mock can load. Use whatever loadable id the existing editor-route test in this file uses (search the file for `/editor/` to copy its fixture). If `MobileEditorPreview`'s real Konva child or panels are environment-heavy in this integration test, add the same `vi.mock('../features/editor/MobileChipPreview', ...)` / publish / export mocks at the top of `App.test.tsx` that Task 2 used (the file already mocks `ExportPanel`/`PublishPanel` for editor tests — reuse those).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:client -- src/app/App.test.tsx`
Expected: FAIL — the editor route renders the authoring shell, not the preview.

- [ ] **Step 3: Update `EditorRoute` in `src/app/App.tsx`**

Add the import next to the other feature imports:

```ts
import { MobileEditorPreview } from '../features/editor/MobileEditorPreview'
```

In `EditorRoute`, add the hook near the top (with the other hooks, before any early return):

```ts
  const isMobile = useIsMobile()
```

Change the final return (currently `return <EditorPage ... />`) to:

```tsx
  if (isMobile) return <MobileEditorPreview project={project} />

  return (
    <EditorPage
      key={project.id}
      project={project}
      persist={(nextProject) => void store.save(nextProject)}
    />
  )
```

The `loading`/`missing` early returns above stay exactly as they are.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:client -- src/app/App.test.tsx`
Expected: PASS — including the new mobile editor-route test and all pre-existing App tests (which run at the desktop matchMedia default and still see the authoring shell).

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat(v6): route mobile editor to read-only preview"
```

---

### Task 4: Mobile editor preview styling

**Files:**
- Modify: `src/styles.css` (append `.mobile-editor-preview*` rules; this surface is mobile-only by definition, so its base styles can live outside a media query)

**Interfaces:**
- Consumes: existing tokens `--v2-*`, and reused classes `.gallery-spec__grid`, `.gallery-spec__features`, `.v2-button`.
- Produces: a single-column, centered, comfortably padded preview surface. (No JS interface.)

- [ ] **Step 1: Append the styling to `src/styles.css`**

Add near the other `.v2-page` surfaces (after the gallery blocks is fine):

```css
.mobile-editor-preview {
  min-height: calc(100vh - 128px);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 28%), var(--v2-bg);
  color: var(--v2-text);
}

.mobile-editor-preview__inner {
  width: min(640px, calc(100vw - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
  display: grid;
  gap: 1.5rem;
}

.mobile-editor-preview__title {
  margin: 0.3rem 0 0;
  font-size: clamp(1.8rem, 7vw, 2.6rem);
  font-weight: 850;
  line-height: 0.95;
  text-transform: uppercase;
}

.mobile-editor-preview__stage {
  width: 100%;
  border: 1px solid var(--v2-border);
  background: color-mix(in srgb, var(--v2-panel) 86%, black);
  overflow: hidden;
}

.mobile-editor-preview__spec {
  display: grid;
  gap: 0.85rem;
  border: 1px solid var(--v2-border);
  background: rgba(255, 255, 255, 0.035);
  padding: 1rem;
}

.mobile-editor-preview__spec h2 {
  margin: 0;
  font-size: 1.05rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mobile-editor-preview__cta {
  display: grid;
  gap: 0.85rem;
  border-top: 1px solid var(--v2-border);
  padding-top: 1.25rem;
  color: var(--v2-muted);
}

.mobile-editor-preview__cta .v2-button {
  justify-self: start;
}
```

- [ ] **Step 2: Verify the rule landed + build**

Run: `grep -c "mobile-editor-preview__inner" src/styles.css && npm run build`
Expected: grep prints `1`; build exits 0 (known chunk warning acceptable).

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(v6): style the mobile editor preview surface"
```

---

### Task 5: Full-gate verification

**Files:** `implementation.md` (milestone entry only).

- [ ] **Step 1: Run the full gates**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: client + server suites PASS; build exits 0; server typecheck exits 0; lint exits 0.

- [ ] **Step 2: Record the milestone**

Append a `## V6-M3 Editor Read-Only Mobile Preview (2026-06-...)` entry to `implementation.md`: the `EditorRoute` mobile branch, the `MobileEditorPreview` + `MobileChipPreview` reuse of `ChipArtwork`/`PublishPanel`/`ExportPanel`, that the export raster contract and local-first are untouched, and that Konva display + visual confirmation are deferred to V6-M4 QA. Commit:

```bash
git add implementation.md
git commit -m "docs(impl): record v6-m3 editor mobile preview"
```

---

## Self-Review

**1. Spec coverage (V6-M3):**
- `useIsMobile()` true → read-only branch instead of authoring shell → Task 3 (branch in `EditorRoute`; rationale for not branching inside `EditorPage`: Rules of Hooks). ✅
- Chip artwork rendered read-only via shared `ChipArtwork`, fit to viewport width, no editor chrome/transformer → Task 1 (`MobileChipPreview`, `renderMode="die-only"`). ✅
- Fake spec below the preview → Task 2. ✅
- Actions: copy share link (if published) via `PublishPanel`; export die/poster via `ExportPanel`; prominent "Edit on desktop" CTA → Task 2. ✅
- Local-first preserved, reads same JSON, no mutation, no DOM scrape, export contract intact → noted in Global Constraints; `MobileEditorPreview` takes `project` read-only and never receives `persist`. ✅
- Desktop branch unchanged → Task 3 keeps the existing `EditorPage` return for non-mobile. ✅

**2. Placeholder scan:** Every component step shows complete code; every command lists expected output. Fixtures (`createDefaultProject`, the `/editor/:id` loadable id) are resolved by grep against existing tests where the exact name must be confirmed at execution. ✅

**3. Type consistency:** `MobileChipPreview({ project })` (Task 1) is consumed by `MobileEditorPreview` (Task 2); `MobileEditorPreview({ project })` is consumed by `EditorRoute` (Task 3). `PublishPanel`/`ExportPanel` are used with their real `{ project }` signature. `ChipArtwork`'s `renderMode` is one of `'full' | 'die-only'` per its actual `Props`. ✅

## Out of scope for M3 (handled in later milestones)

- Touch editing on the Konva canvas (explicit v6 non-goal — editor stays desktop-only for authoring).
- Mobile browser QA matrix + visual gate sign-off → V6-M4.
