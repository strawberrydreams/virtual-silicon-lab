# v7-M2 — Turntable & Animation Design

> **Status:** approved design (brainstormed 2026-06-18). Resolves the **Open design decision** in the
> M2 sketch (`docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md`). Builds on v7-M0
> (lazy `Chip3DViewer`, pure `Chip3DModel`) and v7-M1 (PBR materials, PMREM environment, ACES tone
> mapping, UnrealBloom). The next step after this spec is a bite-sized TDD plan
> (`docs/superpowers/plans/2026-06-18-v7-m2-turntable-animation.md`).

## Goal

Give the 3D showcase a slow camera **turntable** plus a subtle, looping **glow pulse** on the
emissive (fantasy) blocks, so a finished chip reads as a "living product render" rather than a static
model. The showcase **opens paused** (a static premium frame, no idle GPU load), and a Play control
starts the animation. All animation logic is expressed as **pure time functions** so it is
deterministic and unit-testable; `src/three/` only samples and applies them in a requestAnimationFrame
loop while playing.

This milestone carries the v7 **smoothness gate**: a smooth turntable loop with no visible jank on the
target desktop profile.

## Non-Goals / Out of Scope

- No video/GIF export (v7-M3) — but the pure functions are designed so M3 can reuse them with a fixed
  timestep for deterministic capture.
- No layer "settle"/intro animation (the roadmap's optional item) — dropped as YAGNI.
- No theme-proportional pulse amplitude (e.g. neon pulsing harder than mono) — a single subtle
  breathing for all themes in M2; theme-derived pulse can be a later refinement.
- No serialization of animation parameters into `Chip3DModel` — the pure functions carry their own
  default options; M3 can promote them into the model if capture needs it.
- No gallery/share exposure (v7-M5).
- No change to M1 materials/lighting/bloom, the Konva 2D editor/export contract, local-first, or the
  schema. `three` stays isolated in the lazy `src/three/` chunk; no new npm dependency.

## Background / Current State (after M1)

- `src/three/Chip3DViewer.tsx` — presentational `{ model }` component. Rendering is **change-driven**:
  `controls.addEventListener('change', render)` plus `resize`/`reset` handlers; there is **no idle
  rAF loop**. Renders through an `EffectComposer` (RenderPass → UnrealBloomPass). Has a procedural
  PMREM environment, ACES tone mapping, and a three-point rig. Renders a `Reset view` button **inside**
  the viewer shell (`.chip-3d-viewer-shell`), wired by dispatching a `chip3d:reset-view` DOM event the
  effect listens for. Full disposal on unmount (composer/PMREM/envRT/renderer/context/listeners).
  Initial camera: `position = (distance, distance*0.9, distance)`, `target = (0, extent[1]/2, 0)`.
- `src/three/chip3dScene.ts` — `buildChip3DScene(model)` builds one `MeshStandardMaterial` per piece;
  fantasy-block materials have `emissiveIntensity > 0`, all others `0`.
- `src/visual/chip3d/` — pure derivation + the M1 material mapper; no `three` imports.

## Architecture — resolving the Open Design Decision

**Decision: pure time functions.** Animation is `f(elapsedSeconds) → state`, kept in a pure module so
it is deterministic and unit-testable (the roadmap's recommendation; the smoothness/continuity
properties are exactly what tests can pin). `src/three/` samples these in the rAF loop and applies the
results to the camera and the emissive materials.

### New pure module: `src/visual/chip3d/chip3dAnimation.ts` (+ test)

No `three` import. Exported default option constants keep the tunable values centralized (the M1
lesson) so browser-QA tuning is a localized, testable change.

```ts
export type TurntableOptions = { periodSeconds: number }
export type GlowPulseOptions = { periodSeconds: number; min: number; max: number }

export const TURNTABLE: TurntableOptions = { periodSeconds: 14 } // slow full rotation
export const GLOW_PULSE: GlowPulseOptions = { periodSeconds: 3, min: 0.8, max: 1.2 } // ±20% of base

// Constant angular velocity: linear in t, wraps seamlessly at 2π (no jank at the loop boundary).
export function turntableAzimuthAt(elapsedSeconds: number, opts?: TurntableOptions): number

// Sine "breathing" multiplier applied to a fantasy block's BASE emissiveIntensity.
// Continuous and periodic: glowPulseAt(0) ≈ glowPulseAt(periodSeconds).
export function glowPulseAt(elapsedSeconds: number, opts?: GlowPulseOptions): number
```

- `turntableAzimuthAt(t) = (t / periodSeconds) * 2π`. `t=0 → 0`; `t=periodSeconds → 2π` (same camera
  position); strictly increasing.
- `glowPulseAt(t) = min + (max - min) * (0.5 + 0.5 * sin(2π * t / periodSeconds))`. Range `[min, max]`,
  reaches near both ends within a period, `f(0) === f(periodSeconds)`.

### `Chip3DViewer.tsx` changes

The play/pause control lives **inside the viewer**, mirroring the existing in-viewer `Reset view`
button (M0's actual pattern). This keeps the heavy WebGL setup effect keyed only on `[model]` (a play
toggle must not re-run renderer/PMREM/composer setup) and co-locates the control with what it drives.
Consequently **`Chip3DPreviewToggle.tsx` is unchanged** — an intentional departure from the M2 sketch's
"play/pause UI in the toggle".

1. **Collect emissive materials.** After `buildChip3DScene(model)`, traverse the group once for
   `MeshStandardMaterial`s with `emissiveIntensity > 0` and record `{ material, baseIntensity }[]`.
   `chip3dScene.ts` is unchanged.
2. **Play.** Capture the current camera offset relative to the target as `turntableBaseOffset` (so the
   turntable continues from wherever the camera is — no jump, and it respects any manual reframing done
   while paused), set `startTime = performance.now()`, set `controls.enabled = false`, and start the rAF
   loop.
3. **rAF loop (only while playing).** Each frame: `elapsed = (now - startTime) / 1000`; rotate
   `turntableBaseOffset` around the world Y axis by `turntableAzimuthAt(elapsed)`, set
   `camera.position = target + rotatedOffset`, `camera.lookAt(target)`; set each collected material's
   `emissiveIntensity = baseIntensity * glowPulseAt(elapsed)`; `render()` (the existing composer-backed
   render). Re-schedule.
4. **Pause.** Cancel the rAF, restore every collected material's `emissiveIntensity` to its
   `baseIntensity` (static premium frame, no mid-dim freeze), set `controls.enabled = true`, and do one
   change-driven `render()`. The camera stays where it is (OrbitControls resumes from the current
   position — no jump).
5. **Reset view.** Restores the initial camera position/target as today. If playing, also set
   `turntableBaseOffset` to the initial offset and `startTime = now` so the orbit continues from the
   initial framing.
6. **Disposal.** Add `cancelAnimationFrame(raf)` to the existing unmount cleanup (alongside
   composer/PMREM/envRT/renderer/context/listener teardown).

A small play/pause state drives the button label and the loop; it is local to the viewer (a `useState`
for the label plus a ref the rAF closure reads, or equivalent) and must not re-run the `[model]` setup
effect.

## Data Flow

```
Playing, each frame:
  elapsed → turntableAzimuthAt(elapsed) → rotate base offset about Y → camera.position / lookAt(target)
          → glowPulseAt(elapsed) → material.emissiveIntensity = baseIntensity * pulse   (bloom breathes with it)
          → render()  (EffectComposer + UnrealBloom)
Paused:
  rAF cancelled, emissive restored to base, controls.enabled = true, change-driven render() (idle GPU load = 0)
```

## Testing Strategy

- **Pure unit tests (`chip3dAnimation.test.ts`):** `turntableAzimuthAt` — `t=0 → 0`, `t=period → 2π`,
  strictly increasing across a sampled grid, loop continuity (`f(period) - f(0) === 2π`). `glowPulseAt`
  — always within `[min, max]`, `f(0) ≈ f(period)` (continuity), reaches near `min` and near `max`
  within one period, deterministic at sampled `t`. Vitest with explicit
  `import { describe, expect, it } from 'vitest'`.
- **Viewer rAF / play-pause / performance:** browser-verified, not unit-tested (jsdom has no WebGL),
  per the documented convention. Verify: opens paused (static), Play starts a smooth turntable + glow
  breathing, Pause freezes to a clean static frame and restores free orbit, Reset behaves under both
  states, and unmount cancels the loop (no leaked rAF).
- **Smoothness gate (milestone gate):** measure frame timing over a few seconds of playback on the
  target desktop (e.g. via `requestAnimationFrame` sampling in the browser) and confirm no visible
  jank; owner sign-off recorded in `implementation.md`.

## Invariants & Risks

- **Purity:** `src/visual/chip3d/chip3dAnimation.ts` imports nothing from `three`/React; `three` stays
  only in `src/three/`.
- **Idle cost:** the rAF loop runs **only while playing**; paused keeps M0/M1's change-driven model
  (idle GPU load ≈ 0). Opening paused means zero animation cost until the user opts in.
- **Bundle:** no new npm dependency; the pure module is tiny and lives in the existing `visual` chunk;
  viewer changes stay in the lazy `three` chunk.
- **2D/export/local-first untouched;** M1 materials/lighting/bloom unchanged.
- **Smoothness risk (the real risk):** the gate is "no jank." Linear azimuth + sine pulse are
  inherently smooth and loop-seamless; DPR is already capped at 2 and the loop only runs on play. If a
  large chip janks, the period/amplitude constants are centralized in the pure module for localized
  tuning, and a heavier perf budget/low-end fallback remains M5's responsibility.
- **No-jump interaction:** capturing the current offset on Play and leaving the camera in place on
  Pause avoids visible camera jumps across state transitions and respects manual reframing.

## Affected Files

- **Create:** `src/visual/chip3d/chip3dAnimation.ts` + `src/visual/chip3d/chip3dAnimation.test.ts`
- **Modify:** `src/three/Chip3DViewer.tsx` (collect emissive materials; play/pause state + button; rAF
  loop driving camera/glow from the pure functions; controls enable/disable; reset/dispose updates)
- **Unchanged:** `src/three/chip3dScene.ts`, `src/features/editor/Chip3DPreviewToggle.tsx`,
  `src/visual/chip3d/chip3dModel.ts`, `src/visual/chip3d/chip3dMaterials.ts`
- **Docs:** `implementation.md` (v7-M2 entry), `CLAUDE.md` (Milestone Status)

## Milestone Gate

A smooth turntable loop with subtle glow breathing, no visible jank on the target desktop; opens
paused and Play/Pause/Reset behave correctly with no camera jumps; `npm test` / `npm run build` /
`npm run typecheck --workspace server` / `npm run lint` green with `three` still code-split out of the
core bundle; 2D editor/export, local-first, and the M1 look all unaffected.
