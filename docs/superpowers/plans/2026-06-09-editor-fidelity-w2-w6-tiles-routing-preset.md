# Editor Fidelity W2-W6: Tiles, Routing & Preset — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Bring per-tile fidelity (W2: two-line tile labels + a denser orthogonal bus mesh) and ship
the curated **N1 GREEN HORIZON** floorplan (W6) reproducing the reference image's named SoC blocks,
so opening it ≈ the screenshot.

**Outcome:** `splitTileLabel(label, type)` splits an optional `\n`-separated `Block.label` into an
upper-cased title + sub line; `BlockArtwork` renders both as stacked `Text` nodes. `routedBusPairs(blocks)`
picks the orthogonal bus routes connecting each memory/IO tile to its nearest compute tile (memory =
5-wire bundle, IO = 2-wire), and `BusInterconnectLayer` was rewritten to render these pairs via the
existing `busBundle`/`LinePattern`/`CellPattern` (vias). N1 GREEN HORIZON now has 12 labeled blocks in
a 3x4 grid (CPU CLUSTER, NPU/AI ENGINE, GPU CLUSTER, MEMORY CTRL, L3 CACHE, ISP, PCIe 4.0, DSP AUDIO,
DISPLAY CTRL, MODEM, SECURITY ENCLAVE, I/O COMPLEX) on a 760x760 square die with a refreshed spec.
Browser-verified: two-line tags render, NPU/SECURITY ENCLAVE read violet against cyan, bus mesh draws
orthogonal cyan routes, die-only export carries labels/routing/blocks.

**Key decisions:**
- Two-line labels reuse the existing optional `Block.label` field with a `\n` separator — **no schema
  change**. `splitTileLabel` falls back to the block type when no label is set.
- `routedBusPairs` is a pure nearest-compute-anchor pair selector; `busBundle` was already
  Manhattan/L-shaped, so W2 routing is just pair selection + a layer rewrite, not new geometry.
- The N1 floorplan reuses existing `BlockType`s mapped onto texture families (no new block types);
  `real`/`fantasy` hero-set helpers gained an optional trailing `label` param, keeping all other hero
  sets source-compatible.
- Heavy per-tile texture rewrites were intentionally out of scope — existing `TileTextureOverlay`
  families already cover block interiors; this stream only adds labels + routing + the curated layout.

**Main files:** `src/features/editor/canvas/artworkLayout.ts` (`splitTileLabel`),
`src/features/editor/canvas/busRouting.ts` (`routedBusPairs`, `BusPair`),
`src/features/editor/canvas/ChipArtwork.tsx` (`BlockArtwork`, `BusInterconnectLayer`),
`src/visual/heroSetCatalog.ts` (N1 GREEN HORIZON floorplan + `real`/`fantasy` helpers).
