# v7-M1 – M6 Detailed Plans (design-pending where flagged)

> **For agentic workers:** This document deepens the v7 outline
> (`docs/superpowers/plans/2026-06-18-v7-visual-depth-roadmap.md`) for milestones M1–M6 into
> concrete files, tasks, and gates. **It is NOT yet a bite-sized TDD plan.** Only **v7-M0** has been
> brainstormed to design depth (`docs/superpowers/specs/2026-06-18-v7-m0-3d-showcase-foundation-design.md`
> + `…-v7-m0-3d-showcase-foundation.md`). Each milestone below has an **"Open design decision
> (resolve at start)"** block; some forks (M3 encoder, M4 PixiJS adoption) are genuinely open and a
> bite-sized plan with real test/impl code can only be written **after** that milestone's
> brainstorm/spec. Do not fabricate exact code for the open forks before then.

**Why this shape:** the user asked for M0–M6 detailed plans up front. M0 is fully bite-sized; M1–M6
are detailed at the task/interface/gate level but explicitly defer per-step code to each milestone's
just-in-time spec, because (a) M1–M6 were not brainstormed to design depth, (b) M3/M4 carry open
technology forks, and (c) the M0 feasibility spike can change downstream assumptions.

**Carried invariants (every milestone):** 2D Konva authoring + PNG export contract unchanged
(die `pixelRatio:4`, poster `3200x1800`); `src/domain/` purity; `three`/encoder/PixiJS lazy-loaded
& code-split; local-first unaffected; the M0 reference-board visual-quality gate applies to all 3D
output; admin desktop-only. Each milestone ends green on `npm test`/`build`/typecheck/lint and is
recorded in `implementation.md` + `CLAUDE.md`.

**Builds on M0:** `buildChip3DModel(layers, die, palette): Chip3DModel` (`src/visual/chip3d/`),
`buildChip3DScene` + `Chip3DViewer` (`src/three/`), the editor 3D-preview toggle.

---

## v7-M1 — 3D Material & Lighting

**Goal:** Make the 3D showcase read as premium (the v2/v3 visual-quality bar), not flat boxes.

**Open design decision (resolve at start):** how the existing `ChipMaterialRecipe`
(`src/visual/materialRecipes.ts`: package/dieBase/metalTrace/microTile/glassGlow tokens, all 2D
Konva-oriented) maps to 3D PBR-ish materials (metalness/roughness/emissive) + lighting rig. Confirm
whether to extend `Chip3DModel` pieces with a `material` descriptor (recommended: keep the model
serializable, push PBR params into it) vs resolving materials inside `src/three/`.

**Anticipated files:**
- Create: `src/visual/chip3d/chip3dMaterials.ts` (+ test) — pure `resolveChip3DMaterials(recipe): Chip3DMaterialSet` mapping recipe tokens → PBR params (metalness, roughness, emissive color/intensity). Unit-tested.
- Modify: `src/visual/chip3d/chip3dModel.ts` — replace the flat `color` per piece with a `material` ref (or add alongside), keeping it serializable.
- Modify: `src/three/chip3dScene.ts` — `MeshStandardMaterial`/`MeshPhysicalMaterial` from the resolved set; emissive glow for fantasy/`glow` blocks.
- Modify: `src/three/Chip3DViewer.tsx` — proper lighting rig (key/fill/rim + environment), tone mapping.
- Modify: `src/features/editor/Chip3DPreviewToggle.tsx` — drop the M0 flat-color palette stand-in; use the real material resolution.

**Tasks (deliverable · gate):**
1. Pure `resolveChip3DMaterials` mapping recipe → PBR params (unit-tested) · all 5 themes resolve to plausible metalness/roughness/emissive.
2. `Chip3DModel` carries serializable material refs (migrate M0 flat color; update M0 tests) · `npm test` green.
3. `chip3dScene` builds PBR materials + emissive glow · browser: materials look like metal/substrate, glow reads.
4. `Chip3DViewer` lighting rig + tone mapping · browser visual-quality review (manual gate, M0 board).
5. Gate + docs · `npm test`/`build`/typecheck/lint green; manual visual-quality sign-off recorded.

**Milestone gate:** the 3D showcase passes the manual visual-quality review at the same bar as the v2/v3 visual gates.

---

## v7-M2 — Turntable & Animation

**Goal:** Camera turntable + subtle looping layer/glow animation, smooth on the target desktop.

**Open design decision (resolve at start):** animation as **pure keyframe/time functions**
(recommended — `f(t) → camera/glow state`, testable) vs imperative tweening inside the viewer.
Decide loop length, easing, and which elements animate (camera orbit always; glow pulse for
`glow`/fantasy blocks; optional layer "settle").

**Anticipated files:**
- Create: `src/visual/chip3d/chip3dAnimation.ts` (+ test) — pure `cameraOrbitAt(t, opts)`, `glowPulseAt(t, opts)` returning serializable state; unit-tested (deterministic at sampled `t`).
- Modify: `src/three/Chip3DViewer.tsx` — drive camera + emissive intensity from the pure functions in the rAF loop; play/pause control.
- Modify: `src/features/editor/Chip3DPreviewToggle.tsx` — play/pause UI.

**Tasks (deliverable · gate):**
1. Pure animation functions (unit-tested at sampled times, loop continuity `f(0)≈f(period)`) · `npm test` green.
2. Viewer drives camera/glow from them + play/pause · browser: smooth loop.
3. Performance check (frame timing on target desktop) · no visible jank.
4. Gate + docs · gates green; QA recorded.

**Milestone gate:** a smooth turntable loop with no jank on the target desktop profile.

---

## v7-M3 — MP4 / GIF Export (highest-risk; open technology fork)

**Goal:** Export the turntable/animation as a downloadable, correctly-dimensioned video — a **new**
export path that leaves the Konva PNG export contract untouched.

**Open design decision (resolve at start — REQUIRES its own brainstorm/spec + spike):**
**WebCodecs vs `ffmpeg.wasm`** for browser-side encoding (the M3 fork called out in the roadmap).
Decide container/codec (MP4/H.264 vs WebM/VP9), GIF support yes/no, target dims/fps/duration, and
the capture method (render N frames offscreen at fixed timestep → encode). A feasibility spike
precedes the build, like M0. **No bite-sized code until this is settled.**

**Anticipated files:**
- Create: `src/three/chip3dCapture.ts` — render the animation to N offscreen frames at a fixed timestep (deterministic, reuses M2 pure animation).
- Create: `src/three/chip3dEncoder.ts` — lazy-loaded encoder (WebCodecs or ffmpeg.wasm per the decision); code-split so it never enters the core bundle.
- Create: `src/features/export/VideoExportPanel.tsx` (+ test with encoder mocked) — trigger, progress, download. Mirrors the existing `ExportPanel` UX.
- Untouched: `src/features/export/exportStage.ts`, `DieExportStage`, `PosterExportStage` (PNG contract).

**Tasks (deliverable · gate):**
1. Feasibility spike: encode a few seconds of turntable in-browser; confirm dims/fps, file plays, bundle isolation · go/no-go recorded.
2. Deterministic frame capture from M2 animation · frame count/timestep correct (unit-testable at the capture-spec level).
3. Lazy encoder integration · downloadable video, correct dimensions.
4. `VideoExportPanel` UI + progress + download (encoder mocked in tests) · panel test green.
5. Regression: PNG exports unchanged · die `pixelRatio:4` / poster `3200x1800` still verified.
6. Gate + docs · gates green; encoder in a separate chunk; QA recorded.

**Milestone gate:** a downloadable, correctly-dimensioned video of the showcase; PNG exports unchanged; encoder code-split out of the core bundle.

---

## v7-M4 — Shader-grade 2D Enhancement (optional; open adoption decision)

**Goal:** Optionally push 2D glow/material fidelity in the editor/export with a WebGL/PixiJS filter
layer, bridging 2D and 3D quality.

**Open design decision (resolve at start):** **adopt PixiJS/WebGL at all?** The roadmap says this may
be **dropped** if M1–M3 already close the 2D/3D quality gap. First task is a go/no-go review. If
adopted, the hard constraint: any enhancement that must appear in PNG export has to composite on the
Konva/offscreen pipeline (Konva node settings), **not** DOM/CSS — DOM/CSS effects are editor-UI-only
and are ignored by `toDataURL()`.

**Anticipated files (only if adopted):**
- Create: `src/visual/filters/…` (pure filter parameter resolution) + a lazy WebGL/PixiJS layer module.
- Modify: editor canvas + export stages to composite the filter without breaking the PNG contract.

**Tasks (deliverable · gate):**
1. Go/no-go review (is the gap real after M1–M3?) · decision recorded — **may end the milestone here**.
2. (If adopted) lazy filter layer in the editor · improved 2D fidelity, no core-bundle growth.
3. (If adopted) export-path compositing · PNG export still carries the effect (no DOM/CSS leak); die/poster dims unchanged.
4. Gate + docs.

**Milestone gate:** either a recorded decision to drop M4, or improved 2D fidelity with the Konva PNG export contract still intact (no DOM/CSS-only effects leaking into exports).

---

## v7-M5 — Gallery / Share Integration + Performance Budget

**Goal:** Surface the 3D showcase (and M3 video) in gallery detail + share; add a 3D performance
budget and low-end fallback.

**Open design decision (resolve at start):** what gallery/share carry — interactive 3D viewer vs a
pre-rendered turntable video (M3) vs a static poster fallback — per device capability. Confirm the
WebGL-unavailable fallback (full version of M0's basic guard) and whether the showcase reuses
`Chip3DViewer` directly (promote it out of `features/editor` if shared) — the M0 spec kept the viewer
a presentational `{ model }` component precisely to allow this.

**Anticipated files:**
- Modify: gallery detail page + share viewer to embed the showcase/video with a capability-gated fallback.
- Possibly move/promote: `Chip3DViewer` to a shared location if used outside the editor.
- Create: a performance-budget guard (cap piece/segment count, fallback to poster when WebGL absent or low-end).

**Tasks (deliverable · gate):**
1. Capability detection + fallback chain (interactive → video → static poster) · graceful on no-WebGL.
2. Gallery detail embeds the showcase · loads lazily, no core-bundle growth.
3. Share viewer embeds the showcase/video (server-rendered share contract respected) · crawler/share unaffected.
4. Performance budget guard · bounded on large chips.
5. Gate + docs.

**Milestone gate:** showcase + video reachable from gallery/share with a working low-end fallback; local-first + Konva export invariants hold.

---

## v7-M6 — Final QA & Release

**Goal:** Final regression + browser QA across all v7 surfaces; bundle/perf sign-off; version/docs.

**Anticipated files:** `docs/ops/` QA notes (new `3d-showcase-qa.md`), `README.md` version line (→ 0.5
v7), `CLAUDE.md` Milestone Status, `implementation.md`.

**Tasks (deliverable · gate):**
1. Full regression: 2D editor/export, autosave, all themes, hero presets unaffected · `npm test`/`build`/typecheck/lint green.
2. 3D browser QA matrix: derivation fidelity across die shapes + hero sets, materials/lighting, turntable, video export, gallery/share embed, WebGL-off fallback · recorded in `docs/ops/3d-showcase-qa.md`.
3. Bundle/perf sign-off: `three`/encoder/(PixiJS) code-split out of core; core bundle and FPS within budget · recorded.
4. Version bump (0.5 v7) + Milestone Status + finishing-a-development-branch · branch integrated.

**Milestone gate:** all gates green with 3D/encoder code split out of the core bundle; showcase + video reachable from gallery/share; local-first + Konva export invariants hold; version line at 0.5 (v7).

---

## Next Steps

1. Execute **v7-M0** from `docs/superpowers/plans/2026-06-18-v7-m0-3d-showcase-foundation.md`
   (feasibility spike first).
2. At each of M1–M6's start, run that milestone's brainstorm/spec to resolve its **Open design
   decision**, then expand its task list here into a bite-sized TDD plan (M3 and M4 especially need
   their own spike/spec before any code).
3. Per-milestone: record decisions/outcomes in `implementation.md`, update `CLAUDE.md` Milestone
   Status.
