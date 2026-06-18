# v7-M3 — MP4 Export Design

> **Status:** approved design (brainstormed 2026-06-18). Resolves the **open technology fork** in the
> M3 sketch (`docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md`): WebCodecs vs
> `ffmpeg.wasm`. Builds on v7-M0 (lazy `Chip3DViewer`, pure `Chip3DModel`), v7-M1 (PBR/PMREM/ACES/
> bloom), and v7-M2 (pure `turntableAzimuthAt`/`glowPulseAt`). The next step after this spec is a
> bite-sized TDD plan (`docs/superpowers/plans/2026-06-18-v7-m3-mp4-export.md`) whose **first task is a
> feasibility spike** (like M0).

## Goal

Add a **new export path** that renders the M2 turntable + glow animation to a **downloadable, seamless
1280×720 / 30fps / ~8s MP4** of the 3D showcase. Encoding is browser-side via **WebCodecs**
(`VideoEncoder`, hardware-accelerated) muxed to MP4 with a small **`mp4-muxer`** library, both
lazy-loaded / code-split so they never enter the core bundle. The existing Konva PNG export contract
(die `pixelRatio:4`, poster `3200x1800`) is **untouched**.

This is the highest-risk v7 milestone (a browser-side video encoder is genuinely uncertain), so the
plan's **first task is a throwaway feasibility spike** that proves in-browser encode + playback + bundle
isolation before any committed build. The milestone gate: a downloadable, correctly-dimensioned MP4 of
the showcase that plays and loops seamlessly; PNG exports unchanged; encoder code-split out of core.

## Decisions (resolving the open fork)

- **Encoding: WebCodecs + `mp4-muxer`.** Native `VideoEncoder` (H.264/AVC, HW-accelerated, fast, no wasm
  payload) emits encoded chunks; the dynamically-imported `mp4-muxer` muxes them into an MP4 `Blob`.
  Aligned with the project's desktop-first Chrome target. `ffmpeg.wasm` was rejected for its ~25–30 MB
  wasm payload and slow in-browser encode.
- **Format: MP4 / H.264 only.** GIF and WebM are dropped as YAGNI (GIF also isn't a WebCodecs output).
- **Output: 1280×720, 30fps, ~8s seamless loop.** The clip captures exactly one full turntable
  rotation (2π) re-timed to the capture duration, and the glow completes an integer number of cycles,
  so the last frame joins the first with no visible seam. ~240 frames.
- **Deterministic capture.** Frames are produced by sampling the M2 pure functions at a **fixed
  timestep** (`t = i / fps`), not from the live wall-clock rAF loop. This makes capture reproducible and
  unit-testable at the frame-spec level.
- **New dependency: `mp4-muxer`** (small, tree-shakeable), dynamically imported so it lands only in the
  lazy chunk — consistent with the v7 invariant that the encoder is lazy-loaded/code-split. WebCodecs
  itself is a browser API (no dependency).

## Non-Goals / Out of Scope

- No GIF/WebM/audio/4K; no resolution/duration selection UI (fixed `CAPTURE` constants for M3).
- No change to the Konva 2D editor or the PNG export stages (die/poster), local-first, or the schema.
- No gallery/share exposure of the video (v7-M5).
- No change to the M1 materials/lighting/bloom look or the M2 animation timing for the **live** viewer
  (the capture re-times the same pure functions; the live turntable cadence is unchanged).

## Background / Current State (after M2)

- `src/visual/chip3d/chip3dAnimation.ts` — pure `turntableAzimuthAt(elapsedSeconds, opts?)` (radians,
  linear) and `glowPulseAt(elapsedSeconds, opts?)` (emissive multiplier, sine), with `TURNTABLE`
  (`periodSeconds: 14`) and `GLOW_PULSE` (`periodSeconds: 3, min: 0.8, max: 1.2`) defaults. No `three`.
- `src/three/Chip3DViewer.tsx` — lazy presentational `{ model }` viewer: WebGL renderer (`alpha: true`),
  procedural PMREM environment from `model.environment.top/bottomColor`, ACES tone mapping
  (`model.environment.exposure`), a hardcoded three-point rig + hemisphere, an `EffectComposer`
  (RenderPass → `UnrealBloomPass` from `model.environment.bloom`), OrbitControls, and (M2) a Play/Pause
  rAF turntable/glow loop. Camera: `position = (distance, distance*0.9, distance)`,
  `target = (0, extent[1]/2, 0)`, `distance = max(extent[0], extent[2]) * 0.95`.
- `src/three/chip3dScene.ts` — `buildChip3DScene(model)` builds the chip group (one
  `MeshStandardMaterial` per piece; fantasy materials have `emissiveIntensity > 0`);
  `disposeChip3DScene(group)`.
- `src/features/export/` — existing PNG `DieExportStage`/`PosterExportStage` (Konva), untouched here.
- `src/features/editor/Chip3DPreviewToggle.tsx` — the "Open 3D showcase" full-screen modal hosting the
  viewer.

## Architecture

### ① Pure capture spec — `src/visual/chip3d/chip3dCapture.ts` (+ test)

No `three` import. Produces deterministic per-frame animation state by reusing the M2 pure functions
with capture-specific options that guarantee a seamless loop.

```ts
export type CaptureSpec = {
  width: number
  height: number
  fps: number
  durationSeconds: number
  glowCycles: number // integer glow breaths per clip → seamless loop
}

export const CAPTURE: CaptureSpec = { width: 1280, height: 720, fps: 30, durationSeconds: 8, glowCycles: 3 }

export type CaptureFrame = { tSeconds: number; azimuth: number; glow: number }

export function captureFrameCount(spec?: CaptureSpec): number // Math.round(duration * fps)
export function captureFrameAt(index: number, spec?: CaptureSpec): CaptureFrame
```

- `captureFrameCount(CAPTURE) = round(8 * 30) = 240`.
- `captureFrameAt(i)`: `t = i / fps`; `azimuth = turntableAzimuthAt(t, { periodSeconds: durationSeconds })`
  (one full 2π over the clip); `glow = glowPulseAt(t, { periodSeconds: durationSeconds / glowCycles,
  min: GLOW_PULSE.min, max: GLOW_PULSE.max })` (integer cycles over the clip).
- Frame 0 → `azimuth = 0`, glow at midpoint; frame `count` would be `azimuth = 2π` (= frame 0) and glow
  back to start — we capture frames `0..count-1`, so the wrap is seamless.

### ② Shared stage helpers — `src/three/chip3dStage.ts` (new)

Extracted so the live viewer and the offscreen recorder define the lighting + environment **once**,
preventing drift between the interactive showcase and the exported video (the video must match the
live look).

```ts
export function addShowcaseLights(scene: THREE.Scene): void
// HemisphereLight(0xc8dcff,0x08080c,1.2) + key DirectionalLight(0xfff1e0,3.2, castShadow) at (1,2,1)
//   + fill DirectionalLight(0xbcd0ff,1.1) at (-1.5,1,1.2) + rim DirectionalLight(0xffffff,1.6) at (-0.5,1.2,-2)

export function createShowcaseEnvironment(
  renderer: THREE.WebGLRenderer,
  model: Chip3DModel,
): { texture: THREE.Texture; dispose: () => void }
// PMREM from a top/bottom gradient (model.environment) → texture for scene.environment; dispose frees PMREM + RT
```

### ③ `Chip3DViewer.tsx` (modify)

Refactor to call `addShowcaseLights(scene)` and `createShowcaseEnvironment(renderer, model)` instead of
its inline copies. No behavior change to the live showcase (same look, same M2 Play/Pause/turntable);
re-verified in the browser.

### ④ Encoder — `src/three/chip3dEncoder.ts` (new, lazy)

Wraps WebCodecs + `mp4-muxer`. `mp4-muxer` is imported with a dynamic `import('mp4-muxer')` so it stays
in the lazy chunk.

```ts
export function isMp4ExportSupported(): boolean
// typeof VideoEncoder !== 'undefined' (capability guard; static availability check)

export type Mp4Encoder = {
  addFrame(frame: VideoFrame, keyFrame: boolean): void
  finish(): Promise<Blob> // flush() + muxer.finalize() → Blob({ type: 'video/mp4' })
}

export async function createMp4Encoder(opts: { width: number; height: number; fps: number }): Promise<Mp4Encoder>
// dynamic import('mp4-muxer'); Muxer(ArrayBufferTarget, video: { codec: 'avc', width, height, frameRate: fps });
// VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error }); encoder.configure({
//   codec: 'avc1.42E01F' (H.264 baseline/level for 720p), width, height, bitrate, framerate: fps })
```

(The exact `avc1.*` codec string + bitrate are confirmed during the Task 1 spike against the installed
`mp4-muxer`/browser.)

### ⑤ Recorder — `src/three/chip3dRecorder.ts` (new)

Orchestrates the offscreen render → encode pipeline. Browser-only (WebGL + WebCodecs).

```ts
export async function recordTurntableMp4(
  model: Chip3DModel,
  opts?: { spec?: CaptureSpec; onProgress?: (fraction: number) => void; signal?: AbortSignal },
): Promise<Blob>
```

- Build an **offscreen** `WebGLRenderer` sized to `spec.width × spec.height` with an **opaque
  background** (the theme backdrop — MP4 has no alpha), ACES tone mapping/exposure from
  `model.environment`, `buildChip3DScene(model)`, `addShowcaseLights`, `createShowcaseEnvironment`, a
  perspective camera framed exactly like the viewer (same `distance`/`target`), and an `EffectComposer`
  + `UnrealBloomPass` from `model.environment.bloom`.
- Collect the emissive (fantasy) materials once (same traversal as the viewer).
- `const encoder = await createMp4Encoder({ width, height, fps })`. For `i` in `0..count-1`:
  `const { azimuth, glow } = captureFrameAt(i, spec)`; rotate the base camera offset about Y by
  `azimuth`, `camera.lookAt(target)`; set each fantasy material's `emissiveIntensity = base * glow`;
  `composer.render()`; `const frame = new VideoFrame(renderer.domElement, { timestamp: i * 1e6 / fps })`;
  `encoder.addFrame(frame, i % fps === 0)`; `frame.close()`; `onProgress((i + 1) / count)`.
- `const blob = await encoder.finish()`; dispose composer/PMREM/scene/renderer/context; return `blob`.

### ⑥ UI — `src/features/export/VideoExportPanel.tsx` (new, + test)

Mirrors the existing PNG `ExportPanel` UX. `{ model, name }` props.

- If `!isMp4ExportSupported()`: render a short "MP4 export isn't available in this browser" notice.
- Otherwise an **Export turntable MP4** button → calls `recordTurntableMp4(model, { onProgress })`,
  shows a 0–100% progress indicator while encoding, then downloads the `Blob` as
  `{slugified name}-turntable.mp4` via an object URL + a temporary `<a download>` (revoking the URL
  after). Disable the button while encoding; surface an error message if the promise rejects.

### ⑦ `Chip3DPreviewToggle.tsx` (modify)

Mount `<VideoExportPanel model={model} name={project.name} />` in the showcase modal (e.g. the header
area beside Close), so the export lives with the 3D showcase it captures.

## Data Flow

```
Export click → recordTurntableMp4(model):
  offscreen renderer (1280×720, opaque) + buildChip3DScene + addShowcaseLights + createShowcaseEnvironment + composer/bloom
  for i in 0..239:
    captureFrameAt(i) → camera azimuth (Y-rotate offset) + lookAt(target); fantasy emissive = base * glow
    composer.render() → VideoFrame(canvas, ts=i*1e6/30) → encoder.addFrame(frame, i%30===0)
    onProgress((i+1)/240)
  encoder.finish() → flush + mp4-muxer.finalize() → Blob(video/mp4)
  dispose all → download "{name}-turntable.mp4"
```

## Testing Strategy

- **Pure unit tests (`chip3dCapture.test.ts`):** `captureFrameCount(CAPTURE) === 240`; `captureFrameAt(0)`
  → `azimuth === 0`, `tSeconds === 0`; azimuth strictly increases and the would-be frame at `count`
  equals `2π` (seamless: `captureFrameAt(count-1).azimuth < 2π`); glow stays in `[min, max]` and
  `captureFrameAt(0).glow ≈ glowPulseAt(count/fps)` continuity; deterministic at sampled indices. Vitest
  with explicit `import { describe, expect, it } from 'vitest'`.
- **Panel test (`VideoExportPanel.test.tsx`):** mock `../../three/chip3dRecorder` so `recordTurntableMp4`
  resolves a fake `Blob` and invokes `onProgress`; mock `URL.createObjectURL`/`revokeObjectURL` and the
  anchor click; assert the button triggers the recorder, progress is shown, and a download with the
  expected filename fires. Assert the unsupported-browser branch renders its notice (mock
  `isMp4ExportSupported` → false). Tests never touch WebGL/WebCodecs.
- **Recorder + encoder:** browser-verified (WebGL + WebCodecs unavailable in jsdom), per the documented
  convention. Covered by the Task 1 spike and the Task 7 browser QA.
- **Feasibility spike (Task 1, throwaway):** encode a few seconds of the turntable in-browser, confirm
  the file plays at the right dimensions and loops, and confirm `mp4-muxer`/WebCodecs land in a separate
  lazy chunk (not core). Record go/no-go in `implementation.md`.
- **Regression:** the PNG export paths are unchanged — die `pixelRatio:4` and poster `3200x1800` still
  verified (existing tests + a quick browser re-check).
- **Milestone gate (owner):** a downloadable, correctly-dimensioned MP4 that plays and loops seamlessly;
  PNG exports unchanged; `mp4-muxer`/encoder code-split out of the core bundle.

## Invariants & Risks

- **Purity:** `src/visual/chip3d/chip3dCapture.ts` imports only from `chip3dAnimation` (pure); no `three`.
  `three` and WebCodecs/`mp4-muxer` stay in `src/three/` and the lazy chunk.
- **Bundle:** `mp4-muxer` is dynamically imported (in the encoder) so it never enters the core `index-*`
  chunk; the spike + gate re-verify this and that `three` remains code-split.
- **PNG/2D/local-first untouched;** the live showcase look + M2 timing unchanged (shared-stage refactor
  is behavior-preserving, re-QA'd).
- **Encoder uncertainty (the real risk):** browser-side MP4 muxing via WebCodecs + `mp4-muxer` is the
  milestone's core risk — the Task 1 spike de-risks codec string/bitrate, `VideoFrame`-from-canvas, and
  muxer wiring before any committed build. WebCodecs is unavailable on some browsers; `isMp4ExportSupported`
  gates the UI to a graceful notice (the project is desktop-first Chrome).
- **Fidelity drift:** the offscreen recorder must look like the live showcase — `chip3dStage` shares the
  lighting + environment so they cannot diverge; materials/bloom are already model-driven.
- **Determinism:** capturing from the pure functions at a fixed timestep (not wall-clock) makes the video
  reproducible and the frame spec unit-testable.
- **Color:** the offscreen render uses an opaque theme-backdrop background (MP4 has no alpha) with the
  same ACES tone mapping/exposure as the live viewer.

## Affected Files

- **Create:** `src/visual/chip3d/chip3dCapture.ts` (+ test); `src/three/chip3dStage.ts`;
  `src/three/chip3dEncoder.ts`; `src/three/chip3dRecorder.ts`;
  `src/features/export/VideoExportPanel.tsx` (+ test)
- **Modify:** `src/three/Chip3DViewer.tsx` (use shared stage helpers);
  `src/features/editor/Chip3DPreviewToggle.tsx` (mount the panel); `package.json`/lockfile (`mp4-muxer`)
- **Unchanged:** PNG export stages (`DieExportStage`/`PosterExportStage`), `chip3dModel.ts`,
  `chip3dMaterials.ts`, `chip3dAnimation.ts`
- **Docs:** `implementation.md` (spike note + v7-M3 entry), `CLAUDE.md` (Milestone Status, local-only)

## Milestone Gate

A downloadable 1280×720 / 30fps MP4 of the turntable that plays and loops seamlessly; PNG die
(`pixelRatio:4`) / poster (`3200x1800`) exports unchanged; `mp4-muxer` + WebCodecs encoder code-split out
of the core bundle; `npm test` / `npm run build` / `npm run typecheck --workspace server` /
`npm run lint` green; the live showcase look + M2 animation unaffected; owner sign-off recorded.
