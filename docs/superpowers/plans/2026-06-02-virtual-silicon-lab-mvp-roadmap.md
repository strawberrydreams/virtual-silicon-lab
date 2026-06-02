# Virtual Silicon Lab MVP Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete static-hosted Virtual Silicon Lab MVP as a sequence of working, testable milestones.

**Architecture:** Keep project data as versioned JSON in a domain layer, persist it through an IndexedDB repository with a localStorage fallback, and expose editing actions through Zustand stores. Render editable chip content with React Konva and render exportable content through dedicated Konva stages so the saved JSON remains the single source of truth.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS v4, Zustand, Konva, React Konva, idb, Vitest, React Testing Library, fake-indexeddb

---

## Why This Is Split Into Milestones

The MVP contains six subsystems with different risks:

1. project persistence
2. canvas editing
3. visual quality
4. presets and remixing
5. fake specs and image export
6. landing page and portfolio polish

Writing one oversized implementation script before the first canvas exists would hard-code assumptions that visual testing may invalidate. Implement each milestone as working software, update `implementation.md`, then write or refine the detailed plan for the next milestone.

## Stable File Boundaries

The following boundaries stay stable across milestones. Add focused files inside them rather than creating feature-wide files with mixed responsibilities.

```text
src/
  app/                 routing and application shell
  domain/              versioned project JSON, factories, migrations
  storage/             IndexedDB and localStorage repositories
  stores/              Zustand state and editor commands
  features/
    projects/          project dashboard
    editor/            editor shell, toolbar, keyboard shortcuts
      canvas/          Konva stage, die, blocks, decorations, geometry
    specs/             fake spec form and preview
    export/            die-only and poster export stages
    landing/           portfolio landing page
  presets/             curated remixable chip definitions
  themes/              Konva-renderable visual tokens
  test/                test setup and shared test helpers
```

Rules:

- `src/domain/` must not import React, Konva, Zustand, IndexedDB, or browser UI modules.
- `src/storage/` persists and migrates projects but does not decide editor behavior.
- `src/stores/` owns commands such as duplicate, delete, reorder, undo, and redo.
- Canvas components receive serializable project data and emit domain-level changes.
- Export stages receive the same serializable project data. They must not scrape editor DOM.
- Every persisted schema change increments `schemaVersion`, adds a migration test, and is recorded in `implementation.md`.

## Milestone Sequence

### Milestone 0: Reference Board And Visual Direction

This milestone produces no code. The spec names a reference board as the primary defense against amateur-looking output and requires it before visual work begins. Complete it before Milestone 3; it can run in parallel with Milestones 1 and 2.

Outcome:

- a curated reference board under `docs/reference/` (or an external board linked from there) covering the three named directions: real die-shot color, texture, and grid; Sci-Fi game UI (Destiny / Star Citizen menus); and Apple-silicon keynote slides (dark background, glow, minimal typography)
- a short written direction note that, for each theme (`neon`, `retro`, `military`, `keynote`, `mono`), records palette, glow and contrast intent, and one explicit anti-reference (do not look like Cadence or Synopsys EDA tools)
- 1 to 3 rough target compositions for the first hero chip

Acceptance gate:

- The reference board and direction note exist and are recorded in `implementation.md`.
- Milestone 3 visual work and the first hero chip are reviewed against this board rather than ad hoc taste.

### Milestone 1: Foundation Vertical Slice

Detailed plan: `docs/superpowers/plans/2026-06-02-foundation-vertical-slice.md`

Outcome:

- repository initialized with Vite, React, Tailwind, Vitest, and Git
- versioned project JSON and migration entry point
- IndexedDB repository with localStorage fallback
- project create, list, duplicate, delete
- editor route with rectangular die
- real and fantasy block palette
- add, drag, and persist blocks inside rectangular die bounds
- browser verification of refresh persistence

Acceptance gate:

- Create a project without login, add one `CPU` and one `DreamSynth`, refresh, and see both blocks restored.
- Dragging either block beyond the rectangular die edge clamps it inside the die.
- `npm test` and `npm run build` pass.

### Milestone 2: Editor Core

Create `docs/superpowers/plans/2026-06-02-editor-core.md` immediately before implementation using the files and lessons from Milestone 1.

Outcome:

- square, circle, and hexagon dies
- zoom, pan, visible grid, snap
- block resize and rotate
- die-bound constraints for all four shapes
- selection state
- undo, redo, delete, duplicate, bring forward, send backward
- keyboard shortcuts
- autosave debounce that does not pollute undo history

Acceptance gate:

- All editor commands have focused unit tests.
- Every die shape constrains drag and resize.
- A Chrome browser session can edit 150 blocks without visibly broken interactions.

### Milestone 3: Visual System

Create `docs/superpowers/plans/2026-06-02-visual-system.md` immediately before implementation.

Outcome:

- theme catalog: `neon`, `retro`, `military`, `keynote`, `mono`
- Konva-renderable gradients, `shadowBlur`, filters, and blend settings
- decorations: labels, warning marks, neon lines
- locally bundled texture assets only
- first reference-quality hero chip

Acceptance gate:

- Theme switching changes the whole die consistently.
- The first hero chip is manually reviewed against the Milestone 0 reference board before proceeding.
- PNG export smoke test confirms that required effects are rendered inside Konva, not DOM-only CSS.

### Milestone 4: Presets And Remixing

Create `docs/superpowers/plans/2026-06-02-presets-and-remixing.md` immediately before implementation.

Outcome:

- 5 to 8 curated parametric presets
- preset catalog metadata and preview cards
- remix action that creates an independent editable project
- remaining hero chips selected from curated presets

Acceptance gate:

- A user can start from a preset and produce a distinct chip in under five minutes.
- Editing a remix never mutates the source preset.

### Milestone 5: Fake Specs And Dual PNG Export

Create `docs/superpowers/plans/2026-06-02-specs-and-export.md` immediately before implementation.

Outcome:

- fake spec form and bundled example sheets
- `die-only PNG`
- dedicated poster export Konva stage with background, chip, typography, and fake spec layout
- high-DPI download
- Web Share API when available, download fallback otherwise

Acceptance gate:

- Both PNG variants download at their documented pixel sizes.
- Poster output contains no editor controls.
- Poster text and required visual effects are rendered by the export stage.
- Sharing gracefully falls back to download when `navigator.share` is unavailable.

### Milestone 6: Landing, QA, And Static Deployment

Create `docs/superpowers/plans/2026-06-02-landing-and-release.md` immediately before implementation.

Outcome:

- landing page with 3 to 5 hero chips
- direct start without login
- project dashboard polish
- README and demo GIF
- static hosting configuration
- desktop Chrome QA checklist

Acceptance gate:

- A new visitor can place the first block within 30 seconds.
- Refresh and revisit preserve projects.
- A preset produces a presentation-ready poster in under five minutes.
- Desktop Chrome interaction remains smooth during the documented 150-block smoke test.

## Cross-Cutting Verification

Run these after every milestone:

```bash
npm test
npm run build
```

After milestones that change the frontend:

1. Start `npm run dev -- --host 127.0.0.1`.
2. Use the in-app Browser plugin to open the shown localhost URL.
3. Exercise the milestone acceptance gate.
4. Record any visual or architectural decision in `implementation.md`.

## Requirement Coverage

| Requirement | Milestone |
|---|---|
| reference board, visual direction | 0 |
| no-login start, routing | 1 and 6 |
| project CRUD, local save, autosave | 1 and 2 |
| Konva editor, grid, snap, zoom, pan | 1 and 2 |
| four die shapes, bounded blocks | 1 and 2 |
| real and fantasy blocks | 1 |
| undo, redo, delete, duplicate, ordering, shortcuts | 2 |
| Konva-native visual effects and decorations | 3 |
| themes | 3 |
| presets and remixing | 4 |
| fake specs | 5 |
| die-only PNG, poster PNG, share | 5 |
| hero chips, landing, README, demo GIF | 6 |

## Explicitly Deferred

Do not implement the post-MVP list while executing this roadmap:

- custom freeform die paths
- PixiJS or Three.js shaders
- animation simulation
- backend sharing links
- gallery, rankings, contests
- AI generation
- worldbuilding pages
- responsive mobile UI
- true 3D, MP4 export, login, manufacturing compatibility

## Setup References

- Vite scaffold and Node requirements: https://vite.dev/guide/
- Tailwind Vite plugin: https://tailwindcss.com/docs/installation/using-vite
- Vitest installation: https://vitest.dev/guide/
- React Konva installation: https://konvajs.org/docs/react/index.html
- Konva high-quality export: https://konvajs.org/docs/data_and_serialization/High-Quality-Export.html

