# Virtual Silicon Lab — Project Memory

A web creative tool for designing fictional semiconductor chips on a 2D canvas and exporting
high-resolution chip images and keynote-style promo posters. **Not** an EDA tool, not a game,
no real manufacturing. Tone: surreal / Sci-Fi / playful (fantasy blocks like "Consciousness
Processor" + funny fake spec sheets). Audience: people who love chip aesthetics, not EE pros.

**Visual quality IS the product.** If glow/neon/metal/export looks amateurish, the project fails.
Completion and "looks great at a glance" beat feature breadth.

## Working Context

- Active work happens on branch `feature/foundation-slice` in `.worktrees/foundation-slice` (git worktree).
- Package manager: **npm**. No backend; static hosting; storage is IndexedDB with localStorage fallback.
- Node.js `20.19+` or `22.12+` (Vite/Vitest requirement).

## Commands

```bash
npm test          # vitest run — all unit tests
npm run build     # tsc -b && vite build
npm run dev -- --host 127.0.0.1   # dev server for browser verification
```

Run `npm test` and `npm run build` after every task. Exercise the milestone acceptance gate in a
browser after frontend changes, then record decisions in `implementation.md`.

## Tech Stack

Vite · React + TypeScript · Tailwind CSS v4 · Zustand (`zustand/vanilla` + `useStore`) ·
Konva + React Konva · `idb` (IndexedDB) · Vitest + React Testing Library + `fake-indexeddb`.

## Architecture & Boundaries

```text
src/
  app/        routing, application shell
  domain/     versioned project JSON, factories, migrations  (NO React/Konva/Zustand/IndexedDB)
  storage/    IndexedDB + localStorage repositories (persist/migrate only; no editor behavior)
  stores/     Zustand state + editor commands (duplicate, delete, reorder, undo, redo)
  features/
    projects/ project dashboard
    editor/   editor shell, toolbar, keyboard shortcuts
      canvas/ Konva stage, die, blocks, decorations, geometry
    specs/    fake spec form + preview          (Milestone 5)
    export/   die-only + poster export stages   (Milestone 5)
    landing/  portfolio landing page            (Milestone 6)
  presets/    curated remixable chip definitions (Milestone 4)
  themes/     Konva-renderable visual tokens     (Milestone 3)
  lib/        framework-agnostic utilities (zero deps; e.g. debouncer)
  test/       test setup (fake-indexeddb + jest-dom)
```

Rules:
- `src/domain/` is pure: no React/Konva/Zustand/IndexedDB/browser imports.
- Canvas components receive serializable project data and emit domain-level changes.
- Export stages receive the same serializable data and **must not scrape editor DOM**; they composite on a dedicated Konva stage.
- Every persisted schema change bumps `schemaVersion`, adds a migration test, and is noted in `implementation.md`.

## Conventions

- **TDD**: write a failing test, confirm it fails, implement minimal code, confirm pass, commit. One concern per commit.
- Vitest with explicit `import { describe, expect, it } from 'vitest'` (no globals).
- Vanilla Zustand stores are tested through `store.getState()`.
- Pure logic (geometry, factories, store commands, debounce, shortcuts, zoom math) is unit-tested directly.
- **Konva rendering is NOT unit-tested** (jsdom lacks canvas); it is verified in a browser session. Keep pure helpers out of components so they stay testable.
- Serializable project JSON is the single source of truth (single-JSON export shape from day one).

## Key Product Invariants

- Four die shapes: `rect`, `square`, `circle`, `hexagon`. Blocks are clamped inside die bounds on move AND resize.
- Export visual effects use **Konva node settings** (`shadowBlur`, gradients, filters, blend) — never DOM/CSS, which `toDataURL()` ignores. DOM/CSS effects are editor-UI-only.
- Two PNG exports: `die-only` and `poster` (poster composited on a separate export-only Konva stage).
- Desktop-first (Chrome); responsive is post-MVP. Autosave is required; target ~60fps canvas.
- v1 editor: single selection; multi-select deferred.

## Milestone Status

- **M0 Reference Board** (no code): ✅ done — `docs/reference/` board (`README.md` three named directions + global EDA anti-reference, `visual-direction.md` per-theme Konva tokens, `hero-compositions.md` first-hero comps A/B/C). M3 visual work and the first hero chip are reviewed against this board, not ad-hoc taste.
- **M1 Foundation Vertical Slice**: ✅ done — project CRUD, IndexedDB+fallback, rectangular-die editor, bounded drag, refresh persistence.
- **M2 Editor Core**: ✅ done (`docs/superpowers/plans/2026-06-02-editor-core.md`) — four die shapes with bounded drag/resize, zoom/pan/grid/snap, resize/rotate via Konva Transformer, single selection, undo/redo/delete/duplicate/reorder, keyboard shortcuts, debounced autosave. All commands unit-tested; browser-verified (Chrome/Playwright). Engine lives in `src/stores/editorStore.ts` + `src/features/editor/canvas/geometry.ts`.
- **M3 Visual System**: ✅ done (`docs/superpowers/plans/2026-06-02-visual-system.md`) — pure `src/themes/` boundary (token catalog for all five themes + gradient builders + style resolvers), theme-driven `ChipStage` (die/grid/blocks/glow + procedural memory texture), decoration rendering (neon line/warning/label/sci-fi, additive blend), `createHeroChip` (composition A) loadable from the dashboard, and a minimal `stage.toDataURL` PNG export. All three gates browser-verified (Chrome/Playwright): theme switch recolors the whole die; the AURORA C-1 hero chip reviewed against the M0 board; the exported PNG proves effects render in Konva (not DOM/CSS). Theme is the render-time source of truth (no migration); `die.background` is reserved for presets.
- **M4 Presets/Remix**: ✅ done (`docs/superpowers/plans/2026-06-02-presets-and-remixing.md`) — six immutable curated blueprints materialize into fresh ordinary `Project` JSON; `projectStore.remixPreset()` persists independent editable local projects; dashboard shows lightweight CSS summary cards instead of six live Konva stages. Browser-verified: blank start remains; AURORA keynote, N-9 neon hex, and M-7 matte military open in the editor; an edited Mono N-9 survives refresh while a fresh N-9 remix still starts Neon, proving source immutability.
- **M5 Fake Specs + Dual PNG Export** (planned, next code milestone) → **M6 Landing/QA/Deploy**: execute `docs/superpowers/plans/2026-06-02-specs-and-export.md` from Task 1. The plan starts with export-reliability prerequisites found during pre-M5 review.

> Visual-quality gate: do not advance past M3 if glow/neon looks amateurish; the first hero chip is manually reviewed against the M0 reference board.

## Document Map

- `virtual_silicon_lab_v1.md` — full product/requirements spec (v1 / post-MVP / excluded) **[Korean]**.
- `docs/superpowers/plans/2026-06-02-virtual-silicon-lab-mvp-roadmap.md` — milestone roadmap + boundaries + coverage.
- `docs/superpowers/plans/2026-06-02-*.md` — detailed per-milestone implementation plans (TDD, bite-sized).
- `implementation.md` — running log of decisions, deviations, and resume points **[Korean]**. Update it as work proceeds.

## Explicitly Out Of Scope (do not build during MVP)

Custom freeform die paths · PixiJS/Three.js shaders · animation simulation · backend sharing links ·
gallery/rankings/contests · AI generation · worldbuilding pages · responsive mobile · true 3D ·
MP4 export · login/accounts · GDSII/DRC/LVS/manufacturing compatibility.
