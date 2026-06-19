# v7-M5 — Gallery / Share Integration + Performance Budget Design

> **Status:** approved design (brainstormed 2026-06-19). Resolves the **open design decision** in the
> M5 sketch (`docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md`): what gallery/share carry
> (interactive viewer vs stored video vs static poster) and the capability fallback. Builds on v7-M0
> (lazy `Chip3DViewer`, pure `Chip3DModel` derivation, WebGL guard), v7-M1 (PBR/PMREM/ACES/bloom),
> v7-M2 (turntable + glow animation), and v7-M3 (browser-side MP4 export). The next step after this spec
> is a bite-sized TDD plan (`docs/superpowers/plans/2026-06-19-v7-m5-gallery-share-integration.md`).
>
> **Also records:** the agreed **v7-M4 drop** (see "v7-M4 disposition" below). M4's optional
> shader-grade 2D enhancement is not built; that decision is folded into M5's close-out so project
> memory stays accurate.

## Goal

Surface the existing 3D showcase **outside the editor** for the first time: an **interactive, lazy 3D
viewer on the gallery detail page** (derived client-side from the published snapshot), a **"View in 3D"
link from the server-rendered share viewer** to that gallery page, and a **performance/capability
budget** that falls back to the static poster when WebGL is unavailable or a chip is too heavy. No
schema, migration, API, or upload change — the gallery already returns the snapshot, and the
`Chip3DModel` is derived in the browser exactly as the editor does it, so gallery 3D and editor 3D are
guaranteed identical. Three.js stays lazy/code-split and must not enter the gallery route's initial
chunk.

The milestone gate: the showcase is reachable from gallery (and linked from share) with a working
low-end fallback; local-first, the Konva PNG export contract, `src/domain/` purity, and the
server-rendered share/crawler contract all hold; the gallery showcase passes the M0 reference-board
visual-quality bar (it is the same renderer as the already-signed-off editor showcase).

## Decisions (resolving the open fork)

- **Gallery carries an interactive viewer, snapshot-derived.** The published gallery snapshot already
  contains everything `buildChipLayers` → `buildChip3DModel(layers, die, resolveChip3DStyle(theme))`
  needs, so the model is built **client-side** with **no schema/API/upload change**. Reuses the shared,
  presentational `Chip3DViewer({ model })`.
- **No stored video tier.** Storing the M3 MP4 on publish was rejected: it would require a new upload
  path + schema/migration + API change and real storage cost, breaking v7's no-schema-change stance.
  The fallback chain is therefore **interactive 3D → static poster**, not interactive → video → poster.
- **Share viewer stays server-rendered; gains only a link.** `server/src/share` keeps its OG/poster/
  crawler contract byte-for-byte; the only change is one **"View in 3D"** anchor to `/gallery/:slug`.
  No client JS and no Three on the share route — the server-rendered share boundary is preserved.
- **Gallery showcase is view-only.** Orbit + play/pause + reset only. The editor-only `VideoExportPanel`
  is **not** mounted in the gallery (export stays an authoring action). This keeps the "video" framing
  out of the read-only public surface, consistent with the no-stored-video decision.
- **Shared showcase glue is extracted, not duplicated.** The mount glue (model derivation, WebGL guard,
  error boundary, `Suspense` + lazy `Chip3DViewer`, play/pause) currently lives inside the editor's
  `Chip3DPreviewToggle.tsx`. It is lifted into a shared presentational `Chip3DShowcase` so the editor and
  gallery are thin consumers, guaranteeing one renderer and one capability path.
- **Performance budget is a pure helper.** `resolveChip3DRenderMode(...)` (domain-pure, no Three import)
  decides `'interactive' | 'poster'` from piece/segment counts and WebGL availability against a budget
  constant. Both the editor and gallery use it, so the budget is centralized.

## Non-Goals / Out of Scope

- **No stored/served video.** MP4 stays a browser-side editor export (M3); nothing is uploaded.
- **No schema / migration / API / upload change.** Gallery and share endpoints are untouched; the
  gallery already returns the snapshot used to derive the model.
- **No interactive 3D on the share route.** Share stays server-rendered HTML; 3D is reached via the
  gallery link only.
- **No editor authoring change.** The 2D Konva editor, autosave, PNG export (die `pixelRatio:4`, poster
  `3200x1800`), and the editor showcase's export panel behave exactly as before.
- **No mobile 3D.** Consistent with the standing v7 exclusion; the gallery showcase follows the same
  desktop-first posture and capability gating as the editor showcase.
- **v7-M4 shader-grade 2D enhancement is not built** (see disposition below).

## Architecture & Components

```text
src/
  visual/chip3d/
    chip3dBudget.ts            NEW  pure resolveChip3DRenderMode(): 'interactive' | 'poster'
    chip3dBudget.test.ts       NEW  unit tests (WebGL on/off, under/over budget)
  three/
    Chip3DViewer.tsx           (unchanged) presentational { model } renderer
    Chip3DShowcase.tsx         NEW  shared glue: derive model, WebGL guard, error boundary,
                                    lazy Chip3DViewer, play/pause, modal a11y (Escape/focus)
  features/
    editor/
      Chip3DPreviewToggle.tsx  MODIFY thin wrapper: Chip3DShowcase + editor-only VideoExportPanel
    gallery/
      GalleryDetailPage.tsx    MODIFY "View in 3D" button → Chip3DShowcase modal (view-only)
server/src/share/*             MODIFY add one "View in 3D" anchor to /gallery/:slug
```

### Data flow

1. **Gallery:** `GalleryDetailPage` has the published snapshot (project JSON + theme). On "View in 3D",
   it mounts `Chip3DShowcase` with that snapshot. `Chip3DShowcase` runs `resolveChip3DRenderMode` over
   the derived model's piece/segment counts + `webglAvailable()`. If `'interactive'`, it lazy-loads and
   renders `Chip3DViewer`; if `'poster'`, the button is hidden/disabled and the poster remains.
2. **Editor:** `Chip3DPreviewToggle` mounts the same `Chip3DShowcase` (identical derivation/guard) and
   additionally renders `VideoExportPanel`. No behavioral change for the editor showcase.
3. **Share:** the server-rendered `/s/:slug` page renders its existing poster + OG meta plus a static
   anchor to `/gallery/:slug`. No model derivation, no Three.

### Component boundaries

- **`Chip3DShowcase`** — input: a `Project`/snapshot + `onClose`; output: a capability-gated showcase
  surface. Depends on `buildChipLayers`, `buildChip3DModel`, `resolveChip3DStyle`, `resolveChip3DRenderMode`,
  and lazily on `Chip3DViewer`. Presentational and reusable; no editor or gallery coupling.
- **`resolveChip3DRenderMode`** — pure function, `src/domain`-style purity (no React/Three/Konva). Input:
  `{ pieceCount, segmentCount, webglAvailable }` (+ budget constant); output: `'interactive' | 'poster'`.
  Unit-tested directly.
- **`Chip3DViewer`** — unchanged; remains the only Three-touching render component, lazy-loaded.

## Performance Budget & Fallback Chain

- **Fallback chain:** `interactive 3D → static poster`. WebGL absent → poster. Chip exceeds the
  piece/segment budget → poster. Otherwise → interactive.
- **Budget constant** lives in `chip3dBudget.ts` (single source). The threshold is tuned during browser
  QA against the heaviest hero/preset chips; the helper is structured so the constant can move without
  touching consumers.
- Reuses the M0 viewer's existing DPR cap, resize handling, and full geometry/material/renderer/context
  disposal — the budget guard is an *admission* check, not a new runtime path.

## Testing Strategy

- **Pure:** `resolveChip3DRenderMode` unit-tested across WebGL on/off and under/over budget (Vitest, no
  canvas) — the only new pure logic.
- **Component:** the `Chip3DShowcase` extraction preserves the editor showcase's existing behavior; the
  gallery consumer is wired and its non-canvas branches (button visibility, poster fallback, modal
  open/close/Escape/focus) are tested where they don't require a real WebGL context. Konva/Three
  rendering stays **browser-verified** per project convention (jsdom lacks canvas).
- **Browser QA (recorded in `docs/ops/3d-showcase-qa.md` or the milestone plan):**
  - Gallery "View in 3D" on a real published chip renders identically to the editor showcase.
  - WebGL-disabled (or over-budget) chip hides the button and keeps the poster — no broken viewer.
  - Share "View in 3D" link resolves to the correct `/gallery/:slug`.
  - Editor showcase + `VideoExportPanel` unchanged after extraction.
- **Gates:** `npm test`, `npm run build`, `npm run typecheck --workspace server`, lint all green;
  **verify `three` is absent from the gallery route's initial chunk** (lazy only) via the build output.

## v7-M4 disposition (recorded decision: dropped)

v7-M4 "Shader-grade 2D Enhancement" was **optional**, with a go/no-go first task. Resolved **no-go**:

1. **The gap is closed.** The 2D Konva pipeline already composites gradient fills, `shadowBlur` glow,
   additive `globalCompositeOperation` blends, procedural memory textures, bus routing, and sticker/tile
   detail — all `toDataURL()`-safe. M1–M3 lifted the 3D path to PBR/PMREM/ACES/bloom with owner
   visual-quality sign-off. No visible 2D/3D fidelity gap remains to bridge.
2. **PixiJS can't satisfy the export invariant cheaply.** Any export-visible effect must composite via
   Konva node settings (PNG `toDataURL()` ignores DOM/CSS/second-canvas overlays), so a PixiJS layer
   would be editor-UI-only unless every effect were re-implemented in Konva anyway — large effort,
   marginal gain, plus a heavy second WebGL renderer fighting the >500 kB bundle budget.
3. **Sanctioned by the roadmap.** v7-M4 is explicitly "optional… may be dropped if M1–M3 already close
   the gap." This exercises that clause.

No `src/visual/filters/`, no PixiJS dependency, no editor/export change. This disposition is recorded in
`implementation.md` and `CLAUDE.md` as part of the M5 close-out, and the v7 roadmap/detailed-plan docs
are updated to mark M4 dropped.

## Milestone Gate

- Interactive 3D showcase reachable from gallery detail; share viewer links to it.
- WebGL-unavailable / over-budget chips fall back cleanly to the static poster.
- `npm test` / `npm run build` / server typecheck / lint green; `three` code-split out of the gallery
  route's initial chunk.
- Local-first, Konva PNG export contract, `src/domain/` purity, and the server-rendered share/crawler
  contract all unchanged.
- v7-M4 drop recorded; decisions/outcomes in `implementation.md` + `CLAUDE.md`.
