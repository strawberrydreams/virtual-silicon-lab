# Virtual Silicon Lab v2 Visual Major Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the v1 visual experience into a desktop-only visual major release where the website, editor, chip artwork, and exported posters look comparable to the corporate chip press visuals in `images/`.

**Architecture:** Keep the v1 local-first React/Konva architecture and single JSON project schema. Add a v2 visual layer around page themes, material recipes, chip artwork layers, poster compositions, and curated hero sets without introducing backend, auth, mobile support, AI, or true 3D. Preserve dedicated Konva export stages; never rely on editor DOM capture for final PNG quality.

**Tech Stack:** Vite, React 19, TypeScript, React Router, Zustand, Konva/React Konva, IndexedDB/localStorage repositories, Vitest + React Testing Library, desktop Chrome QA.

---

## Scope Lock

v2 includes visual/design work only:

- website redesign
- editor redesign
- output image redesign
- page theme switcher: `laboratory`, `anime`, `space`
- improved 2D chip textures/materials/presets
- random chip generator without AI
- 10 curated hero chip + poster sets

v2 explicitly excludes:

- backend, SQLite, auth, account/member CRUD
- board/gallery/ranking/contest/community
- mobile/responsive support
- true 3D rendering
- AI
- payments
- manufacturing/EDA compatibility

The earlier answers in `docs/v2-questions.md` that mention backend and board features are superseded by the later v2 scope decision.

## Working Rules

- Update `implementation.md` at every milestone with decisions, trade-offs, and deferred work.
- Keep changes in 3-4 task batches, verify each batch, then commit when execution is requested.
- Before any persisted schema change, ask the user because v2 should keep the single JSON schema unless explicitly approved.
- Use TDD for pure functions, render contracts, stores, and layout helpers.
- Use desktop Chrome QA for major UI milestones.
- Run `npm test` after each task batch and `npm run build` at each milestone end.
- If a dev server is needed for QA, run `npm run dev` and verify in browser.

## Stable File Boundaries

### Existing files to keep as anchors

- `virtual_silicon_lab_v2.md` — product/spec contract for v2.
- `implementation.md` — running implementation decisions and trade-offs.
- `src/styles.css` — global app shell, page theme variables, responsive desktop layout constraints.
- `src/app/App.tsx` and `src/app/App.test.tsx` — routes and page-level integration.
- `src/features/landing/LandingPage.tsx` and tests — landing redesign.
- `src/features/projects/ProjectDashboard.tsx`, `PresetCard.tsx`, and tests — dashboard and preset/remix redesign.
- `src/features/editor/EditorPage.tsx`, `EditorToolbar.tsx`, `BlockPalette.tsx`, and tests — editor chrome redesign.
- `src/features/editor/canvas/ChipArtwork.tsx` — shared chip rendering core for editor/export.
- `src/features/export/PosterExportStage.tsx`, `DieExportStage.tsx`, `ExportPanel.tsx`, `exportLayout.ts`, and tests — poster and export redesign.
- `src/presets/presetCatalog.ts`, `presetFactory.ts`, and tests — curated hero sets and random generator inputs.

### New files expected during v2

- `docs/reference/v2-visual-audit.md` — reference image audit, extracted visual rules, quality rubric.
- `docs/reference/v2-style-direction.md` — page themes, typography, spacing, material language, poster formats.
- `docs/reference/v2-hero-set.md` — 10 hero chip/poster concepts and final QA notes.
- `src/visual/pageThemes.ts` — page theme token definitions for `laboratory`, `anime`, `space`.
- `src/visual/pageThemeStore.ts` — local page theme state and persistence.
- `src/visual/materialRecipes.ts` — package/die/block/glow material recipes.
- `src/visual/chipLayers.ts` — pure helpers that describe package, substrate, die, trace, micro-detail, and glow layers.
- `src/visual/posterCompositions.ts` — pure poster layout recipes: `press-hero`, `architecture-slide`, `product-closeup`.
- `src/visual/heroSetCatalog.ts` — 10 curated v2 hero chip/poster definitions.
- `src/visual/randomChipGenerator.ts` — deterministic non-AI random candidate generator.
- Tests next to every pure visual helper: `*.test.ts`.

## Milestone Overview

- **V2-M0 Visual Audit & Direction:** no production code; inspect references, define visual rules, page themes, poster formats, hero set targets, and acceptance rubric.
- **V2-M1 Page Theme System & App Shell:** implement `laboratory/anime/space` page theme tokens, switcher, redesigned landing/dashboard shell.
- **V2-M2 Editor Chrome Redesign:** redesign editor surface, toolbar, panels, canvas environment, status/readouts while preserving commands.
- **V2-M3 Chip Material Renderer:** upgrade Konva chip artwork with package/die/material/micro-detail layers and stronger presets.
- **V2-M4 Poster Export Redesign:** redesign poster output with press formats and high-DPI export fidelity.
- **V2-M5 Hero Set Production & Random Generator:** produce 10 curated hero chip/poster sets and deterministic random chip generation.
- **V2-M6 Final QA & v2 Release Pack:** full desktop Chrome QA, export review, docs, backlog, and final release readiness.

---

## V2-M0: Visual Audit & Direction

**Purpose:** Convert `images/` references and user decisions into implementation constraints before changing UI code.

**Files:**

- Create: `docs/reference/v2-visual-audit.md`
- Create: `docs/reference/v2-style-direction.md`
- Create: `docs/reference/v2-hero-set.md`
- Modify: `implementation.md`

### Task 1: Reference Audit

- [ ] List every file in `images/` with a one-line description.
- [ ] Group references into visual families: Apple premium product, Intel architecture slide, NVIDIA/Qualcomm glow product, raw die shot.
- [ ] Extract concrete rules for composition, lighting, material, density, typography, and color budgets.
- [ ] Mark anti-patterns: stock sci-fi background, one-note palette, unreadable glow, empty die, poster text fighting the chip.
- [ ] Update `implementation.md` with audit decisions.

Verification:

```bash
rg "apple_m5|intel_panther|nvidia|qualcomm|rubric" docs/reference/v2-visual-audit.md
```

Expected: each reference family and the rubric appear in the audit file.

### Task 2: Style Direction

- [ ] Define page theme tokens for `laboratory`, `anime`, `space`.
- [ ] Define how page themes differ from existing chip `StyleTheme`.
- [ ] Define editor layout rules: left navigation, stage environment, inspector/palette panels, export surface.
- [ ] Define poster formats: `press-hero`, `architecture-slide`, `product-closeup`.
- [ ] Define visual acceptance rubric with pass/fail language.

Verification:

```bash
rg "laboratory|anime|space|press-hero|architecture-slide|product-closeup" docs/reference/v2-style-direction.md
```

Expected: all page themes and poster formats are present.

### Task 3: Hero Set Targets

- [ ] Draft 10 hero chip concepts with name, reference family, page theme, chip theme, poster format, dominant material, accent budget, and quality risk.
- [ ] Make sure concepts are visually distinct rather than recolors of the same chip.
- [ ] Tag 3 concepts as early implementation gates for M3/M4.
- [ ] Update `implementation.md` with the final v2 visual targets.

Verification:

```bash
rg "^## Hero" docs/reference/v2-hero-set.md
```

Expected: exactly 10 hero sections.

Milestone acceptance:

- v2 visual rules are documented before UI code changes.
- 10 hero targets exist.
- `implementation.md` records the v2 scope lock and visual audit decisions.

Commit suggestion:

```bash
git add virtual_silicon_lab_v2.md docs/reference/v2-visual-audit.md docs/reference/v2-style-direction.md docs/reference/v2-hero-set.md implementation.md
git commit -m "docs: define v2 visual direction"
```

---

## V2-M1: Page Theme System & App Shell

**Purpose:** Establish the v2 visual foundation for the whole web app before redesigning the editor internals.

**Files:**

- Create: `src/visual/pageThemes.ts`
- Create: `src/visual/pageThemes.test.ts`
- Create: `src/visual/pageThemeStore.ts`
- Create: `src/visual/pageThemeStore.test.ts`
- Modify: `src/styles.css`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/features/landing/LandingPage.tsx`
- Modify: `src/features/landing/LandingPage.test.tsx`
- Modify: `src/features/projects/ProjectDashboard.tsx`
- Modify: `src/features/projects/ProjectDashboard.test.tsx`
- Modify: `src/features/projects/PresetCard.tsx`
- Modify: `src/features/projects/PresetCard.test.tsx`
- Modify: `implementation.md`

### Task 1: Theme Token Contract

- [ ] Add `PageThemeName = 'laboratory' | 'anime' | 'space'`.
- [ ] Add token objects for background, surface, border, text, accent, glow, focus, canvas environment, and hero treatment.
- [ ] Add tests that assert all themes expose the same token keys and `laboratory` is the default.

Verification:

```bash
npm test -- src/visual/pageThemes.test.ts
```

Expected: theme contract tests pass.

### Task 2: Theme Store & App Wiring

- [ ] Add local page theme persistence with fallback to `laboratory`.
- [ ] Apply a `data-page-theme` attribute at the app root.
- [ ] Add a small corner theme switcher with icon-style controls and accessible labels.
- [ ] Test switching and persistence.

Verification:

```bash
npm test -- src/visual/pageThemeStore.test.ts src/app/App.test.tsx
```

Expected: app starts with `laboratory`, can switch themes, and restores persisted theme.

### Task 3: Landing/Dashboard Redesign

- [ ] Redesign landing as an immediate product/editor entry surface, not a marketing-only page.
- [ ] Make the chip/product signal visible in the first viewport.
- [ ] Redesign dashboard for dense scanning: recent projects, presets, clear create/remix actions.
- [ ] Keep existing CRUD and project loading behavior.
- [ ] Avoid mobile-specific work; desktop breakpoints can still prevent obvious overflow.

Verification:

```bash
npm test -- src/features/landing src/features/projects src/app
npm run build
```

Expected: tests and build pass.

Desktop QA:

- Open `/`.
- Switch all three page themes.
- Start blank project.
- Return to dashboard.
- Open at least one preset.
- Check browser console for app errors.

Milestone acceptance:

- All major non-editor pages use v2 page theme tokens.
- Theme switcher works across navigation.
- Landing/dashboard feel like part of the v2 visual system.

Commit suggestion:

```bash
git add src/visual src/styles.css src/app src/features/landing src/features/projects implementation.md
git commit -m "feat: add v2 page themes and app shell"
```

---

## V2-M2: Editor Chrome Redesign

**Purpose:** Make the editor itself feel like a premium chip visual lab while preserving the v1 editing model.

**Files:**

- Modify: `src/features/editor/EditorPage.tsx`
- Modify: `src/features/editor/EditorToolbar.tsx`
- Modify: `src/features/editor/BlockPalette.tsx`
- Modify: `src/features/editor/canvas/ChipStage.tsx`
- Modify: `src/features/editor/canvas/viewport.ts`
- Modify: related editor tests
- Modify: `src/styles.css`
- Modify: `implementation.md`

### Task 1: Editor Layout Shell

- [ ] Replace the v1 editor page composition with a three-zone desktop tool surface: primary stage, left creation/preset rail, right inspector/export rail.
- [ ] Keep existing toolbar commands reachable.
- [ ] Add stable dimensions for toolbars, icon buttons, counters, and panels so text/icons do not resize the layout.
- [ ] Add tests that the editor renders selected project data and command controls after redesign.

Verification:

```bash
npm test -- src/features/editor/EditorToolbar.test.tsx src/features/editor/BlockPalette.test.tsx
```

Expected: toolbar and palette behavior still pass.

### Task 2: Stage Environment

- [ ] Redesign the canvas area as a product analysis stage: dark environment, subtle grid/readout, package shadow, lighting frame.
- [ ] Ensure zoom/pan/drag/selection remain usable.
- [ ] Keep visual frame effects outside export-only assumptions; export quality comes later from Konva stages.
- [ ] Add or update viewport tests if sizing rules change.

Verification:

```bash
npm test -- src/features/editor/canvas/viewport.test.ts src/features/editor/canvas/geometry.test.ts
```

Expected: viewport and geometry contracts still pass.

### Task 3: Tool Surface Polish

- [ ] Convert text-heavy controls into compact icon+label or segmented controls where appropriate.
- [ ] Make block palette categories clearer without card nesting.
- [ ] Add page-theme-aware styling to panels and controls.
- [ ] Preserve keyboard shortcuts and undo/redo behavior.

Verification:

```bash
npm test -- src/features/editor src/stores/editorStore.test.ts
npm run build
```

Expected: editor and store tests pass; build passes.

Desktop QA:

- Open a preset with many blocks.
- Drag, resize, rotate, duplicate, reorder, undo, redo.
- Switch page themes.
- Confirm no overlap in toolbar/panels at desktop viewport.

Milestone acceptance:

- Editor screen itself meets the v2 visual direction.
- All existing edit commands remain functional.
- No mobile support is added or promised.

Commit suggestion:

```bash
git add src/features/editor src/styles.css implementation.md
git commit -m "feat: redesign v2 editor surface"
```

---

## V2-M3: Chip Material Renderer

**Purpose:** Upgrade the actual chip artwork so it looks like a layered semiconductor product visual rather than colored blocks.

**Files:**

- Create: `src/visual/materialRecipes.ts`
- Create: `src/visual/materialRecipes.test.ts`
- Create: `src/visual/chipLayers.ts`
- Create: `src/visual/chipLayers.test.ts`
- Modify: `src/features/editor/canvas/ChipArtwork.tsx`
- Modify: `src/features/editor/canvas/blockTexture.ts`
- Modify: `src/features/editor/canvas/blockTexture.test.ts`
- Modify: `src/themes/resolveStyle.ts`
- Modify: `src/themes/resolveStyle.test.ts`
- Modify: `src/presets/presetCatalog.ts`
- Modify: `src/presets/presetCatalog.test.ts`
- Modify: `implementation.md`

### Task 1: Material Recipes

- [ ] Define material recipes for package, substrate, die base, metal trace, micro tile, glass/glow overlay, label/readout.
- [ ] Keep recipes serializable and deterministic.
- [ ] Test that each chip theme resolves to complete material values.

Verification:

```bash
npm test -- src/visual/materialRecipes.test.ts src/themes/resolveStyle.test.ts
```

Expected: all theme/material combinations resolve.

### Task 2: Layer Model

- [ ] Add pure layer helpers for package, die base, major blocks, micro details, traces, labels, glow overlays, and frame shadows.
- [ ] Ensure helpers accept existing project JSON and do not require schema changes.
- [ ] Test geometry bounds for rectangular, square, circle, and hex dies.

Verification:

```bash
npm test -- src/visual/chipLayers.test.ts src/features/editor/canvas/geometry.test.ts
```

Expected: generated layers stay within expected die/package bounds.

### Task 3: Konva Renderer Upgrade

- [ ] Render package/substrate/die/material/micro-detail layers in `ChipArtwork`.
- [ ] Improve block textures so dense chips have believable microstructure at export resolution.
- [ ] Keep selection affordances readable in editor mode.
- [ ] Ensure export stages reuse the same core artwork.

Verification:

```bash
npm test -- src/features/editor/canvas src/features/export
npm run build
```

Expected: canvas/export tests and build pass.

Desktop QA:

- Compare at least three presets against `docs/reference/v2-visual-audit.md`.
- Verify exported die-only PNG contains the upgraded material layers.
- Check that selection/drag affordances remain visible.

Milestone acceptance:

- At least three gate hero chips look materially different from v1.
- No DOM-only visual effect is required for chip export.
- Single JSON schema remains intact.

Commit suggestion:

```bash
git add src/visual src/features/editor/canvas src/features/export src/themes src/presets implementation.md
git commit -m "feat: upgrade v2 chip material renderer"
```

---

## V2-M4: Poster Export Redesign

**Purpose:** Make exported posters look like corporate chip press images and architecture slides.

**Files:**

- Create: `src/visual/posterCompositions.ts`
- Create: `src/visual/posterCompositions.test.ts`
- Modify: `src/features/export/PosterExportStage.tsx`
- Modify: `src/features/export/DieExportStage.tsx`
- Modify: `src/features/export/ExportPanel.tsx`
- Modify: `src/features/export/exportLayout.ts`
- Modify: `src/features/export/exportLayout.test.ts`
- Modify: `src/features/export/exportStage.test.ts`
- Modify: `implementation.md`

### Task 1: Poster Composition Recipes

- [ ] Add `press-hero`, `architecture-slide`, and `product-closeup` composition recipes.
- [ ] Define safe regions for chip, title, specs, labels, and background layers.
- [ ] Test each recipe at `1600x900` logical and `3200x1800` export output.

Verification:

```bash
npm test -- src/visual/posterCompositions.test.ts src/features/export/exportLayout.test.ts
```

Expected: all poster formats produce bounded layout rectangles.

### Task 2: Poster Stage Rendering

- [ ] Render page-theme-compatible background treatments.
- [ ] Render chip hero with scale/crop/position rules from the selected composition.
- [ ] Add corporate-style title/spec typography without blocking the chip.
- [ ] Keep all poster effects inside Konva.

Verification:

```bash
npm test -- src/features/export
npm run build
```

Expected: export tests and build pass.

### Task 3: Export UX

- [ ] Update `ExportPanel` to expose poster format selection and preview state.
- [ ] Keep die-only export available.
- [ ] Keep Web Share/download fallback behavior from v1.
- [ ] Test malformed share/download paths still behave safely.

Verification:

```bash
npm test -- src/features/export src/app
```

Expected: export behavior tests pass.

Desktop QA:

- Export poster for one project in each poster format.
- Verify PNG dimensions are `3200x1800`.
- Confirm poster does not include editor UI.
- Compare the outputs against the M0 rubric.

Milestone acceptance:

- All three poster formats are usable.
- Exported poster visuals are materially better than v1.
- Export fidelity is verified in desktop Chrome.

Commit suggestion:

```bash
git add src/visual src/features/export implementation.md
git commit -m "feat: redesign v2 poster export"
```

---

## V2-M5: Hero Set Production & Random Generator

**Purpose:** Deliver the 10 hero chip/poster sets and a non-AI generator that can produce good starting candidates.

**Files:**

- Create: `src/visual/heroSetCatalog.ts`
- Create: `src/visual/heroSetCatalog.test.ts`
- Create: `src/visual/randomChipGenerator.ts`
- Create: `src/visual/randomChipGenerator.test.ts`
- Modify: `src/presets/presetCatalog.ts`
- Modify: `src/presets/presetFactory.ts`
- Modify: `src/presets/presetCatalog.test.ts`
- Modify: `src/presets/presetFactory.test.ts`
- Modify: `src/features/projects/ProjectDashboard.tsx`
- Modify: `src/features/projects/ProjectDashboard.test.tsx`
- Modify: `docs/reference/v2-hero-set.md`
- Modify: `implementation.md`

### Task 1: Hero Set Catalog

- [ ] Convert the 10 M0 hero targets into concrete project/preset definitions.
- [ ] Ensure each set has name, theme, page theme fit, poster format, fake specs, blocks, decorations, and material intent.
- [ ] Test unique IDs, names, poster formats, and visual family distribution.

Verification:

```bash
npm test -- src/visual/heroSetCatalog.test.ts src/presets/presetCatalog.test.ts
```

Expected: 10 hero sets are valid and distinct.

### Task 2: Random Generator

- [ ] Add deterministic seeded random chip generation without AI.
- [ ] Use visual recipes and constraints so generated candidates are not sparse or chaotic.
- [ ] Do not change persisted schema.
- [ ] Test same seed produces same project and different seeds produce meaningfully different layouts.

Verification:

```bash
npm test -- src/visual/randomChipGenerator.test.ts src/presets/presetFactory.test.ts
```

Expected: generator determinism and validity tests pass.

### Task 3: Dashboard Integration

- [ ] Add curated v2 hero set entry points.
- [ ] Add random generator entry point.
- [ ] Keep remix creating independent projects.
- [ ] Make dashboard visual density consistent with M1 design.

Verification:

```bash
npm test -- src/features/projects src/presets src/visual
npm run build
```

Expected: dashboard/preset/generator tests and build pass.

Desktop QA:

- Open all 10 hero sets.
- Export one poster per set.
- Record pass/fail notes in `docs/reference/v2-hero-set.md`.
- Reject sets that only differ by color.

Milestone acceptance:

- 10 hero chip + poster sets exist.
- Every set passes the M0 quality rubric.
- Random generator creates useful non-AI starting points.

Commit suggestion:

```bash
git add src/visual src/presets src/features/projects docs/reference/v2-hero-set.md implementation.md
git commit -m "feat: add v2 hero sets and random generator"
```

---

## V2-M6: Final QA & Release Pack

**Purpose:** Verify v2 as a complete visual major release and prepare the private release state.

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/demo/README.md`
- Modify: `implementation.md`
- Modify: tests only if QA reveals regressions

### Task 1: Regression Test Pass

- [ ] Run the full test suite.
- [ ] Run production build.
- [ ] Fix any failures in the smallest relevant scope.

Verification:

```bash
npm test
npm run build
```

Expected: both pass. Vite chunk-size warning is acceptable only if no new runtime issue appears.

### Task 2: Desktop Chrome QA

- [ ] Verify landing/dashboard/editor/export flows on desktop Chrome.
- [ ] Verify theme switching across routes.
- [ ] Verify 150-block smoke case if rendering complexity increased.
- [ ] Verify export dimensions and visual fidelity for all 10 hero sets.
- [ ] Check console for app errors.

Desktop QA checklist:

- `/` loads with `laboratory` theme by default.
- Theme switcher changes `laboratory`, `anime`, `space`.
- Dashboard opens existing projects and v2 hero sets.
- Random generator creates an editable project.
- Editor commands: drag, resize, rotate, duplicate, reorder, undo, redo, delete.
- Export panel downloads die-only and poster.
- Poster PNG is `3200x1800`.
- No editor UI appears inside exported poster.

### Task 3: Documentation & Backlog

- [ ] Update README with v2 private release summary and screenshots/export notes if available.
- [ ] Update demo docs with how to reproduce hero set exports.
- [ ] Update `CLAUDE.md` with current status and v3-deferred backlog.
- [ ] Update `implementation.md` with final QA results and remaining known issues.

Verification:

```bash
rg "v2|visual major|hero set|backend|v3" README.md CLAUDE.md docs/demo/README.md implementation.md
```

Expected: docs reflect v2 status and v3 deferrals.

Milestone acceptance:

- Full tests and build pass.
- Desktop Chrome QA passes.
- 10 hero set exports pass the quality rubric.
- v2 docs are ready for branch merge decision.

Commit suggestion:

```bash
git add README.md CLAUDE.md docs/demo/README.md implementation.md
git commit -m "docs: finalize v2 release pack"
```

---

## Checkpoints

Use these checkpoints during execution:

- **Checkpoint 1:** Finish V2-M0 and V2-M1. Stop after documentation, app theme foundation, landing/dashboard verification, and commits.
- **Checkpoint 2:** Finish V2-M2 and V2-M3. Stop after editor redesign and chip material renderer verification.
- **Checkpoint 3:** Finish V2-M4 and V2-M5. Stop after poster redesign, 10 hero sets, random generator, and export QA.
- **Final Checkpoint:** Finish V2-M6. Stop after final review. Do not merge until explicitly requested.

## Self-Review

- Spec coverage: the plan covers website design, editor design, output design, page themes, improved 2D visual quality, random generator, 10 hero sets, desktop-only QA, and v3 deferrals.
- Scope control: backend, SQLite, auth, member CRUD, board/community, mobile, true 3D, AI, payments, and manufacturing compatibility are excluded.
- Schema control: plan keeps the single JSON schema and requires user approval before changing it.
- Verification: every milestone has tests, build or browser QA, and `implementation.md` updates.
