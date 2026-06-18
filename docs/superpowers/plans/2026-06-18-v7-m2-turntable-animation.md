# v7-M2 Turntable & Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slow camera turntable + a subtle emissive glow pulse to the 3D showcase, driven by pure time functions, with the showcase opening paused and a Play/Pause control — no jank, no idle GPU load when paused.

**Architecture:** A new pure module `src/visual/chip3d/chip3dAnimation.ts` (no `three`) exposes `turntableAzimuthAt(t)` and `glowPulseAt(t)` plus default option constants. `Chip3DViewer.tsx` collects the emissive (fantasy) materials once, adds an in-viewer Play/Pause button (same DOM-event pattern as the existing Reset button), and runs a requestAnimationFrame loop **only while playing** that rotates the captured camera offset by `turntableAzimuthAt` and breathes each fantasy material's emissive by `glowPulseAt`. Paused restores M0/M1's change-driven OrbitControls rendering.

**Tech Stack:** Vite · React + TypeScript · `three` (lazy chunk, no new dep) · Vitest (pure functions only; the viewer rAF/play-pause is browser-verified per the jsdom/WebGL convention).

**Spec:** `docs/superpowers/specs/2026-06-18-v7-m2-turntable-animation-design.md`.

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- `src/visual/chip3d/` stays PURE: imports only from `domain`/`visual`/`themes`. NO `three`, NO React. `three` is imported ONLY in `src/three/`.
- Three.js rendering is browser-verified, NOT unit-tested (jsdom lacks WebGL) — by documented project convention. The viewer changes (Task 2) have no unit test; correctness is `npm run build` + Task 3 browser QA.
- The rAF loop runs **only while playing**; paused keeps the change-driven model (idle GPU load ≈ 0). The showcase opens **paused**.
- No new npm dependency. `three` stays in the lazy `Chip3DViewer-*` chunk, not the core `index-*` chunk.
- 2D Konva editor/export contract, local-first, schema, and the M1 materials/lighting/bloom are all UNCHANGED.
- Vitest with explicit `import { describe, expect, it } from 'vitest'` (no globals).
- One concern per commit. TDD for the pure module: failing test → confirm fail → minimal impl → confirm pass → commit.
- Docs (`/docs/`) and `CLAUDE.md` are gitignored in this repo; `CLAUDE.md` is intentionally local-only (do not commit it). Add plan/spec files with `git add -f`; `implementation.md` is tracked at the repo root.
- End commit messages with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 1: Pure `chip3dAnimation` time functions

**Files:**
- Create: `src/visual/chip3d/chip3dAnimation.ts`
- Test: `src/visual/chip3d/chip3dAnimation.test.ts`

**Interfaces:**
- Consumes: nothing (pure math).
- Produces: `TurntableOptions`, `GlowPulseOptions` types; `TURNTABLE`, `GLOW_PULSE` default constants; `turntableAzimuthAt(elapsedSeconds: number, opts?: TurntableOptions): number` (radians); `glowPulseAt(elapsedSeconds: number, opts?: GlowPulseOptions): number` (emissive multiplier).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { GLOW_PULSE, TURNTABLE, glowPulseAt, turntableAzimuthAt } from './chip3dAnimation'

describe('turntableAzimuthAt', () => {
  it('starts at 0 and completes exactly one revolution per period', () => {
    expect(turntableAzimuthAt(0)).toBe(0)
    expect(turntableAzimuthAt(TURNTABLE.periodSeconds)).toBeCloseTo(Math.PI * 2, 10)
  })

  it('increases monotonically and adds exactly 2π per period (seamless wrap)', () => {
    const period = TURNTABLE.periodSeconds
    let prev = -Infinity
    for (let i = 0; i <= 10; i += 1) {
      const a = turntableAzimuthAt((period * i) / 10)
      expect(a).toBeGreaterThan(prev)
      prev = a
    }
    expect(turntableAzimuthAt(period) - turntableAzimuthAt(0)).toBeCloseTo(Math.PI * 2, 10)
  })

  it('honors a custom period', () => {
    expect(turntableAzimuthAt(5, { periodSeconds: 10 })).toBeCloseTo(Math.PI, 10)
  })
})

describe('glowPulseAt', () => {
  it('stays within [min, max] across a sampled grid', () => {
    const { periodSeconds, min, max } = GLOW_PULSE
    for (let i = 0; i <= 40; i += 1) {
      const v = glowPulseAt((periodSeconds * i) / 40)
      expect(v).toBeGreaterThanOrEqual(min - 1e-9)
      expect(v).toBeLessThanOrEqual(max + 1e-9)
    }
  })

  it('is continuous across the loop boundary', () => {
    expect(glowPulseAt(0)).toBeCloseTo(glowPulseAt(GLOW_PULSE.periodSeconds), 10)
  })

  it('reaches near min and near max within one period', () => {
    const { periodSeconds, min, max } = GLOW_PULSE
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i <= 200; i += 1) {
      const v = glowPulseAt((periodSeconds * i) / 200)
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
    expect(lo).toBeLessThan(min + (max - min) * 0.02)
    expect(hi).toBeGreaterThan(max - (max - min) * 0.02)
  })

  it('starts at the midpoint (sine phase 0) and is deterministic', () => {
    const mid = (GLOW_PULSE.min + GLOW_PULSE.max) / 2
    expect(glowPulseAt(0)).toBeCloseTo(mid, 10)
    expect(glowPulseAt(1.234)).toBe(glowPulseAt(1.234))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/visual/chip3d/chip3dAnimation.test.ts`
Expected: FAIL (module/functions not found).

- [ ] **Step 3: Write minimal implementation**

```ts
export type TurntableOptions = { periodSeconds: number }
export type GlowPulseOptions = { periodSeconds: number; min: number; max: number }

// Centralized, tunable defaults (browser QA may adjust these — keep them here, not in src/three/).
export const TURNTABLE: TurntableOptions = { periodSeconds: 14 } // slow full rotation
export const GLOW_PULSE: GlowPulseOptions = { periodSeconds: 3, min: 0.8, max: 1.2 } // ±20% of base emissive

// Constant angular velocity: linear in t, so it wraps seamlessly at 2π (no jank at the loop boundary).
export function turntableAzimuthAt(elapsedSeconds: number, opts: TurntableOptions = TURNTABLE): number {
  return (elapsedSeconds / opts.periodSeconds) * Math.PI * 2
}

// Sine "breathing" multiplier in [min, max], starting at the midpoint; continuous and periodic.
export function glowPulseAt(elapsedSeconds: number, opts: GlowPulseOptions = GLOW_PULSE): number {
  const phase = (elapsedSeconds / opts.periodSeconds) * Math.PI * 2
  return opts.min + (opts.max - opts.min) * (0.5 + 0.5 * Math.sin(phase))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/visual/chip3d/chip3dAnimation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/visual/chip3d/chip3dAnimation.ts src/visual/chip3d/chip3dAnimation.test.ts
git commit -m "feat(v7): pure turntable + glow-pulse time functions"
```

---

### Task 2: Turntable + glow pulse + Play/Pause in the viewer

**Files:**
- Modify: `src/three/Chip3DViewer.tsx` (full new contents below)
- Modify: `src/styles.css` (add the Play button styling)

**Interfaces:**
- Consumes: `turntableAzimuthAt`, `glowPulseAt` from `../visual/chip3d/chip3dAnimation` (Task 1); existing `buildChip3DScene`/`disposeChip3DScene`; `Chip3DModel` (with `environment`/`extent`).
- Produces: an in-viewer Play/Pause control and a turntable/glow animation loop. No exported-API change (`Chip3DViewer` is still `({ model })`).

**Convention:** Three rendering is browser-verified, not unit-tested. No new test file here; the gate is `npm run build` + the existing (mocked-viewer) toggle test still passing + Task 3 browser QA.

- [ ] **Step 1: Replace `src/three/Chip3DViewer.tsx` with the new contents**

```tsx
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import { glowPulseAt, turntableAzimuthAt } from '../visual/chip3d/chip3dAnimation'
import { buildChip3DScene, disposeChip3DScene } from './chip3dScene'

const UP = new THREE.Vector3(0, 1, 0)

export default function Chip3DViewer({ model }: { model: Chip3DModel }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  // A new model remounts the scene paused; keep the button label in sync.
  useEffect(() => {
    setPlaying(false)
  }, [model])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = model.environment.exposure
    host.append(renderer.domElement)

    const scene = new THREE.Scene()

    // Procedural studio environment: a vertical gradient → PMREM → image-based
    // reflections on metal surfaces. Tinted by the theme backdrop so reflections
    // read on-theme. No external HDRI asset (keeps the chunk asset-free).
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    const top = new THREE.Color(model.environment.topColor)
    const bottom = new THREE.Color(model.environment.bottomColor)
    envScene.background = top
    const envGround = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshBasicMaterial({ color: bottom, side: THREE.BackSide }),
    )
    envScene.add(envGround)
    const envRT = pmrem.fromScene(envScene, 0.04)
    scene.environment = envRT.texture
    envGround.geometry.dispose()
    ;(envGround.material as THREE.Material).dispose()

    const chip = buildChip3DScene(model)
    scene.add(chip)

    // Collect emissive (fantasy) materials so the glow pulse can breathe them.
    const pulsers: { material: THREE.MeshStandardMaterial; base: number }[] = []
    chip.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.material instanceof THREE.MeshStandardMaterial &&
        object.material.emissiveIntensity > 0
      ) {
        pulsers.push({ material: object.material, base: object.material.emissiveIntensity })
      }
    })

    // Three-point rig + low ambient. Key warm/strong (shadow), fill cool/soft, rim/back.
    scene.add(new THREE.HemisphereLight(0xc8dcff, 0x08080c, 1.2))
    const key = new THREE.DirectionalLight(0xfff1e0, 3.2)
    key.position.set(1, 2, 1)
    key.castShadow = true
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xbcd0ff, 1.1)
    fill.position.set(-1.5, 1, 1.2)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 1.6)
    rim.position.set(-0.5, 1.2, -2)
    scene.add(rim)

    const distance = Math.max(model.extent[0], model.extent[2]) * 0.95
    const camera = new THREE.PerspectiveCamera(42, 1, 1, distance * 10)
    const initialPosition = new THREE.Vector3(distance, distance * 0.9, distance)
    camera.position.copy(initialPosition)

    const controls = new OrbitControls(camera, renderer.domElement)
    const target = new THREE.Vector3(0, model.extent[1] / 2, 0)
    controls.target.copy(target)
    controls.enableDamping = false
    controls.minDistance = distance * 0.45
    controls.maxDistance = distance * 3
    controls.update()

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      model.environment.bloom.strength,
      model.environment.bloom.radius,
      model.environment.bloom.threshold,
    )
    composer.addPass(bloom)

    const render = () => composer.render()

    // --- Turntable + glow pulse (the rAF loop runs only while playing) ---
    let raf = 0
    let startTime = 0
    const baseOffset = new THREE.Vector3()
    const frameOffset = new THREE.Vector3()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      frameOffset.copy(baseOffset).applyAxisAngle(UP, turntableAzimuthAt(elapsed))
      camera.position.copy(target).add(frameOffset)
      camera.lookAt(target)
      const pulse = glowPulseAt(elapsed)
      for (const p of pulsers) p.material.emissiveIntensity = p.base * pulse
      render()
      raf = requestAnimationFrame(animate)
    }
    const play = () => {
      if (raf) return
      baseOffset.copy(camera.position).sub(target) // continue from the current framing — no jump
      startTime = performance.now()
      controls.enabled = false
      animate()
    }
    const pause = () => {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
      for (const p of pulsers) p.material.emissiveIntensity = p.base // static frame, no mid-dim freeze
      controls.enabled = true
      controls.update() // re-sync OrbitControls' internal state from the current camera pose (no jump on next drag)
      render()
    }
    const onSetPlay = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) play()
      else pause()
    }

    const resize = () => {
      const width = host.clientWidth || 640
      const height = host.clientHeight || 420
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      composer.setSize(width, height)
      bloom.setSize(width, height)
      render()
    }
    const resetView = () => {
      if (raf) {
        // playing: restart the orbit from the initial framing
        baseOffset.copy(initialPosition).sub(target)
        startTime = performance.now()
      } else {
        camera.position.copy(initialPosition)
        controls.target.copy(target)
        controls.update()
        render()
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    controls.addEventListener('change', render)
    host.addEventListener('chip3d:reset-view', resetView)
    host.addEventListener('chip3d:set-play', onSetPlay)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.removeEventListener('change', render)
      host.removeEventListener('chip3d:reset-view', resetView)
      host.removeEventListener('chip3d:set-play', onSetPlay)
      controls.dispose()
      disposeChip3DScene(chip)
      envRT.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [model])

  const resetView = () => {
    hostRef.current?.dispatchEvent(new Event('chip3d:reset-view'))
  }
  const togglePlay = () => {
    const next = !playing
    setPlaying(next)
    hostRef.current?.dispatchEvent(new CustomEvent('chip3d:set-play', { detail: next }))
  }

  return (
    <div className="chip-3d-viewer-shell">
      <div ref={hostRef} className="chip-3d-viewer" data-testid="chip-3d-viewer" />
      <button className="chip-3d-viewer__play" type="button" onClick={togglePlay}>
        {playing ? 'Pause' : 'Play turntable'}
      </button>
      <button className="chip-3d-viewer__reset" type="button" onClick={resetView}>
        Reset view
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add the Play button styling in `src/styles.css`**

The Play button reuses the shared viewer-button look and sits bottom-left (Reset stays bottom-right). Make three edits:

(a) Add `.chip-3d-viewer__play,` to the base-style group selector. Change:
```css
.chip-3d-showcase__header button,
.chip-3d-viewer__reset {
```
to:
```css
.chip-3d-showcase__header button,
.chip-3d-viewer__play,
.chip-3d-viewer__reset {
```

(b) Add `.chip-3d-viewer__play:hover,` to the hover group selector. Change:
```css
.chip-3d-showcase__header button:hover,
.chip-3d-viewer__reset:hover {
```
to:
```css
.chip-3d-showcase__header button:hover,
.chip-3d-viewer__play:hover,
.chip-3d-viewer__reset:hover {
```

(c) Immediately after the existing `.chip-3d-viewer__reset { position: absolute; right: 1rem; bottom: 1rem; }` rule, add:
```css
.chip-3d-viewer__play {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
}
```

- [ ] **Step 3: Verify the existing toggle test still passes**

Run: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx`
Expected: PASS (the viewer is mocked there; geometry/model unchanged so its assertions hold).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exits 0. `three` stays in the lazy `Chip3DViewer-*` chunk (note name/size); core `index-*` unchanged by Three's weight.

- [ ] **Step 5: Commit**

```bash
git add src/three/Chip3DViewer.tsx src/styles.css
git commit -m "feat(v7): turntable + glow-pulse animation with Play/Pause in the showcase"
```

---

### Task 3: Gates, smoothness QA, and docs

**Files:**
- Modify: `implementation.md` (v7-M2 entry), `CLAUDE.md` (Milestone Status — local-only, do NOT commit)

- [ ] **Step 1: Full automated gates**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green — client suite includes the new 6 `chip3dAnimation` tests; build shows `three` in the lazy `Chip3DViewer-*` chunk, not the core `index-*` chunk. Record the chunk name + size.

- [ ] **Step 2: Browser smoothness QA (milestone gate)**

Run: `npm run dev -- --host 127.0.0.1 --port 5273`. In the browser: dashboard → Remix a chip with fantasy blocks (e.g. **N1 GREEN HORIZON**) → editor → **Open 3D showcase**. Verify:
- Opens **paused** — a static frame, no motion.
- **Play turntable** → the camera orbits smoothly and the fantasy blocks' glow breathes (bloom pulses with it); no jank.
- **Pause** → freezes to a clean static frame (glow restored to base), and dragging now orbits freely with no camera jump.
- **Reset view** → reframes correctly both while playing and while paused.
- Closing the showcase and reopening still works; switching to a **mono** chip (e.g. LUCID MONO PACKAGE, no fantasy blocks) plays the turntable with no glow pulse and no error.

Measure frame timing over a few seconds of playback (paste into the browser console):
```js
let n = 0, last = performance.now(), max = 0
const id = setInterval(() => {}, 0); clearInterval(id)
function tick(now){ const dt = now - last; last = now; if (n++ > 5) max = Math.max(max, dt); if (n < 180) requestAnimationFrame(tick); else console.log('frames', n, 'worst frame ms', max.toFixed(1)) }
requestAnimationFrame(tick)
```
Expected: worst frame well under a visible-jank threshold (~33 ms / 30fps) on the target desktop; record the worst-frame number. Confirm no 3D-related console errors (a `/api/...` 404 from the unran API server is unrelated and expected).

- [ ] **Step 3: Record + commit docs**

Append a `## V7-M2 Turntable & Animation (2026-06-18)` entry to `implementation.md` (pure time-function decision, in-viewer Play/Pause via DOM events, paused-on-open + rAF-only-while-playing, no-jump play/pause/reset handling, emissive collection, smoothness QA + worst-frame number, bundle/gates). Update the v7 Milestone Status in `CLAUDE.md` (M2 ✅) — `CLAUDE.md` is gitignored/local-only, do not commit it.

```bash
git add -f implementation.md docs/superpowers/plans/2026-06-18-v7-m2-turntable-animation.md
git commit -m "docs(impl): record v7-M2 turntable & animation"
```

(Verify `git status` before committing; `implementation.md` is tracked at the repo root, so the `-f` applies to the gitignored `docs/` path — drop `-f` for any path already tracked.)

---

## Self-Review

**1. Spec coverage:**
- Pure `turntableAzimuthAt`/`glowPulseAt` + centralized default constants (spec "New pure module") → Task 1 ✓
- Linear azimuth (seamless 2π wrap) + sine pulse `[min,max]` continuity → Task 1 tests ✓
- Opens paused; rAF only while playing → Task 2 (`playing` defaults false, loop started only on `play()`) + Global Constraints ✓
- In-viewer Play/Pause (toggle unchanged); same DOM-event pattern as Reset → Task 2 ✓
- Collect emissive materials; breathe `emissiveIntensity = base * pulse`; restore on pause → Task 2 ✓
- Capture current offset on Play (no jump); leave camera in place + re-sync controls on Pause; Reset under both states → Task 2 ✓
- Disable controls while playing; re-enable + change-driven render when paused → Task 2 ✓
- `cancelAnimationFrame` added to disposal → Task 2 cleanup ✓
- Smoothness gate (frame timing, no jank) + gates green + `three` code-split → Task 3 ✓
- Invariants (chip3d purity, three-only-in-src/three, no dep, 2D/export/local-first/M1 untouched) — no task violates them ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code (the full viewer file is given verbatim rather than as a diff to avoid ambiguity). Browser-verified Task 2 correctly omits a unit test per the documented convention; the smoothness check in Task 3 uses a concrete console snippet, not vague "check performance".

**3. Type consistency:** `turntableAzimuthAt(elapsedSeconds, opts?)`/`glowPulseAt(elapsedSeconds, opts?)` and `TURNTABLE`/`GLOW_PULSE`/`TurntableOptions`/`GlowPulseOptions` are defined in Task 1 and consumed unchanged in Task 2's imports and calls. The `chip3d:set-play` CustomEvent (boolean `detail`) is dispatched in `togglePlay` and read in `onSetPlay` consistently; `chip3d:reset-view` matches the existing M0/M1 event name. The new CSS classes `.chip-3d-viewer__play` match the JSX `className`. `MeshStandardMaterial.emissiveIntensity` (set in M1's `chip3dScene.ts`) is the field the pulse reads/writes.

## Notes

- The turntable/pulse constants live in `chip3dAnimation.ts` (`TURNTABLE`, `GLOW_PULSE`) so browser-QA tuning is a localized, testable change — no magic numbers in `src/three/`.
- `pause()` calls `controls.update()` to re-sync OrbitControls' internal spherical state from the camera pose the turntable left it in, preventing a camera jump on the user's first drag after pausing.
- The pure functions are deterministic in elapsed time, so v7-M3 can reuse them with a fixed timestep for deterministic offscreen video capture — no change needed here.
