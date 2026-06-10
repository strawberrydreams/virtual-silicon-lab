# SoC Custom Studio — Plan Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Convert the v2 editor into a "Chip Custom Studio": schema v3 studio data, deterministic
global reflow, generated fake spec, semi-auto tile detail, and stickers/sprays that are
export-visible (not editor-only decoration).

**Outcome:** all of the above, shipped across three commits ("add studio item commands to editor
store", "wire studio kit UI, inspector, and shared artwork", "add SoC custom studio editor").
`npm test` 48 files / 203 tests, `npm run build` green; Browser QA passed for tile-detail range,
the four sticker shapes, drag/select/edit of stickers and sprays, generated spec updates, and
export parity (editor canvas vs offscreen export canvas). A 7-angle code review found no merge
blockers; four minor follow-ups (palette rename, reflow rotation guard, micro-tile cap, packRegion
radius fix) were fixed via TDD.

**Key decisions:** schema bumped v1→v2 (studio defaults: `layoutMode`, `detailMode`, `tileSettings`,
`sprays`, `stickers`) then v2→v3 (added `StudioSpray.blend`), each with a migration test; global
reflow is a deterministic grid packer (no physics) shared via `src/studio/globalReflow.ts`;
generated spec (`src/studio/generatedSpec.ts`) derives Compute/Bandwidth/Fantasy/Stability/Style
from tile mix, density, stickers, and sprays; tile detail and sticker shapes render through shared
`ChipArtwork`/`chipLayers` so editor and PNG export use one visual path.

**Main files:** `src/domain/project.ts`, `src/domain/projectMigration.ts`,
`src/domain/studioDefaults.ts`, `src/studio/globalReflow.ts`, `src/studio/generatedSpec.ts`,
`src/visual/tileDetail.ts`, `src/features/editor/canvas/stickerLayout.ts`,
`src/features/editor/{BlockPalette,StudioInspector,TileSettingsPanel}.tsx`,
`src/features/specs/GeneratedSpecPanel.tsx`, `src/stores/editorStore.ts`.
