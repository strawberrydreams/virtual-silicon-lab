# Editor Fidelity W4-W5: Inspector Chrome — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Match the reference right rail (W4: six named metrics + a POWER ESTIMATE value & sparkline
+ a HEALTHY badge + a two-line selected-tile name) and the reference chrome (W5: per-tile glyph icons
in the library + leading icons on the primary tools and command bar).

**Outcome:** `generateStudioSpec` was rewritten from a 5-metric (`compute`/`bandwidth`/`fantasy`/
`stability`/`style`) model to six metrics — `compute`, `bandwidth`, `efficiency`, `stability`,
`thermals`, `complexity` — all derived deterministically from block mix, density, sprays, stickers,
and `tileSettings`. It also returns `powerWatts` (positive estimate from compute count, block count,
and thermals), a deterministic 24-point `powerSeries` in `[0,1]` (seeded sine combination), and a
`health: 'healthy' | 'warn' | 'critical'` derived from stability/thermals thresholds.
`GeneratedSpecPanel` now renders all six metric bars, a HEALTHY/WATCH/CRITICAL badge, and a POWER
ESTIMATE block with value + SVG sparkline. `SelectedTilePanel` renders the selected tile's name as a
two-line title/sub via `splitTileLabel` (from the W2 stream). A new shared `src/features/editor/icons.tsx`
exports `TileGlyph` (one inline-SVG glyph per `TextureFamily`: compute/parallel/signal/memory/analog/
clock/io/expressive/synthesis/awareness/distortion/temporal) plus `SelectIcon`/`MoveIcon`/`RotateIcon`/
`ResizeIcon`/`UndoIcon`/`RedoIcon`/`PlayIcon`. `BlockPalette` tiles now show a `TileGlyph` above the
label; `EditorToolbar`'s Select/Move/Rotate/Resize and Undo/Redo gained leading icons; `EditorPage`'s
command-bar Undo/Redo/Simulate gained leading icons. New CSS covers the health badge, sparkline,
selected-tile subname, and icon sizing/spacing across tile buttons, tool buttons, and icon buttons.
Browser-verified against the reference: six metrics + HEALTHY badge + power sparkline in the rail,
two-line selected-tile name with TYPE/SIZE/UTILIZATION/POWER, glyph icons on library tiles, and leading
icons on primary tools/Undo/Redo/Simulate, no console errors.

**Key decisions:**
- Metric keys changed (`fantasy`/`style` removed; `efficiency`/`thermals`/`complexity` added) — this
  is a breaking rename for any other consumer, so the plan explicitly grepped for
  `metrics.fantasy|metrics.style` before rollout to catch stragglers.
- Power/health/sparkline are fully derived and **not persisted** — no schema change.
- `TileGlyph` keys off `blockTexture(type).family`, so palette icons automatically stay in sync with
  whatever texture family the renderer assigns to a block type — no separate icon-to-type mapping to
  maintain.
- `splitTileLabel` (introduced in the W2 stream) is reused for the selected-tile panel, avoiding a
  second label-parsing implementation.
- Deferred to backlog: per-tool icons beyond the primary Select/Move/Rotate/Resize group, and
  command-bar EXPORT relocation.

**Main files:** `src/studio/generatedSpec.ts` (six-metric model, `powerWatts`, `powerSeries`,
`health`), `src/features/specs/GeneratedSpecPanel.tsx` (badge, sparkline, six bars),
`src/features/editor/SelectedTilePanel.tsx` (two-line name), `src/features/editor/icons.tsx` (new —
shared glyph module), `src/features/editor/BlockPalette.tsx`, `src/features/editor/EditorToolbar.tsx`,
`src/features/editor/EditorPage.tsx`, `src/styles.css`.
