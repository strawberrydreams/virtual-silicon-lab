# Editor Core (Milestone 2) — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Turn the M1 rectangular-only editor into a full editor core: four die shapes with bounded
drag/resize, zoom/pan/grid/snap, resize + rotate, selection, undo/redo/delete/duplicate/reorder,
keyboard shortcuts, and a debounced autosave that never pollutes undo history.

**Outcome:** all of the above, with die-bound clamping for every shape. All commands unit-tested via
`store.getState()`; Chrome-verified with a 150-block smoke test.

**Key decisions:** split into a pure **editor engine** (vanilla Zustand `editorStore`) and a thin
canvas/UI layer; geometry/clamp/zoom/shortcut/debounce math are pure functions tested directly; Konva
rendering is browser-verified, not unit-tested (jsdom lacks canvas).

**Main files:** `src/stores/editorStore.ts`, `src/features/editor/canvas/{geometry,viewport}.ts`,
`src/features/editor/{shortcuts,useEditorShortcuts,useAutosave}.ts`, `EditorToolbar`, `ChipStage`.
