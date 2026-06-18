# v7-M0 3D Showcase Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a finished chip in 3D in the editor from its existing serializable `Project`, via a pure derivation from the 2D `ChipLayerModel` plus a lazy-loaded Three.js viewer — without touching the 2D editor/export path or the core bundle.

**Architecture:** Mirror the 2D split. Pure derivation `buildChip3DModel` (in `src/visual/chip3d/`, no React/Three) consumes the existing `ChipLayerModel` + `Die` + a flat-color palette and returns a serializable `Chip3DModel`. A `Chip3DViewer` (in `src/three/`, the only place `three` is imported, lazy-loaded) renders it. An editor "3D preview" toggle lazy-mounts the viewer; nothing 3D loads until opened.

**Tech Stack:** Vite · React + TypeScript · `three` + `@types/three` (lazy/code-split) · Vitest (pure derivation + toggle component test with the viewer mocked). Three rendering is browser-verified, not unit-tested (jsdom lacks WebGL).

**Spec:** `docs/superpowers/specs/2026-06-18-v7-m0-3d-showcase-foundation-design.md`.

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- `src/domain/` stays pure (no React/Konva/Three/IndexedDB/browser imports). The 3D **derivation** lives in `src/visual/` (already a pure layer that imports only from domain). `three` is imported **only** in `src/three/`.
- **Konva 2D export contract is unchanged:** die-only `pixelRatio:4`, poster `3200x1800`. 3D is an additive, separate path.
- **Local-first unchanged:** 3D is a client-only derivation of in-memory `Project`; no schema change, no server dependency.
- M0 visual bar is **geometry-first (flat color)** — premium PBR/lighting/glow is v7-M1.
- One concern per commit. TDD: failing test → confirm fail → minimal impl → confirm pass → commit.

> **Signature note (refines the spec):** `buildChip3DModel` takes a third arg `palette: Chip3DPalette` ({ die, blockReal, blockFantasy } flat colors). `ChipLayerModel` carries `package.color` but not resolved die/block colors, so the caller passes a small palette resolved from the theme. This keeps color policy out of the pure geometry derivation.

---

### Task 1: Feasibility spike (precedes the build; go/no-go)

**Files:** none committed (throwaway). Record outcome in `implementation.md`.

A throwaway proof that the three risks in the spec are clear before committing the real build. Do **not** keep the spike code.

- [ ] **Step 1: Install Three.js**

Run: `npm install three && npm install -D @types/three`
Expected: both added to `package.json`; `npm ls three` shows a version.

- [ ] **Step 2: Throwaway lazy viewer + render a real chip's boxes**

In a scratch branch or temp component, dynamic-`import('three')` inside a component, mount an `OrbitControls`-driven scene, and render one box per block bounds of a real hero preset (use `createHeroChip`/a preset `Project` → `buildChipLayers`). Confirm in the browser (`npm run dev -- --host 127.0.0.1`) that the chip is recognizable in 3D and orbit is smooth on the target desktop.

- [ ] **Step 3: Measure bundle isolation**

Run: `npm run build`
Expected: the build output lists a **separate chunk** containing `three` (e.g. a `Chip3DViewer-*.js` or `three-*.js` chunk), and the main `index-*.js` chunk does **not** grow by Three's full weight. Note the chunk name/size.

- [ ] **Step 4: Record go/no-go**

Append a short spike note to `implementation.md` (bundle isolation result + chunk size, render fidelity, orbit FPS, go/adjust decision). If any risk fails, stop and revise the approach before Task 2.

```bash
git add package.json package-lock.json implementation.md
git commit -m "chore(v7): add three dep + record v7-M0 feasibility spike"
```

---

### Task 2: Pure `Chip3DModel` derivation

**Files:**
- Create: `src/visual/chip3d/chip3dModel.ts`
- Test: `src/visual/chip3d/chip3dModel.test.ts`

**Interfaces:**
- Consumes: `ChipLayerModel` from `src/visual/chipLayers.ts` (`buildChipLayers(project)`), `Die` from `src/domain/project.ts`.
- Produces: `buildChip3DModel(layers: ChipLayerModel, die: Die, palette: Chip3DPalette): Chip3DModel`; types `Chip3DModel`, `Chip3DPiece`, `Footprint`, `Chip3DPalette`, `Vec3`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildChipLayers } from '../chipLayers'
import { createProject } from '../../domain/projectFactory'
import { buildChip3DModel, type Chip3DPalette } from './chip3dModel'

const palette: Chip3DPalette = { die: '#101820', blockReal: '#8aa0b4', blockFantasy: '#d76a4a' }

function rectProjectWithBlocks() {
  const project = createProject('3D Test')
  project.die = { shape: 'rect', width: 800, height: 500, background: '#101820' }
  project.blocks = [
    { id: 'b-real', type: 'cpu', category: 'real', x: 100, y: 80, w: 120, h: 90, rotation: 0, zIndex: 0 },
    { id: 'b-fan', type: 'consciousness', category: 'fantasy', x: 400, y: 200, w: 140, h: 100, rotation: 0, zIndex: 1 },
  ]
  return project
}

describe('buildChip3DModel', () => {
  it('stacks package below die below blocks, with package color from the layer model', () => {
    const project = rectProjectWithBlocks()
    const layers = buildChipLayers(project)
    const model = buildChip3DModel(layers, project.die, palette)

    const pkg = model.pieces.find((p) => p.kind === 'package')!
    const die = model.pieces.find((p) => p.kind === 'dieBase')!
    const blocks = model.pieces.filter((p) => p.kind === 'blockSurface')

    expect(pkg.baseZ).toBe(0)
    expect(pkg.color).toBe(layers.package.color)
    expect(die.baseZ).toBe(pkg.baseZ + pkg.depth) // die sits on the package
    expect(die.color).toBe(palette.die)
    expect(blocks).toHaveLength(2)
    for (const b of blocks) {
      expect(b.baseZ).toBe(die.baseZ + die.depth) // blocks sit on the die
    }
  })

  it('extrudes fantasy blocks taller than real blocks and colors by emphasis', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, palette)
    const real = model.pieces.find((p) => p.kind === 'blockSurface' && p.emphasis === 'real')!
    const fantasy = model.pieces.find((p) => p.kind === 'blockSurface' && p.emphasis === 'fantasy')!
    expect(fantasy.depth).toBeGreaterThan(real.depth)
    expect(real.color).toBe(palette.blockReal)
    expect(fantasy.color).toBe(palette.blockFantasy)
  })

  it('uses a rect footprint for a rect die and a polygon footprint for a circle die', () => {
    const rect = rectProjectWithBlocks()
    const rectModel = buildChip3DModel(buildChipLayers(rect), rect.die, palette)
    expect(rectModel.pieces.find((p) => p.kind === 'dieBase')!.footprint.type).toBe('rect')

    const circle = rectProjectWithBlocks()
    circle.die = { shape: 'circle', width: 600, height: 600, background: '#101820' }
    const circleModel = buildChip3DModel(buildChipLayers(circle), circle.die, palette)
    expect(circleModel.pieces.find((p) => p.kind === 'dieBase')!.footprint.type).toBe('polygon')
  })

  it('reports a center and extent covering the die', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, palette)
    expect(model.extent[0]).toBeGreaterThanOrEqual(project.die.width)
    expect(model.extent[2]).toBeGreaterThanOrEqual(project.die.height)
    expect(model.center).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts`
Expected: FAIL (`buildChip3DModel` not found / module missing).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Die } from '../../domain/project'
import type { Bounds, ChipLayerModel } from '../chipLayers'

export type Vec3 = [number, number, number]

export type Footprint =
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'polygon'; points: [number, number][] }

export type Chip3DPiece =
  | { id: string; kind: 'package'; footprint: Footprint; baseZ: number; depth: number; color: string }
  | { id: string; kind: 'dieBase'; footprint: Footprint; baseZ: number; depth: number; color: string }
  | {
      id: string
      kind: 'blockSurface'
      blockId: string
      footprint: Footprint
      baseZ: number
      depth: number
      color: string
      emphasis: 'real' | 'fantasy'
    }

export type Chip3DModel = { pieces: Chip3DPiece[]; center: Vec3; extent: Vec3 }
export type Chip3DPalette = { die: string; blockReal: string; blockFantasy: string }

// Flat-color M0 extrusion depths (die-pixel units).
const PACKAGE_DEPTH = 24
const DIE_DEPTH = 16
const BLOCK_REAL_DEPTH = 10
const BLOCK_FANTASY_DEPTH = 18

function rectFootprint(b: Bounds): Footprint {
  return { type: 'rect', x: b.x, y: b.y, width: b.width, height: b.height }
}

// circle/hexagon dies become an extruded polygon cross-section centered in the die bounds.
function dieFootprint(die: Die, bounds: Bounds): Footprint {
  if (die.shape === 'circle' || die.shape === 'hexagon') {
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2
    const rx = bounds.width / 2
    const ry = bounds.height / 2
    const segments = die.shape === 'hexagon' ? 6 : 48
    const offset = die.shape === 'hexagon' ? Math.PI / 6 : 0
    const points: [number, number][] = []
    for (let i = 0; i < segments; i++) {
      const a = offset + (i / segments) * Math.PI * 2
      points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
    }
    return { type: 'polygon', points }
  }
  return rectFootprint(bounds)
}

export function buildChip3DModel(
  layers: ChipLayerModel,
  die: Die,
  palette: Chip3DPalette,
): Chip3DModel {
  const pieces: Chip3DPiece[] = []

  const packageZ = 0
  pieces.push({
    id: layers.package.id,
    kind: 'package',
    footprint: rectFootprint(layers.package.bounds),
    baseZ: packageZ,
    depth: PACKAGE_DEPTH,
    color: layers.package.color,
  })

  const dieZ = packageZ + PACKAGE_DEPTH
  pieces.push({
    id: layers.dieBase.id,
    kind: 'dieBase',
    footprint: dieFootprint(die, layers.dieBase.bounds),
    baseZ: dieZ,
    depth: DIE_DEPTH,
    color: palette.die,
  })

  const blockZ = dieZ + DIE_DEPTH
  for (const surface of layers.blockSurfaces) {
    const fantasy = surface.emphasis === 'fantasy'
    pieces.push({
      id: surface.id,
      kind: 'blockSurface',
      blockId: surface.blockId,
      footprint: rectFootprint(surface.bounds),
      baseZ: blockZ,
      depth: fantasy ? BLOCK_FANTASY_DEPTH : BLOCK_REAL_DEPTH,
      color: fantasy ? palette.blockFantasy : palette.blockReal,
      emphasis: surface.emphasis,
    })
  }

  const top = blockZ + BLOCK_FANTASY_DEPTH
  const center: Vec3 = [
    layers.package.bounds.x + layers.package.bounds.width / 2,
    top / 2,
    layers.package.bounds.y + layers.package.bounds.height / 2,
  ]
  const extent: Vec3 = [layers.package.bounds.width, top, layers.package.bounds.height]

  return { pieces, center, extent }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/visual/chip3d/chip3dModel.ts src/visual/chip3d/chip3dModel.test.ts
git commit -m "feat(v7): pure Chip3DModel derivation from ChipLayerModel"
```

---

### Task 3: Three.js viewer (lazy, browser-verified)

**Files:**
- Create: `src/three/chip3dScene.ts` (builds Three meshes from `Chip3DModel`; imports `three`)
- Create: `src/three/Chip3DViewer.tsx` (React component; mounts a renderer + orbit controls)

**Interfaces:**
- Consumes: `Chip3DModel` (Task 2).
- Produces: default-exported `Chip3DViewer` React component taking `{ model: Chip3DModel }`; `buildChip3DScene(model): THREE.Group`.

**Convention:** Three rendering is **not** unit-tested (jsdom has no WebGL). This task is browser-verified. Keep `chip3dScene.ts` a thin pure-ish mesh builder so the geometry mapping is reviewable; the React component owns renderer/camera/controls lifecycle.

- [ ] **Step 1: Implement `buildChip3DScene`**

```ts
import * as THREE from 'three'
import type { Chip3DModel, Chip3DPiece, Footprint } from '../visual/chip3d/chip3dModel'

function shapeFromFootprint(fp: Footprint): THREE.Shape {
  const shape = new THREE.Shape()
  if (fp.type === 'rect') {
    shape.moveTo(fp.x, fp.y)
    shape.lineTo(fp.x + fp.width, fp.y)
    shape.lineTo(fp.x + fp.width, fp.y + fp.height)
    shape.lineTo(fp.x, fp.y + fp.height)
    shape.closePath()
  } else {
    fp.points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
    shape.closePath()
  }
  return shape
}

function meshForPiece(piece: Chip3DPiece): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shapeFromFootprint(piece.footprint), {
    depth: piece.depth,
    bevelEnabled: false,
  })
  // 2D (x,y; y-down) -> 3D floor plane (x, z=y), extrude upward along y.
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, piece.baseZ, 0)
  const material = new THREE.MeshStandardMaterial({ color: piece.color })
  return new THREE.Mesh(geometry, material)
}

export function buildChip3DScene(model: Chip3DModel): THREE.Group {
  const group = new THREE.Group()
  for (const piece of model.pieces) group.add(meshForPiece(piece))
  group.position.set(-model.center[0], 0, -model.center[2]) // center on origin
  return group
}
```

- [ ] **Step 2: Implement `Chip3DViewer`**

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import { buildChip3DScene } from './chip3dScene'

export default function Chip3DViewer({ model }: { model: Chip3DModel }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const width = host.clientWidth || 640
    const height = host.clientHeight || 420

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 0.8)
    key.position.set(1, 2, 1)
    scene.add(key)
    scene.add(buildChip3DScene(model))

    const dist = Math.max(model.extent[0], model.extent[2]) * 1.6
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, dist * 10)
    camera.position.set(dist, dist, dist)
    const controls = new OrbitControls(camera, renderer.domElement)

    let raf = 0
    const tick = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      controls.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [model])

  return <div ref={hostRef} style={{ width: '100%', height: 420 }} data-testid="chip-3d-viewer" />
}
```

- [ ] **Step 3: Verify build + browser render**

Run: `npm run build`
Expected: exits 0; a separate chunk carries `three` (note its name).
Run: `npm run dev -- --host 127.0.0.1`, open a chip, and (after Task 4's toggle is wired) confirm the chip renders recognizably in 3D with working orbit.

- [ ] **Step 4: Commit**

```bash
git add src/three/chip3dScene.ts src/three/Chip3DViewer.tsx
git commit -m "feat(v7): lazy Three.js Chip3DViewer rendering Chip3DModel"
```

---

### Task 4: Editor "3D preview" toggle + WebGL guard

**Files:**
- Modify: the editor shell component that hosts the canvas/preview (e.g. `src/features/editor/EditorPage.tsx` — confirm exact host with `grep -rn "ChipStage" src/features/editor`)
- Create: `src/features/editor/Chip3DPreviewToggle.tsx` (toggle + lazy mount + palette resolution + WebGL guard)
- Test: `src/features/editor/Chip3DPreviewToggle.test.tsx` (viewer mocked)

**Interfaces:**
- Consumes: current `Project`, `buildChipLayers`, `buildChip3DModel`, `resolveMaterialRecipe`/theme for palette; lazy `Chip3DViewer`.
- Produces: `Chip3DPreviewToggle` mounted in the editor shell.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createProject } from '../../domain/projectFactory'
import Chip3DPreviewToggle from './Chip3DPreviewToggle'

// Mock the lazy viewer so the test never touches WebGL/three.
vi.mock('../../three/Chip3DViewer', () => ({
  default: ({ model }: { model: { pieces: unknown[] } }) => (
    <div data-testid="mock-viewer">pieces:{model.pieces.length}</div>
  ),
}))

describe('Chip3DPreviewToggle', () => {
  it('does not mount the viewer until toggled on', async () => {
    render(<Chip3DPreviewToggle project={createProject('T')} />)
    expect(screen.queryByTestId('mock-viewer')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /3d preview/i }))
    expect(await screen.findByTestId('mock-viewer')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Write minimal implementation**

```tsx
import { lazy, Suspense, useMemo, useState } from 'react'
import type { Project } from '../../domain/project'
import { buildChipLayers } from '../../visual/chipLayers'
import { buildChip3DModel, type Chip3DPalette } from '../../visual/chip3d/chip3dModel'
import { resolveMaterialRecipe } from '../../visual/materialRecipes'
import { resolveStyleTheme } from '../../visual/...' // confirm the theme resolver used by the editor

const Chip3DViewer = lazy(() => import('../../three/Chip3DViewer'))

function webglAvailable(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

export default function Chip3DPreviewToggle({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)

  const model = useMemo(() => {
    const recipe = resolveMaterialRecipe(resolveStyleTheme(project))
    const palette: Chip3DPalette = {
      die: recipe.dieBase.fillStops[0].color,
      blockReal: recipe.microTile.fill,
      blockFantasy: recipe.glassGlow.color,
    }
    return buildChip3DModel(buildChipLayers(project), project.die, palette)
  }, [project])

  return (
    <section>
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide 3D preview' : 'Show 3D preview'}
      </button>
      {open &&
        (webglAvailable() ? (
          <Suspense fallback={<p>Loading 3D…</p>}>
            <Chip3DViewer model={model} />
          </Suspense>
        ) : (
          <p>3D is not available in this browser.</p>
        ))}
    </section>
  )
}
```

> The button label must match the test's `/3d preview/i`; adjust the accessible name if you change copy. Confirm the real theme-resolver import path (`resolveStyleTheme`) before implementing — `grep -rn "resolveMaterialRecipe(" src` to find how the editor resolves the current theme, and reuse that exact call. Palette field choices (microTile/glassGlow) are M0 flat-color stand-ins; M1 replaces them with real materials.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount the toggle in the editor shell**

Add `<Chip3DPreviewToggle project={project} />` to the editor host found via grep. Verify in the browser that the toggle appears and, when opened, the chip renders in 3D.

- [ ] **Step 6: Commit**

```bash
git add src/features/editor/Chip3DPreviewToggle.tsx src/features/editor/Chip3DPreviewToggle.test.tsx src/features/editor/EditorPage.tsx
git commit -m "feat(v7): editor 3D preview toggle with lazy viewer + WebGL guard"
```

---

### Task 5: Gate verification + docs

**Files:**
- Modify: `implementation.md` (v7-M0 entry), `CLAUDE.md` (Milestone Status — local-only file)

- [ ] **Step 1: Full gates**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green; build shows `three` in a **separate** chunk, not the main `index-*` chunk.

- [ ] **Step 2: Bundle-isolation assertion**

Inspect the `npm run build` chunk list and confirm the main entry chunk size did not grow by Three's full weight (compare against the size noted before adding the toggle). Record the chunk name + sizes.

- [ ] **Step 3: Browser QA**

`npm run dev -- --host 127.0.0.1`: open a hero/preset chip → toggle 3D on → chip renders recognizably, orbit works; toggle off → 2D editor unchanged. Confirm the network tab loads the `three` chunk only on first toggle.

- [ ] **Step 4: Record + commit**

Append a `## v7-M0 3D Showcase Foundation` entry to `implementation.md` (derivation-from-ChipLayerModel decision, src/three vs src/visual/chip3d split, flat-color M0, lazy-load chunk result, browser QA, gates). Add the v7 Milestone Status block to `CLAUDE.md`.

```bash
git add implementation.md
git commit -m "docs(impl): record v7-M0 3D showcase foundation"
```

---

## Self-Review

**1. Spec coverage:** derivation from `ChipLayerModel` (Task 2) ✓; `src/three` lazy renderer (Task 3) ✓; editor toggle + WebGL guard (Task 4) ✓; feasibility spike with go/no-go (Task 1) ✓; flat-color geometry-first (Task 2 depths/palette) ✓; bundle-isolation gate (Tasks 1/5) ✓; pure derivation unit-tested, Three browser-verified (Tasks 2–4) ✓.

**2. Placeholder scan:** Task 4 has two confirm-before-implement notes (editor host file, theme-resolver import) — these are real grep-first steps, not placeholders; exact code is supplied for everything testable. The spike (Task 1) is intentionally throwaway, not bite-sized code.

**3. Type consistency:** `Chip3DModel`/`Chip3DPiece`/`Footprint`/`Chip3DPalette`/`buildChip3DModel` names match across Tasks 2–4; `buildChipLayers`/`ChipLayerModel`/`Bounds` match the real `src/visual/chipLayers.ts` exports; `Die` matches `src/domain/project.ts`.

## Notes

- The palette field choices (`microTile.fill`, `glassGlow.color`) are M0 flat-color stand-ins; M1 (Material & Lighting) replaces the whole palette path with real PBR materials resolved from `materialRecipes`.
- `OrbitControls` import path is `three/examples/jsm/controls/OrbitControls.js`; if tree-shaking/types complain, confirm against the installed `three` version.
