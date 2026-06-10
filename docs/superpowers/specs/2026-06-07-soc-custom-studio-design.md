# SoC Custom Studio — Design Summary

✅ Implemented; condensed — see git history for full design exploration.

## Goal / Scope

Move the v2 editor beyond an EDA-like freeform block canvas into a "Chip Custom Studio": a playful
SoC assembly surface where tiles auto-arrange via global reflow, detail is semi-automatic, and
stickers/sprays are first-class chip design elements that appear in both editor and PNG export
(die-only and poster). The right rail's primary content becomes a generated Fake Spec derived from
the design, with manual spec editing retained as an override.

## Adopted Data Model

Schema advanced v1 → v2 → v3 (each with a migration path and test):

- **v2** added `Project.studio: StudioState` — `layoutMode: 'global-reflow'`,
  `detailMode: 'semi-auto'`, `tileSettings: { detailDensity, routeIntensity, contactStyle }`,
  `sprays: StudioSpray[]`, `stickers: StudioSticker[]`. Schema v1 records migrate to default
  studio data; existing `blocks`/`decorations` remain the tile source of truth.
- **v3** added `StudioSpray.blend: 'screen' | 'lighten' | 'overlay'`. Schema v2 records keep their
  studio state and backfill `blend: 'screen'`.

See `src/domain/project.ts` and `src/domain/projectMigration.ts` for the current shapes/migrations.

## Global Reflow (adopted)

A deterministic grid packer, not physics: `src/studio/globalReflow.ts` takes blocks, die, a target
block id, and a target x/y, and returns repacked, cloned blocks (no source mutation), preserving
`zIndex`/`id`/`type`/`category` and clamping to die bounds. Insertion/movement of one tile can
shift the whole layout (compute, memory, I/O, fantasy tiles all participate). Generalized later
with a die-shape-aware `packRegion`, rotated-AABB extents, and uniform scale-to-fit when
overcrowded, while preserving rotation.

## Tile Visual Detail (adopted)

`src/visual/tileDetail.ts` maps `StudioTileSettings` (density/route/contact) to render knobs
consumed by `chipLayers` (micro tiles + traces) and `BlockArtwork` (memory contact cells, micro
lines), so the editor and PNG export share one detail path. A `TileSettingsPanel` in the right
rail wires `setTileSettings` (clamped 0..1, single undo step).

## Stickers and Sprays (adopted)

- Sticker kinds each get a distinct shape via `src/features/editor/canvas/stickerLayout.ts`:
  badge = circle, mascot = star, warning = triangle, label = pill. Rendered by
  `StudioStickerArtwork`, with kind-specific presets in `editorStore` (`addSticker(kind)`).
- Sprays carry color, position, radius, intensity, and blend (`addSpray(color)`).
- Both are draggable/selectable in `ChipStage` via injected renderers and a shared Transformer
  (adapted per selected item kind), with `selectedStudioItem` + commands (move/update/duplicate/
  delete/undo) in `editorStore` alongside the existing `selectedBlockId`.
- Tag-based undo coalescing (`resetCoalesce` on select/undo/redo) and `offsetStudioCopy` keep
  duplicate/drag history sane.

## Generated Fake Spec (adopted)

`src/studio/generatedSpec.ts` derives Compute/Bandwidth/Fantasy/Stability/Style from tile mix
(real/fantasy, compute/memory/I-O/fabric), density (block area vs die area), tile detail settings
(route → bandwidth/style, dense contact → compute), stickers (e.g. warning → stability), and spray
color/intensity. Rendered via `GeneratedSpecPanel` above/beside the existing manual `FakeSpecForm`,
which remains for export-text compatibility.

## Editor UI Direction (adopted)

- Left rail: tile/sticker/spray kit (`BlockPalette`, reframed from a block library).
- Center: die stage in global-reflow mode with direct click/drag manipulation and live tile
  detail/stickers/sprays.
- Right rail: `GeneratedSpecPanel`, `TileSettingsPanel`, `StudioInspector` (sticker/spray edit),
  manual spec override, and export controls.

## Resolved Open Questions

- "Do not change schema" rule (carried from earlier v2 planning) was explicitly revised to allow
  `schemaVersion` bumps + migrations whenever the editor model needs explicit studio data — this
  is what enabled v2 and v3.
- First reflow implementation uses a predictable grid packer rather than a physics/spring model,
  per the "deterministic and testable" requirement.
