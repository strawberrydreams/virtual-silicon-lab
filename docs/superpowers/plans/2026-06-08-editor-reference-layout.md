# Editor Reference Layout — Plan Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Rework the editor screen toward a reference SoC-tool layout: command-bar driven,
dense floorplan, left mode rail + library panel, central canvas workspace, right
analysis/selection inspector, and bottom status readout — without disturbing the existing
editor store or Konva chip renderer.

**Outcome:** all four checkpoints complete. Editor now uses a three-zone shell
(`.editor-shell--reference`): left `BlockPalette` split into mode rail + library panel
(search/filter/grid/list, custom tile add); `EditorToolbar` reorganized into metadata row +
shape/theme row + tool strip; right inspector reordered into Studio Analysis, Selected Tile,
Appearance, Layer Visibility, Export; canvas workspace gained coordinate gutters, zoom
controls, and grid/snap/DRC status; bottom status bar added. All checkpoints verified by
targeted tests plus desktop browser QA (and one narrow-viewport pass for checkpoint 4).

**Key decisions:** layout/navigation changes shipped ahead of visual polish so canvas and
export behavior stayed stable throughout; store/canvas logic intentionally untouched; no
commits during execution per user request (checkpoint stops only).

**Main files:** `src/features/editor/EditorPage.tsx`, `src/features/editor/BlockPalette.tsx`,
`src/features/editor/EditorToolbar.tsx`, `src/features/editor/canvas/ChipStage.tsx`,
`src/styles.css`.
