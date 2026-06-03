# Fake Specs And Dual PNG Export (Milestone 5) — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Edit a fake spec sheet, export a high-DPI die-only PNG and a keynote poster PNG, and share
with a download fallback.

**Outcome:** shared `ChipArtwork` (die/grid/blocks/textures/labels/decorations) drives the editor and
two dedicated offscreen Konva export stages; dynamic editor-stage sizing (no preset clipping); autosave
flush on teardown; complete block-level z-order; fake-spec form + three bundled examples
(`editorStore.setSpec`); die-only PNG at `pixelRatio:4`; poster logical `1600x900` @ `pixelRatio:2`
→ `3200x1800`; Web Share with download fallback. Raster sizes verified via `sips`.

**Key decisions:** no schema change (reuses `FakeSpec`); export stages composite Konva-only — they never
scrape editor DOM and never inherit editor zoom/pan/selection; a cancelled share is not turned into a
download; Task 0 also cleared standing M0–M4 review nits (glow follows `colorOverride`; em-dash preset
names; removed dead `createHero`).

**Main files:** `src/features/editor/canvas/{ChipArtwork,artworkLayout}.ts(x)`, `src/features/specs/`,
`src/features/export/`.
