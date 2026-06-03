# Virtual Silicon Lab — MVP Roadmap

Build the static-hosted MVP as a sequence of working, testable milestones. All milestones (M0–M6)
are complete; per-milestone plans are condensed alongside this file (full TDD scripts in git history).

**Architecture:** versioned project JSON in a pure domain layer → IndexedDB repository (localStorage
fallback) → Zustand stores expose editing commands → React Konva renders editable content while
dedicated Konva stages render exports. Saved JSON is the single source of truth.

**Stack:** Vite, React, TypeScript, Tailwind v4, Zustand, Konva/React Konva, idb, Vitest + RTL +
fake-indexeddb.

## Stable file boundaries

- `domain/` pure (no React/Konva/Zustand/IndexedDB); `storage/` persists/migrates only; `stores/`
  owns commands (duplicate/delete/reorder/undo/redo).
- Canvas components take serializable data and emit domain changes; export stages never scrape editor DOM.
- Every persisted schema change bumps `schemaVersion`, adds a migration test, and is noted in `implementation.md`.

## Milestones (all ✅)

- **M0** Reference board + per-theme visual direction (no code) — `docs/reference/`.
- **M1** Foundation slice: scaffold, versioned project JSON + migration, IndexedDB + fallback,
  project CRUD, rectangular-die editor with bounded drag, refresh persistence.
- **M2** Editor core: four die shapes, zoom/pan/grid/snap, resize/rotate, bounded for all shapes,
  selection, undo/redo/delete/duplicate/reorder, shortcuts, debounced autosave.
- **M3** Visual system: `themes/` catalog (5 themes) + gradients + style resolvers, theme-driven
  rendering, decorations, first hero chip, Konva PNG export smoke test.
- **M4** Presets/remix: six curated parametric presets, preview cards, remix → independent project.
- **M5** Fake specs + dual PNG export: spec form + examples, die-only + poster Konva export stages,
  high-DPI, Web Share + download fallback.
- **M6** Landing/QA/deploy: landing + dashboard polish, README, static hosting config, Chrome QA,
  final review; closed pre-release debt (rotation-aware clamp, full block palette).

## Explicitly deferred (post-MVP)

custom freeform die paths · PixiJS/Three.js shaders · animation simulation · backend sharing ·
gallery/rankings · AI generation · worldbuilding · responsive mobile · true 3D · MP4 · login ·
GDSII/DRC/LVS/manufacturing formats.
