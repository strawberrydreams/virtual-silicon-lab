# v13-M0 Freeform Geometry Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `'freeform'` die shape whose stored normalized vertices resolve to the same `DieOutline`/polygon every other shape produces, so block-clamp, 3D, and export consumers work with zero changes.

**Architecture:** A new `'freeform'` variant of `DieShape` plus a `Die.freeform` field holding vertices normalized to `[0,1]`. A pure `resolveFreeformVertices` normalizer (finite/clamp/min-3/fallback), a `resolveDieOutline` case that scales vertices by `width`/`height`, a `seedFreeformFromDie` converter that flattens the current outline into normalized vertices, and a schema `9 → 10` migration. This milestone is pure domain — no UI, no store commands.

**Tech Stack:** TypeScript, Vitest (globals OFF — explicit `import { describe, expect, it } from 'vitest'`). Pure `src/domain/` code only (no React/Konva/Zustand/IndexedDB).

## Global Constraints

- **Local-only.** No server, route, SQLite, or sync change. `src/domain/` stays pure per repo layering.
- **Schema version becomes `10`.** `CURRENT_SCHEMA_VERSION = 10`; `SUPPORTED_SCHEMA_VERSIONS` must still include `9`.
- **Target version line `0.11 v13`** (README bump happens in M4, not here).
- **Normalized coordinates.** Freeform vertices are stored in `[0,1] × [0,1]` and scaled by `die.width`/`die.height` only at resolve time.
- **Downstream RUNTIME invariant.** Freeform resolves through `resolveDieOutline` → `outlineToPolygon` to a `Point[]` polygon; the genuinely polygon-driven runtime (`clampBlockToPolygon` via `clampBlockToDie`, and 3D extrude in `src/visual/chip3d/chip3dModel.ts`) needs no behavioral change. NOTE 1: adding `'freeform'` to the `DieShape` **union** forces TYPE-level handling in every exhaustive `DieShape` consumer (switches with `never` checks, `Record<DieShape, …>` maps). Task 3 updates all of them so `tsc -p tsconfig.app.json` is green; `tsc` is RED between Task 1 and Task 3 (vitest does not typecheck), which is expected and closes at Task 3. NOTE 2: the 2D editor canvas `ChipArtwork.tsx` is NOT polygon-driven — it gates on `isParametricDieShape`, so freeform falls through to a full-frame `<Rect>`. Wiring it is an **M2** task, out of M0 scope (no UI can create a freeform die until M2).
- **TDD, one concern per commit.** Test command for this milestone: `npm run test:client` (or a single file: `npx vitest run <path>`).

---

### Task 1: Add `'freeform'` shape type, `FreeformVertex`, and `Die.freeform`

**Files:**
- Modify: `src/domain/project.ts` (add `'freeform'` to `DieShape`, add `FreeformVertex`, add `Die.freeform`)
- Modify: `src/domain/die/dieShapeParams.ts` (register `'freeform'` in the shape list so `isDieShape` accepts it)
- Test: `src/domain/die/dieShapeParams.test.ts`

**Interfaces:**
- Produces: `type FreeformVertex = { x: number; y: number }`; `Die.freeform?: { vertices: FreeformVertex[] }`; `isDieShape('freeform') === true`; `isParametricDieShape('freeform') === false`.

- [ ] **Step 1: Write the failing test**

Add to `src/domain/die/dieShapeParams.test.ts` inside the existing `describe('die shape classification', ...)`:

```ts
  it('recognizes the freeform shape but does not treat it as parametric', () => {
    expect(isDieShape('freeform')).toBe(true)
    expect(isParametricDieShape('freeform')).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/die/dieShapeParams.test.ts`
Expected: FAIL — `isDieShape('freeform')` returns `false`.

- [ ] **Step 3: Write minimal implementation**

In `src/domain/project.ts`, add `'freeform'` to the `DieShape` union (after `'plus'`):

```ts
export type DieShape =
  | 'rect'
  | 'square'
  | 'circle'
  | 'hexagon'
  | 'octagon'
  | 'rounded-rect'
  | 'chamfered-rect'
  | 'keyed'
  | 'l-shape'
  | 'plus'
  | 'freeform'
```

Add the vertex type near `DieShapeParams`:

```ts
export type FreeformVertex = { x: number; y: number }
```

Extend the `Die` type:

```ts
export type Die = {
  shape: DieShape
  width: number
  height: number
  background: string
  dieShapeParams?: DieShapeParams
  freeform?: { vertices: FreeformVertex[] }
}
```

In `src/domain/die/dieShapeParams.ts`, include `'freeform'` in the master list (it is neither legacy nor parametric):

```ts
const DIE_SHAPES = [...LEGACY_DIE_SHAPES, ...PARAMETRIC_DIE_SHAPES, 'freeform'] as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/die/dieShapeParams.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/project.ts src/domain/die/dieShapeParams.ts src/domain/die/dieShapeParams.test.ts
git commit -m "feat(v13-m0): add freeform die shape type and Die.freeform field"
```

---

### Task 2: Freeform vertex normalizer

**Files:**
- Create: `src/domain/die/freeformVertices.ts`
- Test: `src/domain/die/freeformVertices.test.ts`

**Interfaces:**
- Consumes: `FreeformVertex` from `../project` (Task 1).
- Produces: `resolveFreeformVertices(value: unknown): FreeformVertex[]` — drops non-finite/malformed vertices, clamps each component to `[0,1]`, returns a fresh unit-rectangle `[(0,0),(1,0),(1,1),(0,1)]` when fewer than 3 valid vertices remain.

This file must NOT import from `dieOutline.ts` (avoids an import cycle — `dieOutline.ts` imports this).

- [ ] **Step 1: Write the failing test**

Create `src/domain/die/freeformVertices.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveFreeformVertices } from './freeformVertices'

describe('resolveFreeformVertices', () => {
  it('keeps valid vertices and clamps each component to [0,1]', () => {
    expect(
      resolveFreeformVertices({
        vertices: [
          { x: 0.2, y: 0.1 },
          { x: 1.4, y: -0.3 },
          { x: 0.5, y: 0.9 },
        ],
      }),
    ).toEqual([
      { x: 0.2, y: 0.1 },
      { x: 1, y: 0 },
      { x: 0.5, y: 0.9 },
    ])
  })

  it('drops malformed vertices before counting', () => {
    expect(
      resolveFreeformVertices({
        vertices: [
          { x: 0, y: 0 },
          { x: Number.NaN, y: 0.5 },
          { x: 'nope', y: 0.5 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      }),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('falls back to a unit rectangle when fewer than three vertices survive', () => {
    expect(resolveFreeformVertices({ vertices: [{ x: 0.2, y: 0.2 }] })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('falls back when given a non-object or missing vertices', () => {
    expect(resolveFreeformVertices(undefined)).toHaveLength(4)
    expect(resolveFreeformVertices({})).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/die/freeformVertices.test.ts`
Expected: FAIL — module `./freeformVertices` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/domain/die/freeformVertices.ts`:

```ts
import type { FreeformVertex } from '../project'

const UNIT_RECTANGLE: readonly FreeformVertex[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

function clamp01(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(1, Math.max(0, value))
}

export function resolveFreeformVertices(value: unknown): FreeformVertex[] {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const raw = Array.isArray(source.vertices) ? source.vertices : []
  const vertices: FreeformVertex[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const point = entry as Record<string, unknown>
    const x = clamp01(point.x)
    const y = clamp01(point.y)
    if (x === null || y === null) continue
    vertices.push({ x, y })
  }
  if (vertices.length < 3) return UNIT_RECTANGLE.map((vertex) => ({ ...vertex }))
  return vertices
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/die/freeformVertices.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/die/freeformVertices.ts src/domain/die/freeformVertices.test.ts
git commit -m "feat(v13-m0): add freeform vertex normalizer"
```

---

### Task 3: `resolveDieOutline` freeform case + all DieShape type consumers

**Why this task also touches UI/3D files:** adding `'freeform'` to the `DieShape` union (Task 1) makes five exhaustive `DieShape` consumers non-exhaustive, so `tsc -p tsconfig.app.json` is RED until every one handles freeform. This task greens the whole app project. The runtime polygon pipeline is unchanged; these are type-completeness edits (plus one real routing choice: block clamp).

**Files:**
- Modify: `src/domain/die/dieOutline.ts` (import `resolveFreeformVertices`; add `case 'freeform'`)
- Modify: `src/features/editor/canvas/geometry.ts` (add `'freeform'` to the polygon-clamp group in `clampBlockToDie`)
- Modify: `src/features/projects/dieShapePreview.ts` (add a `freeform` entry to `SHAPE_CLASSES`)
- Modify: `src/features/editor/DieParameterPanel.tsx` (add `freeform: 'Freeform'` to `SHAPE_LABELS`)
- Modify: `src/three/chip3dAvailability.ts` (add `case 'freeform': return true` to `isChip3DShapeSupported`)
- Test: `src/domain/die/dieOutline.test.ts`, `src/features/projects/dieShapePreview.test.ts`, `src/three/chip3dAvailability.test.ts`

**Interfaces:**
- Consumes: `resolveFreeformVertices` (Task 2); existing `polygonOutline`, `outlineToPolygon`, `Point`, `clampBlockToPolygon`.
- Produces: `resolveDieOutline(die)` for `die.shape === 'freeform'` returns a `DieOutline` whose segments are all `kind: 'line'` over `vertex × {width,height}`, centroid = mean of the scaled points. `clampBlockToDie` routes freeform through the polygon clamp. `isChip3DShapeSupported('freeform') === true`. `dieShapePreviewClass('freeform')` returns a class string.

- [ ] **Step 1: Write the failing test**

Add to `src/domain/die/dieOutline.test.ts` (the `die(...)` helper already exists at the top of the file):

```ts
  it('resolves a freeform shape by scaling normalized vertices to width and height', () => {
    const outline = resolveDieOutline(
      die({
        shape: 'freeform',
        width: 100,
        height: 200,
        freeform: {
          vertices: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0.5, y: 1 },
          ],
        },
      }),
    )
    expect(outline.centroid).toEqual({ x: 50, y: 200 / 3 })
    expect(outline.segments).toEqual([
      { kind: 'line', from: { x: 0, y: 0 }, to: { x: 100, y: 0 } },
      { kind: 'line', from: { x: 100, y: 0 }, to: { x: 50, y: 200 } },
      { kind: 'line', from: { x: 50, y: 200 }, to: { x: 0, y: 0 } },
    ])
    expect(outlineToPolygon(outline)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 200 },
    ])
  })

  it('falls back to a full-frame rectangle when freeform data is missing', () => {
    const outline = resolveDieOutline(die({ shape: 'freeform', width: 100, height: 200 }))
    expect(outlineToPolygon(outline)).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/die/dieOutline.test.ts`
Expected: FAIL — `resolveDieOutline` has no `'freeform'` case (TypeScript non-exhaustive; the freeform call returns `undefined`).

- [ ] **Step 3: Write minimal implementation**

In `src/domain/die/dieOutline.ts`, add the import at the top (next to the existing `resolveDieShapeParams` import):

```ts
import { resolveFreeformVertices } from './freeformVertices'
```

Add a `case 'freeform'` in the `resolveDieOutline` switch (before the closing brace of the switch):

```ts
    case 'freeform': {
      const vertices = resolveFreeformVertices(die.freeform)
      const points = vertices.map((vertex) => ({
        x: vertex.x * die.width,
        y: vertex.y * die.height,
      }))
      const centroid = points.reduce(
        (accumulator, point) => ({
          x: accumulator.x + point.x / points.length,
          y: accumulator.y + point.y / points.length,
        }),
        { x: 0, y: 0 },
      )
      return polygonOutline(points, centroid)
    }
```

- [ ] **Step 4: Run the outline test to verify it passes**

Run: `npx vitest run src/domain/die/dieOutline.test.ts`
Expected: PASS. (`tsc` is still RED — the other four consumers are handled next.)

- [ ] **Step 5: Handle freeform in the four remaining DieShape consumers**

In `src/features/editor/canvas/geometry.ts`, add `'freeform'` to the polygon-clamp group of `clampBlockToDie` (it already routes octagon…plus through the polygon clamp — freeform joins them):

```ts
    case 'octagon':
    case 'rounded-rect':
    case 'chamfered-rect':
    case 'keyed':
    case 'l-shape':
    case 'plus':
    case 'freeform': {
      const outline = resolveDieOutline(die)
      return clampBlockToPolygon(block, outlineToPolygon(outline), outline.centroid)
    }
```

In `src/features/projects/dieShapePreview.ts`, add a `freeform` entry to the `SHAPE_CLASSES` object (satisfies `Record<DieShape, string>`). Use a generic irregular-polygon thumbnail to signal "custom"; M2 may refine it:

```ts
  freeform:
    'aspect-[3/2] [clip-path:polygon(0%_22%,28%_0%,72%_8%,100%_38%,84%_100%,34%_86%,10%_64%)]',
```

In `src/features/editor/DieParameterPanel.tsx`, add the label to `SHAPE_LABELS`:

```ts
  freeform: 'Freeform',
```

In `src/three/chip3dAvailability.ts`, add a freeform case to `isChip3DShapeSupported` (freeform extrudes as a polygon like the other shapes, so it is supported):

```ts
    case 'l-shape':
    case 'plus':
    case 'freeform':
      return true
```

- [ ] **Step 6: Add consumer coverage tests**

Add `'freeform'` to the `it.each<DieShape>([...])` shape list in `src/features/projects/dieShapePreview.test.ts` (so `dieShapePreviewClass('freeform')` is exercised) and in the `isChip3DShapeSupported` `it.each` shape list in `src/three/chip3dAvailability.test.ts`. Add to `src/domain/die/dieOutline.test.ts` a clamp-routing assertion:

```ts
  it('clamps a block through the polygon path for a freeform die', async () => {
    const { clampBlockToDie } = await import('../../features/editor/canvas/geometry')
    const clamped = clampBlockToDie(
      { x: -50, y: -50, w: 20, h: 20 },
      die({
        shape: 'freeform',
        width: 100,
        height: 100,
        freeform: {
          vertices: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        },
      }),
    )
    expect(clamped.x).toBeGreaterThanOrEqual(0)
    expect(clamped.y).toBeGreaterThanOrEqual(0)
    expect(clamped.x + clamped.w).toBeLessThanOrEqual(100)
    expect(clamped.y + clamped.h).toBeLessThanOrEqual(100)
  })
```

> If importing `geometry` from a `domain` test feels misplaced, put this clamp assertion in `src/features/editor/canvas/geometry.test.ts` instead (top-level import), and keep only the outline assertions in `dieOutline.test.ts`. Either location is fine; do not duplicate it in both.

- [ ] **Step 7: Run the affected suites and the typecheck — all green**

Run: `npx vitest run src/domain/die/dieOutline.test.ts src/features/projects/dieShapePreview.test.ts src/three/chip3dAvailability.test.ts src/features/editor/canvas/geometry.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors (the union is now handled by every exhaustive consumer).

- [ ] **Step 8: Commit**

```bash
git add src/domain/die/dieOutline.ts src/domain/die/dieOutline.test.ts \
  src/features/editor/canvas/geometry.ts src/features/projects/dieShapePreview.ts \
  src/features/projects/dieShapePreview.test.ts src/features/editor/DieParameterPanel.tsx \
  src/three/chip3dAvailability.ts src/three/chip3dAvailability.test.ts
git commit -m "feat(v13-m0): resolve freeform outline and satisfy all DieShape consumers"
```

---

### Task 4: Seed freeform vertices from the current shape

**Files:**
- Create: `src/domain/die/seedFreeform.ts`
- Test: `src/domain/die/seedFreeform.test.ts`

**Interfaces:**
- Consumes: `resolveDieOutline`, `outlineToPolygon` (`./dieOutline`); `resolveFreeformVertices` (`./freeformVertices`); `Die`, `FreeformVertex` (`../project`).
- Produces: `seedFreeformFromDie(die: Die): FreeformVertex[]` — flattens the current die outline to a polygon, normalizes each point to `[0,1]` by dividing by `width`/`height` (guarding zero), then runs it through `resolveFreeformVertices` for the min-3/clamp safety net.

This file imports `dieOutline.ts`; `dieOutline.ts` must NOT import this file (no cycle).

- [ ] **Step 1: Write the failing test**

Create `src/domain/die/seedFreeform.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Die } from '../project'
import { seedFreeformFromDie } from './seedFreeform'

const die = (overrides: Partial<Die>): Die => ({
  shape: 'rect',
  width: 100,
  height: 200,
  background: 'grid-cyan',
  ...overrides,
})

describe('seedFreeformFromDie', () => {
  it('converts a rectangle into its four normalized corners', () => {
    expect(seedFreeformFromDie(die({ shape: 'rect' }))).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('converts a concave plus into more than four normalized vertices within [0,1]', () => {
    const vertices = seedFreeformFromDie(die({ shape: 'plus' }))
    expect(vertices.length).toBeGreaterThan(4)
    for (const vertex of vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0)
      expect(vertex.x).toBeLessThanOrEqual(1)
      expect(vertex.y).toBeGreaterThanOrEqual(0)
      expect(vertex.y).toBeLessThanOrEqual(1)
    }
  })

  it('flattens an arc-based circle into many normalized vertices', () => {
    const vertices = seedFreeformFromDie(die({ shape: 'circle' }))
    expect(vertices.length).toBeGreaterThan(8)
    for (const vertex of vertices) {
      expect(vertex.x).toBeGreaterThanOrEqual(0)
      expect(vertex.y).toBeGreaterThanOrEqual(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/die/seedFreeform.test.ts`
Expected: FAIL — module `./seedFreeform` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/domain/die/seedFreeform.ts`:

```ts
import type { Die, FreeformVertex } from '../project'
import { outlineToPolygon, resolveDieOutline } from './dieOutline'
import { resolveFreeformVertices } from './freeformVertices'

export function seedFreeformFromDie(die: Die): FreeformVertex[] {
  const polygon = outlineToPolygon(resolveDieOutline(die))
  const vertices = polygon.map((point) => ({
    x: die.width === 0 ? 0 : point.x / die.width,
    y: die.height === 0 ? 0 : point.y / die.height,
  }))
  return resolveFreeformVertices({ vertices })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/die/seedFreeform.test.ts`
Expected: PASS (all 3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/die/seedFreeform.ts src/domain/die/seedFreeform.test.ts
git commit -m "feat(v13-m0): seed freeform vertices from the current die outline"
```

---

### Task 5: Schema `9 → 10` migration for freeform dies

**Files:**
- Modify: `src/domain/project.ts` (`CURRENT_SCHEMA_VERSION = 10`)
- Modify: `src/domain/projectMigration.ts` (keep `9` supported; normalize `die.freeform` for freeform shapes)
- Test: `src/domain/projectMigration.test.ts`

**Interfaces:**
- Consumes: `resolveFreeformVertices` (Task 2), `CURRENT_SCHEMA_VERSION` (bumped here).
- Produces: `migrateProject` accepts a `shape: 'freeform'` die, storing a normalized `die.freeform.vertices`; legacy (non-freeform) projects at schema 1–9 continue to migrate to `schemaVersion: 10` unchanged.

- [ ] **Step 1: Write the failing test**

Add to `src/domain/projectMigration.test.ts` (use the same project-record shape the existing tests in that file build — copy an existing valid record literal in the file and change only `schemaVersion` and `die`). Add:

```ts
  it('normalizes a freeform die and stamps the current schema version', () => {
    const migrated = migrateProject({
      ...validProjectRecord,
      schemaVersion: 10,
      die: {
        shape: 'freeform',
        width: 960,
        height: 640,
        background: 'grid-cyan',
        freeform: {
          vertices: [
            { x: 0, y: 0 },
            { x: 1.5, y: 0 },
            { x: 0.5, y: 1 },
          ],
        },
      },
    })
    expect(migrated.schemaVersion).toBe(10)
    expect(migrated.die.shape).toBe('freeform')
    expect(migrated.die.freeform).toEqual({
      vertices: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 },
      ],
    })
    expect(migrated.die.dieShapeParams).toBeUndefined()
  })

  it('still migrates a legacy schema-9 rectangle project to version 10', () => {
    const migrated = migrateProject({ ...validProjectRecord, schemaVersion: 9 })
    expect(migrated.schemaVersion).toBe(10)
    expect(migrated.die.freeform).toBeUndefined()
  })
```

> Note: `validProjectRecord` above stands for whatever valid record helper/literal already exists in `projectMigration.test.ts`. If the file has no shared helper, copy the full valid record literal an existing test uses and spread it. Do not invent new fields.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/projectMigration.test.ts`
Expected: FAIL — `migrated.schemaVersion` is `9` (or the freeform die throws / drops `freeform`).

- [ ] **Step 3: Write minimal implementation**

In `src/domain/project.ts`:

```ts
export const CURRENT_SCHEMA_VERSION = 10 as const
```

In `src/domain/projectMigration.ts`, add the import (next to the existing `dieShapeParams` import):

```ts
import { resolveFreeformVertices } from './die/freeformVertices'
```

Keep `9` explicitly supported (it is no longer `CURRENT_SCHEMA_VERSION`):

```ts
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, CURRENT_SCHEMA_VERSION])
```

In `normalizePersistedDie`, replace the parametric-only params block with a freeform-aware branch:

```ts
  if (die.shape === 'freeform') {
    die.freeform = { vertices: resolveFreeformVertices(candidate.freeform) }
  } else if (isParametricDieShape(die.shape)) {
    die.dieShapeParams = resolveDieShapeParams(die.shape, candidate.dieShapeParams)
  }
  return die
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/projectMigration.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full client suite and fix version-literal fallout**

Run: `npm run test:client`
Expected: Any test that asserts a literal `schemaVersion` of `9` (rather than importing `CURRENT_SCHEMA_VERSION`) now fails. For each such failure, update the expected literal from `9` to `10`. Tests that reference `CURRENT_SCHEMA_VERSION` need no change. Re-run until green.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run lint` and (if present) the project typecheck script.
Expected: no errors — the `DieShape` switch in `resolveDieOutline` is now exhaustive including `'freeform'`.

- [ ] **Step 7: Commit**

```bash
git add src/domain/project.ts src/domain/projectMigration.ts src/domain/projectMigration.test.ts
git commit -m "feat(v13-m0): migrate freeform dies and bump schema to 10"
```

---

### Task 6: Record M0 in implementation.md

**Files:**
- Modify: `implementation.md` (append a v13-M0 section)

**Interfaces:**
- Consumes: nothing. Documentation only.

- [ ] **Step 1: Append the implementation note**

Add a section to `implementation.md` (match the format of the existing v12 entries) recording: freeform geometry core landed on branch `v13-freeform`; new `'freeform'` `DieShape` + `Die.freeform` normalized vertices; `resolveFreeformVertices` normalizer (finite/clamp/min-3/unit-rect fallback); `resolveDieOutline` freeform case (scale by width/height, centroid = mean); `seedFreeformFromDie` converter; schema `9 → 10` migration keeping `9` supported. Note the downstream invariant held: `geometry.ts`, `ChipArtwork.tsx`, `chip3dModel.ts` unchanged. Note bezier and CSG remain deferred.

- [ ] **Step 2: Verify the full suite is green**

Run: `npm run test:client`
Expected: PASS (whole client suite).

- [ ] **Step 3: Commit**

```bash
git add implementation.md
git commit -m "docs(v13-m0): record freeform geometry core implementation"
```

---

## Self-Review

**Spec coverage (M0 slice of the v13 spec):**
- `'freeform'` shape + `Die.freeform` normalized vertices → Task 1. ✓
- Normalization helper (finite/clamp/min-3/fallback) → Task 2. ✓
- `resolveDieOutline` freeform case (scale by width/height, centroid mean) → Task 3. ✓
- Seed-from-shape conversion (rect + concave + arc-based) → Task 4. ✓
- Schema `9 → 10` migration, legacy unaffected → Task 5. ✓
- Downstream RUNTIME polygon pipeline unchanged (`clampBlockToPolygon`, `ChipArtwork.tsx`, `chip3dModel.ts` extrusion) → asserted via `outlineToPolygon` + clamp routing in Task 3. TYPE-level `DieShape` consumers (`clampBlockToDie` switch, `SHAPE_CLASSES`, `SHAPE_LABELS`, `isChip3DShapeSupported`) handle freeform in Task 3 so `tsc` is green; freeform preview thumbnail is a placeholder for M2 to refine. ✓
- Store commands, canvas UI, 3D/export browser QA, README bump → **out of M0 scope** (M1–M4). ✓

**Placeholder scan:** No TBD/TODO. The one deferred concrete is `validProjectRecord` in Task 5, which is explicitly the existing valid record in `projectMigration.test.ts` (the note tells the engineer to reuse it verbatim, not invent fields).

**Type consistency:** `FreeformVertex = { x: number; y: number }` and `Die.freeform = { vertices: FreeformVertex[] }` are defined in Task 1 and consumed unchanged in Tasks 2–5. `resolveFreeformVertices(value: unknown): FreeformVertex[]` is defined in Task 2 and called with the same signature in Tasks 3–5. `seedFreeformFromDie(die: Die): FreeformVertex[]` (Task 4) is not consumed within M0 (it is the entry point M2's palette action will call). No import cycle: `freeformVertices.ts` (Task 2) has no internal die imports; `dieOutline.ts` imports it (Task 3); `seedFreeform.ts` imports `dieOutline.ts` (Task 4) but nothing imports `seedFreeform.ts` back.
