# Virtual Silicon Lab — Project Memory

A web creative tool for designing fictional semiconductor chips on a 2D canvas and exporting
high-resolution chip images and keynote-style promo posters. **Not** an EDA tool, not a game,
no real manufacturing. Tone: surreal / Sci-Fi / playful (fantasy blocks like "Consciousness
Processor" + funny fake spec sheets). Audience: people who love chip aesthetics, not EE pros.

**Visual quality IS the product.** If glow/neon/metal/export looks amateurish, the project fails.
Completion and "looks great at a glance" beat feature breadth.

## Working Context

- The v1 MVP (M0–M6), the v2 visual major (V2-M0–M6), and the SoC Custom Studio work are all complete and live on `main`.
- Current work: **v3 "Share Core"** on branch `v3-share-core`; do not merge into `main` until the user explicitly asks. Goals/spec: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md`.
- v3 adds a Node + TypeScript + SQLite backend (npm workspace `server/`) with accounts, publish-snapshot uploads, a public gallery, share links, and remix import. Editing stays 100% local-first (IndexedDB + localStorage fallback); the server only receives explicit publish snapshots. v3 ends at **deploy-ready**, not public launch.
- Package manager: **npm**.
- Node.js `20.19+` or `22.12+` (Vite/Vitest requirement).

## Commands

```bash
npm test          # client (vitest run) + server suites
npm run test:client   # client vitest only
npm run build     # tsc -b && vite build
npm run dev -- --host 127.0.0.1   # client dev server for browser verification
npm run dev:server               # API server on http://127.0.0.1:8787
npm run typecheck --workspace server   # server typecheck (tsc --noEmit)
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
  visual/     v2 page themes, material recipes, hero sets, random generator
  lib/        framework-agnostic utilities (zero deps; e.g. debouncer)
  test/       test setup (fake-indexeddb + jest-dom)
server/       npm workspace `@vsl/server` (v3 Share Core backend)
  src/        Hono app, SQLite open/migration runner, entry point
  test/       node-environment Vitest suite
```

Rules:
- `src/domain/` is pure: no React/Konva/Zustand/IndexedDB/browser imports.
- The server reuses `src/domain/` via the `@domain/*` alias (tsconfig paths + vitest alias) and must not import from any other client directory.
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
- v2 poster formats: `press-hero`, `architecture-slide`, `product-closeup`; poster raster remains `3200x1800`.
- Desktop-first (Chrome); responsive is post-MVP. Autosave is required; target ~60fps canvas.
- v1 editor: single selection; multi-select deferred.

## Milestone Status

### v3 Share Core (in progress — spec: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md`)

- **V3-M0 Workspace & Server Skeleton**: ✅ done — npm workspaces conversion, Hono + better-sqlite3 server skeleton, transaction-safe migration runner (duplicate-id guard, empty production list until M1), `/api/health` reporting the shared domain `CURRENT_SCHEMA_VERSION`, shared-domain smoke tests pinning `migrateProject` as the publish validation entry; server suite 4 files / 11 tests.
- **V3-M1 Accounts** · **V3-M2 Publish Pipeline** · **V3-M3 Public Gallery** · **V3-M4 Share Links** · **V3-M5 Remix Import** · **V3-M6 Deploy Packaging & QA**: ⏳ planned.
- v4 "Community" (moderation, reactions, ranking, contests, remix lineage) is direction-approved in the same spec; detailed design happens after v3.

### SoC Custom Studio (post-v2, on `main`)

- ✅ done — studio kit UI/inspector, schema v2 studio data model + migration, deterministic global reflow engine, generated fake-spec engine with component-level estimates, three-zone editor redesign. Specs: `docs/superpowers/specs/2026-06-07-soc-custom-studio-design.md`, `2026-06-09-editor-reference-fidelity-design.md`; decisions in `implementation.md`. Test suite at this point: 58 files / 267 tests.

### v2 Visual Major

- **V2-M0 Visual Audit & Direction**: ✅ done — reference audit, style direction, and 10 hero set targets in `docs/reference/`.
- **V2-M1 Page Theme System & App Shell**: ✅ done — `laboratory`/`anime`/`space`, app root CSS variables, theme switcher, landing/dashboard redesign.
- **V2-M2 Editor Chrome Redesign**: ✅ done — three-zone desktop tool surface, product analysis stage, segmented toolbar, export rail.
- **V2-M3 Chip Material Renderer**: ✅ done — material recipes, chip layer model, package/micro/trace/readout/glow rendering shared by editor/export.
- **V2-M4 Poster Export Redesign**: ✅ done — three poster compositions with the same `3200x1800` output contract.
- **V2-M5 Hero Sets & Random Generator**: ✅ done — 10 v2 hero presets, deterministic non-AI random chip generation, dashboard integration.
- **V2-M6 Final QA & Release Pack**: ✅ done — `npm test` 39 files / 146 tests, `npm run build` green with known chunk warning, desktop Browser QA passed for landing/theme/dashboard/editor/random/export controls, 150-block layer smoke covered by test.

### v1 MVP

- **M0 Reference Board** (no code): ✅ done — `docs/reference/` board (`README.md` three named directions + global EDA anti-reference, `visual-direction.md` per-theme Konva tokens, `hero-compositions.md` first-hero comps A/B/C). M3 visual work and the first hero chip are reviewed against this board, not ad-hoc taste.
- **M1 Foundation Vertical Slice**: ✅ done — project CRUD, IndexedDB+fallback, rectangular-die editor, bounded drag, refresh persistence.
- **M2 Editor Core**: ✅ done (`docs/superpowers/plans/2026-06-02-editor-core.md`) — four die shapes with bounded drag/resize, zoom/pan/grid/snap, resize/rotate via Konva Transformer, single selection, undo/redo/delete/duplicate/reorder, keyboard shortcuts, debounced autosave. All commands unit-tested; browser-verified (Chrome/Playwright). Engine lives in `src/stores/editorStore.ts` + `src/features/editor/canvas/geometry.ts`.
- **M3 Visual System**: ✅ done (`docs/superpowers/plans/2026-06-02-visual-system.md`) — pure `src/themes/` boundary (token catalog for all five themes + gradient builders + style resolvers), theme-driven `ChipStage` (die/grid/blocks/glow + procedural memory texture), decoration rendering (neon line/warning/label/sci-fi, additive blend), `createHeroChip` (composition A) loadable from the dashboard, and a minimal `stage.toDataURL` PNG export. All three gates browser-verified (Chrome/Playwright): theme switch recolors the whole die; the AURORA C-1 hero chip reviewed against the M0 board; the exported PNG proves effects render in Konva (not DOM/CSS). Theme is the render-time source of truth (no migration); `die.background` is reserved for presets.
- **M4 Presets/Remix**: ✅ done (`docs/superpowers/plans/2026-06-02-presets-and-remixing.md`) — six immutable curated blueprints materialize into fresh ordinary `Project` JSON; `projectStore.remixPreset()` persists independent editable local projects; dashboard shows lightweight CSS summary cards instead of six live Konva stages. Browser-verified: blank start remains; AURORA keynote, N-9 neon hex, and M-7 matte military open in the editor; an edited Mono N-9 survives refresh while a fresh N-9 remix still starts Neon, proving source immutability.
- **M5 Fake Specs + Dual PNG Export**: ✅ done (`docs/superpowers/plans/2026-06-02-specs-and-export.md`) — shared `ChipArtwork` (die/grid/blocks/textures/labels/decorations) drives the editor and two dedicated offscreen Konva export stages; dynamic editor-stage sizing (no preset clipping); autosave flush on teardown; complete block-level z-order; editable fake-spec form + three bundled examples (`editorStore.setSpec`); die-only PNG at `pixelRatio:4` (exact die px ×4) and keynote poster PNG (logical `1600x900` @`pixelRatio:2` → `3200x1800`); Web Share with download fallback. No schema change (reuses `FakeSpec`). Browser-verified (Chrome/Playwright): raster dims confirmed via `sips` (AURORA die 2880², M-7 die 3680×2400, poster 3200×1800); posters carry full artwork + spec typography and **no editor controls**; AURORA/N-9/M-7 posters stay distinct; share falls back to download when `navigator.share` is unavailable. Task 0 also cleared standing M0–M4 nits (glow follows `colorOverride`; em-dash preset names; removed dead `createHero`).
- **M6 Landing/QA/Deploy**: ✅ done (`docs/superpowers/plans/2026-06-02-landing-and-release.md`) — release-hardening debt closed (rotation-aware rect/square clamp; full 16-type `BlockPalette`), direct-start landing page at `/`, project dashboard at `/dashboard`, dashboard polish, README, Netlify SPA fallback config, demo GIF placeholder, final desktop Chrome QA, and final code review. Chrome QA used headless Google Chrome via CDP: first block in 186ms, refresh persistence verified, AURORA poster downloaded at 3200x1800, 150-block smoke completed, no app console errors beyond favicon 404. `npm run build` passes with the known Vite chunk warning. Final review found no release blockers.
- **Pre-merge review fixes**: ✅ done (`docs/superpowers/plans/2026-06-03-pre-merge-review-fixes.md`) — a full-branch review's Important findings were resolved: missing `/editor/:id` shows a not-found view instead of looping on "Loading project…"; persistence validates project shape, skips corrupt records in `list()`, and sticks to the localStorage fallback after a primary failure; poster share guards malformed data URLs and a cancelled share; decorations are documented as an intentional top overlay. `npm test` = 30 files / 112 tests; `npm run build` green. Remaining minor items are backlogged in that plan. The production bundle still exceeds Vite's 500 kB warning (post-MVP code-split candidate).

## Merge Status

- v1 MVP: ✅ merged into `main` via fast-forward (commit `bac1d8e`).
- v2 visual major: ✅ merged into `main` (linear commits, capped by `9e35f2f` "0.1_v2_prototype_complete"); the `v2-m2-editor-redesign` branch no longer exists.
- SoC Custom Studio: ✅ on `main` (same linear history).
- v3 Share Core: 🚧 in progress on `v3-share-core`; merge pending explicit user instruction.

> Visual-quality gate: do not advance past M3 if glow/neon looks amateurish; the first hero chip is manually reviewed against the M0 reference board.

## Document Map

- `README.md` — project overview, features, dev/deploy, docs index, reference board summary, and export QA flow.
- `docs/spec-v1.md` — product/requirements spec (v1 / post-MVP / excluded) **[Korean]**.
- `docs/spec-v2.md` — v2 visual major scope, design direction, and decisions **[Korean]**.
- `docs/reference/` — visual reference board: per-theme tokens, hero compositions, v2 audit/style/hero-set notes.
- `docs/superpowers/plans/` — milestone roadmap + condensed per-milestone plan summaries (goal, decisions, outcome). Full bite-sized TDD steps remain in git history.
- `docs/superpowers/specs/` — design specs for in-progress features.
- `implementation.md` — condensed running log of per-milestone decisions and outcomes **[Korean]**.

## Explicitly Out Of Scope / Deferred to v5+

Mobile viewer/editor · true 3D (Three.js) · AI prompt generation · payments/monetization ·
custom freeform die paths · PixiJS shaders · animation simulation · worldbuilding pages ·
MP4 export · two-way sync / multi-device editing · GDSII/DRC/LVS/manufacturing compatibility.

v3 covers backend + SQLite, accounts, publish/gallery/share links, remix import (deploy-ready, no
public launch). v4 covers moderation, reactions, ranking, contests, remix lineage; a standalone
text board was explicitly rejected (absorbed into per-chip comments + contest announcements).
Public launch is a separate gate decided at v4 start.
