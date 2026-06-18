# v7-M1 3D Material & Lighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the M0 flat-box 3D showcase to the v2/v3 premium visual bar with theme-driven PBR materials, a procedural PMREM environment, a three-point lighting rig + ACES tone mapping, and emissive + UnrealBloom glow — all derived from the existing `resolveMaterialRecipe`/`resolveTheme`, with `three` (incl. its bundled postprocessing/PMREM) still isolated in the lazy chunk.

**Architecture:** Keep the derived model serializable and self-describing. A new pure mapper `resolveChip3DStyle(theme)` (in `src/visual/chip3d/`, no `three`) turns theme tokens into PBR + environment descriptors; `buildChip3DModel` embeds a `material` per piece and an `environment` on the model; `src/three/` builds `MeshStandardMaterial` per piece, sets `scene.environment` from a procedural PMREM gradient, applies ACES tone mapping + a 3-point rig, and renders through an `EffectComposer` with `UnrealBloomPass`.

**Tech Stack:** Vite · React + TypeScript · `three` + bundled `three/examples/jsm/postprocessing/*` + `PMREMGenerator` (lazy/code-split, no new npm dependency) · Vitest (pure mapper + updated model test; Three rendering browser-verified).

**Spec:** `docs/superpowers/specs/2026-06-18-v7-m1-3d-material-lighting-design.md`.

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- `src/domain/` stays pure. The 3D derivation + material mapper live in `src/visual/chip3d/` and import only from `domain`/`visual`/`themes`. `three` is imported **only** in `src/three/`.
- **Konva 2D export contract is unchanged:** die-only `pixelRatio:4`, poster `3200x1800`. 3D is additive/separate.
- **Local-first unchanged:** 3D is a client-only derivation of the in-memory `Project`; no schema/migration/API change.
- **Bundle isolation:** `EffectComposer`, `UnrealBloomPass`, `PMREMGenerator` are part of the installed `three` package; they must load only via the lazy `Chip3DViewer` import. The core `index-*` chunk must not grow by Three's weight.
- M1 carries the **manual visual-quality gate** (v2/v3 bar): an amateurish 3D view is a milestone failure.
- One concern per commit. TDD: failing test → confirm fail → minimal impl → confirm pass → commit.
- Docs (`/docs/`) are gitignored in this repo; add plan/spec/doc files with `git add -f` (project convention — existing specs are force-added).
- End commit messages with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 1: Pure `resolveChip3DStyle` material/environment mapper

**Files:**
- Create: `src/visual/chip3d/chip3dMaterials.ts`
- Test: `src/visual/chip3d/chip3dMaterials.test.ts`

**Interfaces:**
- Consumes: `resolveMaterialRecipe(theme)` from `src/visual/materialRecipes.ts` (for `package.fill`, `glassGlow.{color,opacity}`); `resolveTheme(theme)` from `src/themes/themeTokens.ts` (for `background`, `blockFill`, `dieFill`, `glow`); `StyleTheme` from `src/domain/project.ts`.
- Produces: types `Chip3DMaterial`, `Chip3DMaterialSet`, `Chip3DBloom`, `Chip3DEnvironment`, `Chip3DStyle`; `resolveChip3DStyle(theme: StyleTheme): Chip3DStyle`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { StyleTheme } from '../../domain/project'
import { resolveChip3DStyle } from './chip3dMaterials'

const THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']

function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

describe('resolveChip3DStyle', () => {
  it('resolves bounded PBR params for every theme', () => {
    for (const theme of THEMES) {
      const { materials } = resolveChip3DStyle(theme)
      for (const role of ['package', 'dieBase', 'blockReal', 'blockFantasy'] as const) {
        const m = materials[role]
        expect(isHex(m.color), `${theme}/${role} color`).toBe(true)
        expect(m.metalness).toBeGreaterThanOrEqual(0)
        expect(m.metalness).toBeLessThanOrEqual(1)
        expect(m.roughness).toBeGreaterThanOrEqual(0)
        expect(m.roughness).toBeLessThanOrEqual(1)
        expect(m.emissiveIntensity).toBeGreaterThanOrEqual(0)
        expect(isHex(m.emissive), `${theme}/${role} emissive`).toBe(true)
      }
    }
  })

  it('makes only fantasy blocks emissive, and metal blocks more metallic than the package', () => {
    for (const theme of THEMES) {
      const { materials } = resolveChip3DStyle(theme)
      expect(materials.blockFantasy.emissiveIntensity).toBeGreaterThan(0)
      expect(materials.package.emissiveIntensity).toBe(0)
      expect(materials.dieBase.emissiveIntensity).toBe(0)
      expect(materials.blockReal.emissiveIntensity).toBe(0)
      expect(materials.blockReal.metalness).toBeGreaterThan(materials.package.metalness)
    }
  })

  it('derives a non-empty environment with neon blooming stronger than mono', () => {
    const neon = resolveChip3DStyle('neon').environment
    const mono = resolveChip3DStyle('mono').environment
    expect(isHex(neon.topColor)).toBe(true)
    expect(isHex(neon.bottomColor)).toBe(true)
    expect(neon.exposure).toBeGreaterThan(0)
    expect(neon.bloom.threshold).toBeGreaterThanOrEqual(0)
    expect(neon.bloom.strength).toBeGreaterThan(mono.bloom.strength)
  })

  it('sources fantasy emissive from the theme glow color', () => {
    // neon glow hue is #22d3ee (tokens.glow.shadowColor === recipe.glassGlow.color)
    expect(resolveChip3DStyle('neon').materials.blockFantasy.emissive.toLowerCase()).toBe('#22d3ee')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/visual/chip3d/chip3dMaterials.test.ts`
Expected: FAIL (`resolveChip3DStyle` / module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import type { StyleTheme } from '../../domain/project'
import { resolveMaterialRecipe } from '../materialRecipes'
import { resolveTheme } from '../../themes/themeTokens'

export type Chip3DMaterial = {
  color: string
  metalness: number
  roughness: number
  emissive: string
  emissiveIntensity: number
}

export type Chip3DMaterialSet = {
  package: Chip3DMaterial
  dieBase: Chip3DMaterial
  blockReal: Chip3DMaterial
  blockFantasy: Chip3DMaterial
}

export type Chip3DBloom = { threshold: number; strength: number; radius: number }

export type Chip3DEnvironment = {
  topColor: string
  bottomColor: string
  bloom: Chip3DBloom
  exposure: number
}

export type Chip3DStyle = { materials: Chip3DMaterialSet; environment: Chip3DEnvironment }

const NON_EMISSIVE = { emissive: '#000000', emissiveIntensity: 0 } as const

export function resolveChip3DStyle(theme: StyleTheme): Chip3DStyle {
  const recipe = resolveMaterialRecipe(theme)
  const tokens = resolveTheme(theme)

  // glassGlow.opacity is small (≈0.12..0.7-scaled); map it into a visible emissive band
  // so fantasy blocks clear the bloom threshold while staying theme-proportional.
  const glow = tokens.glow.shadowOpacity // 0.3 (mono) .. 0.7 (neon)
  const emissiveIntensity = 0.6 + glow * 2.2 // ≈1.26 (mono) .. ≈2.14 (neon)

  const materials: Chip3DMaterialSet = {
    package: {
      color: recipe.package.fill,
      metalness: 0.1,
      roughness: 0.82,
      ...NON_EMISSIVE,
    },
    dieBase: {
      color: tokens.dieFill[0].color,
      metalness: 0.4,
      roughness: 0.55,
      ...NON_EMISSIVE,
    },
    blockReal: {
      color: tokens.blockFill.real,
      metalness: 0.75,
      roughness: 0.35,
      ...NON_EMISSIVE,
    },
    blockFantasy: {
      color: tokens.blockFill.fantasy,
      metalness: 0.15,
      roughness: 0.5,
      emissive: recipe.glassGlow.color,
      emissiveIntensity,
    },
  }

  const environment: Chip3DEnvironment = {
    topColor: tokens.background[0].color,
    bottomColor: tokens.background[1].color,
    bloom: {
      threshold: 0.62,
      strength: 0.35 + glow * 1.3, // neon (0.7) ≈1.26 > mono (0.3) ≈0.74
      radius: 0.55,
    },
    exposure: 1.15,
  }

  return { materials, environment }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/visual/chip3d/chip3dMaterials.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/visual/chip3d/chip3dMaterials.ts src/visual/chip3d/chip3dMaterials.test.ts
git commit -m "feat(v7): pure resolveChip3DStyle recipe-to-PBR mapper"
```

---

### Task 2: Embed `material` per piece + `environment` on `Chip3DModel`

**Files:**
- Modify: `src/visual/chip3d/chip3dModel.ts`
- Test: `src/visual/chip3d/chip3dModel.test.ts` (update existing M0 test)

**Interfaces:**
- Consumes: `Chip3DStyle`, `Chip3DMaterial`, `Chip3DEnvironment` from `./chip3dMaterials` (Task 1); `ChipLayerModel`/`Bounds` from `../chipLayers`; `Die` from `../../domain/project`.
- Produces: `Chip3DModel` now has `environment: Chip3DEnvironment`; each `Chip3DPiece` carries `material: Chip3DMaterial` (no `color`); `buildChip3DModel(layers: ChipLayerModel, die: Die, style: Chip3DStyle): Chip3DModel`. `Chip3DPalette` is removed.

- [ ] **Step 1: Update the existing test to assert materials + environment**

Replace the contents of `src/visual/chip3d/chip3dModel.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { buildChipLayers } from '../chipLayers'
import { createProject } from '../../domain/projectFactory'
import { resolveChip3DStyle } from './chip3dMaterials'
import { buildChip3DModel } from './chip3dModel'

const style = resolveChip3DStyle('neon')

function rectProjectWithBlocks() {
  const project = createProject('3D Test')
  project.die = { shape: 'rect', width: 800, height: 500, background: '#101820' }
  project.blocks = [
    { id: 'b-real', type: 'CPU', category: 'real', x: 100, y: 80, w: 120, h: 90, rotation: 0, zIndex: 0 },
    { id: 'b-fan', type: 'ConsciousnessProcessor', category: 'fantasy', x: 400, y: 200, w: 140, h: 100, rotation: 0, zIndex: 1 },
  ]
  return project
}

describe('buildChip3DModel', () => {
  it('stacks package below die below blocks', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)

    const pkg = model.pieces.find((p) => p.kind === 'package')!
    const die = model.pieces.find((p) => p.kind === 'dieBase')!
    const blocks = model.pieces.filter((p) => p.kind === 'blockSurface')

    expect(pkg.baseZ).toBe(0)
    expect(die.baseZ).toBe(pkg.baseZ + pkg.depth)
    expect(blocks).toHaveLength(2)
    for (const b of blocks) expect(b.baseZ).toBe(die.baseZ + die.depth)
  })

  it('assigns recipe-driven materials per piece role', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)

    const pkg = model.pieces.find((p) => p.kind === 'package')!
    const die = model.pieces.find((p) => p.kind === 'dieBase')!
    const real = model.pieces.find((p) => p.kind === 'blockSurface' && p.emphasis === 'real')!
    const fantasy = model.pieces.find((p) => p.kind === 'blockSurface' && p.emphasis === 'fantasy')!

    expect(pkg.material).toEqual(style.materials.package)
    expect(die.material).toEqual(style.materials.dieBase)
    expect(real.material).toEqual(style.materials.blockReal)
    expect(fantasy.material).toEqual(style.materials.blockFantasy)
    expect(fantasy.material.emissiveIntensity).toBeGreaterThan(real.material.emissiveIntensity)
    expect(fantasy.depth).toBeGreaterThan(real.depth)
  })

  it('carries the resolved environment on the model', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)
    expect(model.environment).toEqual(style.environment)
  })

  it('uses a rect footprint for a rect die and a polygon footprint for a circle die', () => {
    const rect = rectProjectWithBlocks()
    const rectModel = buildChip3DModel(buildChipLayers(rect), rect.die, style)
    expect(rectModel.pieces.find((p) => p.kind === 'dieBase')!.footprint.type).toBe('rect')

    const circle = rectProjectWithBlocks()
    circle.die = { shape: 'circle', width: 600, height: 600, background: '#101820' }
    const circleModel = buildChip3DModel(buildChipLayers(circle), circle.die, style)
    expect(circleModel.pieces.find((p) => p.kind === 'dieBase')!.footprint.type).toBe('polygon')
  })

  it('reports a center and extent covering the die', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)
    expect(model.extent[0]).toBeGreaterThanOrEqual(project.die.width)
    expect(model.extent[2]).toBeGreaterThanOrEqual(project.die.height)
    expect(model.center).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts`
Expected: FAIL (pieces still carry `color`, not `material`; no `environment`; signature still takes a palette).

- [ ] **Step 3: Rewrite `chip3dModel.ts` to embed materials + environment**

Replace `src/visual/chip3d/chip3dModel.ts` with (geometry/footprint/depth logic preserved; only color→material + environment + signature change):

```ts
import type { Die } from '../../domain/project'
import type { Bounds, ChipLayerModel } from '../chipLayers'
import type { Chip3DEnvironment, Chip3DMaterial, Chip3DStyle } from './chip3dMaterials'

export type Vec3 = [number, number, number]

export type Footprint =
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'polygon'; points: [number, number][] }

export type Chip3DPiece =
  | {
      id: string
      kind: 'package'
      footprint: Footprint
      baseZ: number
      depth: number
      material: Chip3DMaterial
    }
  | {
      id: string
      kind: 'dieBase'
      footprint: Footprint
      baseZ: number
      depth: number
      material: Chip3DMaterial
    }
  | {
      id: string
      kind: 'blockSurface'
      blockId: string
      footprint: Footprint
      baseZ: number
      depth: number
      material: Chip3DMaterial
      emphasis: 'real' | 'fantasy'
    }

export type Chip3DModel = {
  pieces: Chip3DPiece[]
  center: Vec3
  extent: Vec3
  environment: Chip3DEnvironment
}

const PACKAGE_DEPTH = 24
const DIE_DEPTH = 16
const BLOCK_REAL_DEPTH = 10
const BLOCK_FANTASY_DEPTH = 18

function rectFootprint(bounds: Bounds): Footprint {
  return {
    type: 'rect',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function dieFootprint(die: Die, bounds: Bounds): Footprint {
  if (die.shape !== 'circle' && die.shape !== 'hexagon') {
    return rectFootprint(bounds)
  }

  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const segments = die.shape === 'hexagon' ? 6 : 48
  const offset = die.shape === 'hexagon' ? Math.PI / 6 : 0
  const points: [number, number][] = []

  for (let index = 0; index < segments; index += 1) {
    const angle = offset + (index / segments) * Math.PI * 2
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry])
  }

  return { type: 'polygon', points }
}

export function buildChip3DModel(
  layers: ChipLayerModel,
  die: Die,
  style: Chip3DStyle,
): Chip3DModel {
  const pieces: Chip3DPiece[] = []

  const packageZ = 0
  pieces.push({
    id: layers.package.id,
    kind: 'package',
    footprint: rectFootprint(layers.package.bounds),
    baseZ: packageZ,
    depth: PACKAGE_DEPTH,
    material: style.materials.package,
  })

  const dieZ = packageZ + PACKAGE_DEPTH
  pieces.push({
    id: layers.dieBase.id,
    kind: 'dieBase',
    footprint: dieFootprint(die, layers.dieBase.bounds),
    baseZ: dieZ,
    depth: DIE_DEPTH,
    material: style.materials.dieBase,
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
      material: fantasy ? style.materials.blockFantasy : style.materials.blockReal,
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

  return { pieces, center, extent, environment: style.environment }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/visual/chip3d/chip3dModel.ts src/visual/chip3d/chip3dModel.test.ts
git commit -m "feat(v7): embed PBR material per piece + environment on Chip3DModel"
```

---

### Task 3: Build PBR materials in the scene

**Files:**
- Modify: `src/three/chip3dScene.ts`

**Interfaces:**
- Consumes: `Chip3DModel`/`Chip3DPiece`/`Footprint` (now with `piece.material`).
- Produces: `buildChip3DScene(model): THREE.Group` (unchanged signature) and `disposeChip3DScene(scene)` (unchanged) — meshes now use full PBR materials.

**Convention:** Three rendering is browser-verified, not unit-tested (jsdom has no WebGL). No new test file here; correctness is confirmed by the build + Task 6 browser QA.

- [ ] **Step 1: Replace the flat material with a PBR material from `piece.material`**

In `src/three/chip3dScene.ts`, change `meshForPiece` so the material reads the descriptor (geometry construction is unchanged):

```ts
function meshForPiece(piece: Chip3DPiece): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shapeFromFootprint(piece.footprint), {
    depth: piece.depth,
    bevelEnabled: false,
  })
  // Shape y is negated above. After rotating the extrusion axis to +Y, the
  // original 2D y-down coordinate becomes +Z in the 3D floor plane.
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, piece.baseZ, 0)
  const material = new THREE.MeshStandardMaterial({
    color: piece.material.color,
    metalness: piece.material.metalness,
    roughness: piece.material.roughness,
    emissive: piece.material.emissive,
    emissiveIntensity: piece.material.emissiveIntensity,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.name = piece.id
  return mesh
}
```

(`buildChip3DScene` and `disposeChip3DScene` are unchanged — disposal already iterates geometry + materials.)

- [ ] **Step 2: Typecheck + build**

Run: `npm run build`
Expected: exits 0. Note the chunk that carries `three` (e.g. `Chip3DViewer-*.js`) for the Task 6 bundle check.

- [ ] **Step 3: Commit**

```bash
git add src/three/chip3dScene.ts
git commit -m "feat(v7): build PBR MeshStandardMaterials from piece descriptors"
```

---

### Task 4: PMREM environment + lighting rig + ACES tone mapping

**Files:**
- Modify: `src/three/Chip3DViewer.tsx`

**Interfaces:**
- Consumes: `model.environment` (`{ topColor, bottomColor, bloom, exposure }`) added in Task 2; existing `model.extent`/`model.center`.
- Produces: viewer with image-based reflections + a 3-point rig + ACES tone mapping. (Bloom composer is added in Task 5; this task renders directly via `renderer.render`.)

**Convention:** Browser-verified, not unit-tested.

- [ ] **Step 1: Add tone mapping + procedural PMREM environment + 3-point rig**

Replace the body of the `useEffect` setup in `src/three/Chip3DViewer.tsx` from the renderer creation through the lights, keeping OrbitControls/render/resize/reset and disposal structure. The new setup:

```tsx
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
```

Keep the existing camera, OrbitControls, `render`/`resize`/`resetView`, the `ResizeObserver`, the `controls`/`reset-view` listeners, and the JSX unchanged. The `render` function stays `renderer.render(scene, camera)` for now (Task 5 swaps it for the composer).

- [ ] **Step 2: Extend disposal for the PMREM resources**

In the cleanup return, add PMREM disposal alongside the existing teardown (before `renderer.dispose()`):

```tsx
return () => {
  observer.disconnect()
  controls.removeEventListener('change', render)
  host.removeEventListener('chip3d:reset-view', resetView)
  controls.dispose()
  disposeChip3DScene(chip)
  envRT.dispose()
  pmrem.dispose()
  renderer.dispose()
  renderer.forceContextLoss()
  renderer.domElement.remove()
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run build`
Expected: exits 0; `three` still isolated in its own chunk.

- [ ] **Step 4: Commit**

```bash
git add src/three/Chip3DViewer.tsx
git commit -m "feat(v7): PMREM environment, 3-point rig, ACES tone mapping in viewer"
```

---

### Task 5: UnrealBloom post-processing

**Files:**
- Modify: `src/three/Chip3DViewer.tsx`

**Interfaces:**
- Consumes: `model.environment.bloom` (`{ threshold, strength, radius }`); the scene/camera/renderer from Task 4.
- Produces: rendering routed through an `EffectComposer` so emissive fantasy blocks bloom.

**Convention:** Browser-verified, not unit-tested.

- [ ] **Step 1: Import the postprocessing modules**

At the top of `src/three/Chip3DViewer.tsx`, add these named imports (they resolve from the installed `three` package, so they stay in the lazy chunk — no new dependency). They are **not** on the `THREE.*` namespace, so they must be imported by name and used unprefixed:

```tsx
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
```

(`Vector2` is already reachable as `THREE.Vector2` via the existing `import * as THREE from 'three'`.)

- [ ] **Step 2: Build the composer and render through it**

After the lights/camera/controls are set up (and before the `render` function), create the composer using the unprefixed named imports:

```tsx
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(
  new THREE.Vector2(1, 1),
  model.environment.bloom.strength,
  model.environment.bloom.radius,
  model.environment.bloom.threshold,
)
composer.addPass(bloom)
```

Change `render` to drive the composer:

```tsx
const render = () => composer.render()
```

And in `resize`, size the composer (and bloom resolution) alongside the renderer/camera:

```tsx
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
```

- [ ] **Step 3: Dispose the composer**

In the cleanup return, dispose the composer before `renderer.dispose()`:

```tsx
composer.dispose()
```

(Place it next to `envRT.dispose()` / `pmrem.dispose()`.)

- [ ] **Step 4: Typecheck + build**

Run: `npm run build`
Expected: exits 0. Confirm the `three`/postprocessing code is in the lazy `Chip3DViewer-*` chunk, NOT in the main `index-*` chunk.

- [ ] **Step 5: Commit**

```bash
git add src/three/Chip3DViewer.tsx
git commit -m "feat(v7): UnrealBloom post-processing for emissive glow"
```

---

### Task 6: Wire the real style into the showcase + gates

**Files:**
- Modify: `src/features/editor/Chip3DPreviewToggle.tsx`
- Modify: `implementation.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `resolveChip3DStyle(theme)` (Task 1), `buildChip3DModel(layers, die, style)` (Task 2).
- Produces: the showcase modal now derives the model from the real recipe-driven style; the M0 flat-palette path is removed.

- [ ] **Step 1: Replace the flat palette with the resolved style**

In `src/features/editor/Chip3DPreviewToggle.tsx`, update the imports and the `model` memo inside `Chip3DShowcase`:

Replace the imports:
```tsx
import { resolveTheme } from '../../themes/themeTokens'
import { buildChip3DModel, type Chip3DPalette } from '../../visual/chip3d/chip3dModel'
import { buildChipLayers } from '../../visual/chipLayers'
```
with:
```tsx
import { buildChip3DModel } from '../../visual/chip3d/chip3dModel'
import { resolveChip3DStyle } from '../../visual/chip3d/chip3dMaterials'
import { buildChipLayers } from '../../visual/chipLayers'
```

Replace the `model` memo body:
```tsx
const model = useMemo(() => {
  const tokens = resolveTheme(project.theme)
  const palette: Chip3DPalette = {
    die: tokens.dieFill[0].color,
    blockReal: tokens.blockFill.real,
    blockFantasy: tokens.blockFill.fantasy,
  }
  return buildChip3DModel(buildChipLayers(project), project.die, palette)
}, [project])
```
with:
```tsx
const model = useMemo(
  () => buildChip3DModel(buildChipLayers(project), project.die, resolveChip3DStyle(project.theme)),
  [project],
)
```

- [ ] **Step 2: Run the toggle test + full client suite**

Run: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx`
Expected: PASS (viewer mocked; geometry unchanged so `model.pieces.length` assertions hold).

Run: `npm test`
Expected: full client + server suites green.

- [ ] **Step 3: Full gates**

Run: `npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green. Inspect the build chunk list: `three` + postprocessing are in the lazy `Chip3DViewer-*` chunk; the main `index-*` chunk did NOT grow by Three's weight. Record the chunk name + size.

- [ ] **Step 4: Browser QA (manual visual-quality gate)**

Run: `npm run dev -- --host 127.0.0.1`. Open a real hero/preset chip (e.g. the N1 GREEN HORIZON 12-block project used for M0 QA) → "Open 3D showcase". Verify against the M0 reference board:
- metal blocks read as brushed metal (visible environment reflection);
- the substrate/die reflects the theme backdrop subtly;
- fantasy blocks glow with a real bloom halo (not just bright fill);
- switching themes (neon vs mono/military) keeps each distinct — neon hot, mono/military restrained;
- orbit/reset/resize still work; closing the showcase leaves the 2D editor unchanged;
- the network tab loads the `three` chunk only on first open.

If the look is amateurish, iterate on the constants in `resolveChip3DStyle` (Task 1) — they are centralized there — and re-verify before sign-off.

- [ ] **Step 5: Record + commit docs**

Append a `## v7-M1 3D Material & Lighting` entry to `implementation.md` (the serializable-style decision, recipe→PBR mapping, PMREM/3-point/ACES/bloom, bundle-isolation result + chunk size, browser visual-quality sign-off, gates). Update the v7 Milestone Status block in `CLAUDE.md` (M1 ✅).

```bash
git add -f implementation.md docs/superpowers/plans/2026-06-18-v7-m1-3d-material-lighting.md
git add CLAUDE.md src/features/editor/Chip3DPreviewToggle.tsx
git commit -m "feat(v7): wire recipe-driven 3D style into showcase + record v7-M1"
```

> `CLAUDE.md` is at the repo root (not under `/docs/`), so it is not gitignored; `implementation.md` and the plan file are under paths that may be gitignored — use `git add -f` for those (project convention). Verify with `git status` before committing and drop `-f` for any path that is already tracked.

---

## Self-Review

**1. Spec coverage:**
- Pure `resolveChip3DStyle(theme)` mapper (spec "New pure module") → Task 1 ✓
- Material mapping table (package/dieBase/blockReal/blockFantasy PBR + emissive) → Task 1 ✓
- Environment & bloom per-theme mapping (background→PMREM, glow→bloom strength neon>mono) → Task 1 ✓
- `material` per piece + `environment` on model, signature `buildChip3DModel(layers, die, style)`, `Chip3DPalette` removed, M0 tests updated → Task 2 ✓
- Scene builds `MeshStandardMaterial` from descriptor; `scene.environment` reflections → Tasks 3 + 4 ✓
- PMREM procedural environment, ACES tone mapping + exposure, 3-point rig → Task 4 ✓
- EffectComposer + UnrealBloomPass from `environment.bloom`; resize updates composer/bloom; extended disposal → Task 5 ✓
- Toggle drops flat-palette stand-in, uses `resolveChip3DStyle(project.theme)` → Task 6 ✓
- Bundle isolation re-verified; gates; manual visual-quality sign-off recorded → Task 6 ✓
- Invariants (purity, 2D/export/local-first untouched, no schema change) — no task violates them ✓

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code. The only "iterate on constants" instruction (Task 6 Step 4) points at concrete, centralized values in Task 1, not vague work. Browser-verified Three tasks (3–5) correctly omit unit tests per the documented jsdom/WebGL convention rather than leaving empty test stubs.

**3. Type consistency:** `Chip3DStyle`/`Chip3DMaterial`/`Chip3DMaterialSet`/`Chip3DEnvironment`/`Chip3DBloom` defined in Task 1 and consumed unchanged in Tasks 2/4/5/6. `resolveChip3DStyle(theme: StyleTheme): Chip3DStyle` is the single signature used by Tasks 2 (test), 6 (caller). `buildChip3DModel(layers, die, style)` is consistent across Tasks 2 and 6; `Chip3DPalette` is removed in Task 2 and its last usage deleted in Task 6. Piece `.material` (not `.color`) is written in Task 2 and read in Task 3. `model.environment` written in Task 2, read in Tasks 4/5. The postprocessing import note in Task 5 flags the `THREE.*` vs named-import gotcha so the implementer doesn't reference non-existent `THREE.EffectComposer`.

## Notes

- The PBR/bloom/exposure constants in Task 1 are first-pass values; the manual visual-quality gate (Task 6) may require browser iteration. Because they are centralized in `resolveChip3DStyle`, tuning is a localized, testable change — no magic numbers leak into `src/three/`.
- Tasks 3–5 are split (scene material / environment+lighting / bloom) so a reviewer can accept the PBR material change independently of the heavier lighting+bloom renderer work, even though all three are browser-verified together at Task 6.
- `OrbitControls` and the postprocessing modules share the `three/examples/jsm/...` path already proven to bundle into the lazy chunk in M0; if the installed `three` exposes the `three/addons/...` alias and tree-shaking/types complain, confirm against the installed version (same caveat the M0 plan recorded).
