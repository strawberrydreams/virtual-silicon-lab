# Editor Fidelity W3-W1: Palette Density — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Make any chip read as a fully-packed, cyan-blueprint SoC die by (W3) tuning the `neon` theme
+ material recipe to the reference palette and (W1) filling empty die regions with deterministic
procedural filler macro-cells rendered through the shared `ChipArtwork`.

**Outcome:** The `neon` theme was retuned to a cyan/green/amber blueprint palette (accents
`['#22d3ee', '#34d399', '#fbbf24']`, dieStroke `#2dd4ee`, near-black navy background `#03050c`,
replacing the prior magenta/purple scheme). `resolveMaterialRecipe` gained a `fillerCell` token group
(`fill`, `stroke`, `accentColors`, `opacity`) derived from theme tokens. A new pure
`src/studio/floorplan.ts` exposes `usableDieRegion(die)` (insets the die by padding, handling
rect/square/circle/hexagon) and `buildFillerCells(project)`, which tiles the usable region with
logic/sram/io macro-cells sized by `tileSettings.detailDensity`, skipping any cell that overlaps a
real block (with margin), capped at 600 cells. `ChipLayerModel` now carries `fillerCells`, and a new
`FillerLayer` (M1-gated, rendered beneath real blocks) draws each cell with the recipe's filler
styling and a `memoryCells`/`standardCellRows` texture. Browser-verified: dies read as fully packed
with cyan-on-navy + green/amber filler accents beneath real blocks; die-only export carries the
filler; M1 toggle hides it; pan/zoom stays responsive.

**Key decisions:**
- Filler cells are a **derived projection** of `blocks` + `die` + `tileSettings.detailDensity` —
  never persisted, so **no schema change**. Determinism comes from a position-based seed
  (`x * 73856093 ^ y * 19349663`), not randomness.
- `usableDieRegion` mirrors the existing `packRegion`/clamp inset logic so filler never escapes
  circle/hex die outlines.
- All filler render data flows through the shared `ChipArtwork` (reusing `CellPattern`,
  `memoryCells`, `standardCellRows`), so die-only and poster exports stay in parity automatically.
- Cell size scales from 120px (sparse, density 0) down to 64px (dense, density 1), with an
  area-based cap (`MAX_FILLER_CELLS = 600`) that grows cell size if the grid would exceed it.

**Main files:** `src/themes/themeTokens.ts` (`neon` palette), `src/visual/materialRecipes.ts`
(`fillerCell` recipe), `src/studio/floorplan.ts` (new — `buildFillerCells`, `usableDieRegion`,
`FillerCell`), `src/visual/chipLayers.ts` (`ChipLayerModel.fillerCells`),
`src/features/editor/canvas/ChipArtwork.tsx` (`FillerLayer`).
