# Editor Reference Fidelity — Design Summary

✅ Implemented; condensed — see git history for full design exploration.

**Goal/Scope:** The editor's three-zone shell already matched the reference image
structurally (`docs/superpowers/plans/2026-06-08-editor-reference-layout.md`, all four
checkpoints done). This initiative closed the remaining **visual fidelity** gap so the
running editor looks pixel-near the reference: a dense, realistic SoC floorplan packing the
whole die, rich per-block texture, bright cyan bus routing, a cyan blueprint palette, a
six-metric analysis rail with a power sparkline, and chrome polish (tile glyph icons,
command-bar icons, rulers).

## Adopted Design Decisions

- **Approach: extend the existing pure builders + shared `ChipArtwork`** (rejected:
  pre-baked image/sprite tiles — non-deterministic, no theme retint, breaks the
  procedural/serializable identity).
- **Filler cells are a pure projection of `blocks` + `die`, not persisted** — no
  `schemaVersion` bump, no migration. Reuses the existing block model.
- **All new render data flows through shared `ChipArtwork`**, keeping die-only and poster
  exports in parity automatically; no DOM/CSS visual effects, no DOM scraping in export.
- **Fantasy tiles share the dense realistic substrate**, layering fantasy meso patterns on
  top, preserving the playful SoC Custom Studio identity.
- Pure layout/spec/routing logic stays out of Konva components for unit-testability; Konva
  rendering is verified in the browser.

## Workstreams (scope adopted)

- **W1 — Dense floorplan + filler cells:** deterministic projection filling empty die
  regions with procedural micro-macros (logic fields, SRAM banks, contact arrays), reusing
  the `globalReflow` packer's grid logic. Lives in `src/studio/floorplan.ts`, integrated via
  `src/visual/chipLayers.ts` and `ChipArtwork.tsx`.
- **W2 — Per-tile detail + bus routing:** category-specific meso patterns, L-shaped cyan bus
  bundles with vias gated by `routeIntensity`, block title/sub-label. Konva node caching and
  per-die-area caps to preserve ~60fps and the 150-block layer smoke.
- **W3 — Cyan blueprint palette + glow + seal ring:** near-black navy background, cyan die
  edge glow, accent cells, seal ring/corner brackets, in `src/visual/materialRecipes.ts` /
  theme tokens / `ChipArtwork.tsx`.
- **W4 — Right inspector parity:** six metrics (Compute, Bandwidth, Efficiency, Stability,
  Thermals, Complexity), a POWER ESTIMATE value + sparkline, a HEALTHY badge, and a rich
  Selected Tile detail (TYPE / SIZE / UTILIZATION / POWER + thumbnail), in
  `src/studio/generatedSpec.ts`, `SelectedTilePanel.tsx`, `StudioInspector.tsx`.
- **W5 — Chrome marquee polish:** inline-SVG tile glyph icons, command-bar icons (SIMULATE,
  EXPORT, undo/redo/fit), gutter/ruler/zoom styling, typography pass — `BlockPalette.tsx`,
  `EditorToolbar.tsx`, `ChipStage.tsx`, `styles.css`.
- **W6 — Curated reference preset (N1 GREEN HORIZON):** a preset reproducing the reference
  floorplan (CPU CLUSTER, NPU, GPU CLUSTER, MEMORY CTRL, L3 CACHE, ISP, PCIe, DSP AUDIO,
  DISPLAY CTRL, MODEM, SECURITY ENCLAVE, I/O COMPLEX) on a square cyan-gradient die, in
  `src/visual/heroSetCatalog.ts` / `src/presets/presetFactory.ts`.

## Sequencing & Verification

Executed largest-jump-first: W3+W1, then W2, W6, W4, W5. Every workstream gated on
`npm test`, `npm run build`, and a browser screenshot of `/editor/:id` compared against the
reference image (CLAUDE.md visual-quality gate).

## Resolved Decisions

- Target was **pixel-near, all four gaps**, not a partial pass.
- Both general dense-floorplan capability and a curated exact-match preset were built (not
  either/or).
- No commits during execution; decisions/results recorded in `implementation.md` per
  project convention.

## Non-goals

No schema change/migration, no physics/3D/mobile/backend (v3-deferred per CLAUDE.md), and no
rebuild of the already-matching shell structure.
