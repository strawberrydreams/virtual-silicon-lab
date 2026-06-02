# Editor Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Milestone 1 rectangular-only editor into a full editor core: four die shapes with bounded drag and resize, zoom/pan/grid/snap, block resize and rotate, selection, undo/redo/delete/duplicate/reorder, keyboard shortcuts, and a debounced autosave that never pollutes undo history.

**Architecture:** Split into a pure **editor engine** and a thin **canvas/UI layer**. The engine is a framework-agnostic `editorStore` (Zustand vanilla) that owns the working `Project`, single selection, an undo/redo history, and every mutation command — all unit-tested without React or Konva. Geometry, the block factory, debouncing, the shortcut resolver, and zoom math are pure functions tested directly. The canvas (`ChipStage`), toolbar, and hooks consume the engine and are verified in a browser, consistent with Milestone 1's choice to keep Konva out of unit tests.

**Tech Stack:** React, TypeScript, Zustand (`zustand/vanilla` + `zustand` `useStore`), Konva, React Konva, Vitest, React Testing Library.

---

## Context

- Milestone 1 (Foundation Vertical Slice) is complete on branch `feature/foundation-slice` in `.worktrees/foundation-slice`.
- Existing relevant files:
  - `src/domain/project.ts` — `Project`, `Block`, `Die`, `DieShape`, `BlockType` types. `Block` already has `rotation` and `zIndex`.
  - `src/features/editor/canvas/geometry.ts` — `snapToGrid(value, gridSize)` and `clampBlockToRect(block, die)`.
  - `src/features/editor/canvas/ChipStage.tsx` — exports `buildBlock(project, type, id?)` and the `ChipStage` component. **`buildBlock` currently sets `zIndex: project.blocks.length`, which collides after deletes.** This plan moves `buildBlock` to the domain layer and fixes the z-index.
  - `src/features/editor/EditorPage.tsx` — props `{ project, saveProject }`; saves on every change (no debounce, no history).
  - `src/features/editor/BlockPalette.tsx` — six block buttons calling `addBlock(type)`.
  - `src/app/App.tsx` — `EditorRoute` holds the project in local `useState` and calls `store.save` on every change.
  - `src/stores/projectStore.ts` — project-list CRUD (`load/create/duplicate/remove/get/save`). This stays as the persistence/list store; editing lives in the new `editorStore`.
- Test conventions (follow exactly):
  - Vitest with explicit `import { describe, expect, it } from 'vitest'` (no globals).
  - Vanilla Zustand stores are tested through `store.getState()` (see `src/stores/projectStore.test.ts`).
  - Pure geometry is tested directly with concrete numbers (see `src/features/editor/canvas/geometry.test.ts`).
  - Tests live next to their implementation as `*.test.ts(x)`.
  - `src/test/setup.ts` already loads `fake-indexeddb/auto` and `@testing-library/jest-dom/vitest`.
- Boundary rules (from the roadmap): `src/domain/` imports no React/Konva/Zustand/IndexedDB; `src/stores/` owns editor commands; canvas components receive serializable data and emit domain-level changes.
- **New boundary added by this plan:** `src/lib/` for framework-agnostic utilities with zero dependencies (the debouncer). Record this in `implementation.md`.

## Decisions Locked For v1

- **Single selection.** `selectedBlockId: string | null`. Multi-select is deferred.
- **History granularity = one entry per committed command.** Continuous drag/resize commits only on `dragEnd`/`transformEnd`. `select` never creates a history entry. Autosave never creates a history entry.
- **Zoom/pan are ephemeral view state**, held in `ChipStage` local React state, never stored in `Project`.
- **Die normalization on shape change.** Switching to `square`, `circle`, or `hexagon` sets `width = height = min(width, height)`; `rect` keeps current dimensions. All blocks are re-clamped to the new die. (Tradeoff: switching away from `rect` discards the rectangular aspect ratio — acceptable for v1.)
- **Radial clamp is conservative.** A block's circumscribed circle (center = block center, radius = half-diagonal) must fit inside the die's bounding circle (`circle`) or incircle (`hexagon`, radius = circumradius·√3/2). Oversized blocks are scaled down to fit and centered. Rotation is ignored for bounds (clamp uses the unrotated AABB). This keeps blocks fully inside and is deterministic and testable; exact polygon clamping is a later refinement.
- **z-index is unique and gap-tolerant.** New/duplicated blocks get `max(zIndex)+1`. Reorder swaps z-index with the adjacent block. Deletes leave gaps (rendering sorts by z-index).

## Target File Map

```text
src/
  lib/
    debounce.ts                         (new) framework-agnostic debouncer
    debounce.test.ts                    (new)
  domain/
    blockFactory.ts                     (new) buildBlock moved here, z-index fixed
    blockFactory.test.ts                (new)
  features/editor/
    shortcuts.ts                        (new) pure keyboard-shortcut resolver
    shortcuts.test.ts                   (new)
    useEditorShortcuts.ts               (new) thin React hook (browser-verified)
    useAutosave.ts                      (new) thin React hook (browser-verified)
    EditorToolbar.tsx                   (new) shape/undo/redo/reorder/duplicate/delete
    EditorToolbar.test.tsx              (new)
    EditorPage.tsx                      (modify) consume editorStore + hooks
    canvas/
      geometry.ts                       (modify) add clampBlockToRadial, clampBlockToDie, normalizeDie
      geometry.test.ts                  (modify) add shape clamp + normalize tests
      viewport.ts                       (new) pure zoomAtPointer
      viewport.test.ts                  (new)
      ChipStage.tsx                     (rewrite) shapes, grid, zoom/pan, selection, Transformer
      ChipStage.test.tsx                (delete) buildBlock test moves to blockFactory.test.ts
  stores/
    editorStore.ts                      (new) selection + history + commands
    editorStore.test.ts                 (new)
  app/
    App.tsx                             (modify) EditorRoute seeds editorStore, debounced persist
```

---

## Phase A — Editor Engine (pure, fully unit-tested)

### Task 1: Move The Block Factory To The Domain Layer And Fix Z-Index

**Files:**
- Create: `src/domain/blockFactory.ts`
- Create: `src/domain/blockFactory.test.ts`
- Modify: `src/features/editor/canvas/ChipStage.tsx` (remove `buildBlock`, import it)
- Delete: `src/features/editor/canvas/ChipStage.test.tsx`

- [ ] **Step 1: Write the failing block-factory test**

Create `src/domain/blockFactory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from './projectFactory'
import { buildBlock } from './blockFactory'

describe('buildBlock', () => {
  it('creates a bounded fantasy block with the first z-index in an empty project', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    const block = buildBlock(project, 'DreamSynth', 'block-1')

    expect(block).toMatchObject({
      id: 'block-1',
      type: 'DreamSynth',
      category: 'fantasy',
      x: 32,
      y: 32,
      w: 192,
      h: 112,
      rotation: 0,
      zIndex: 0,
    })
  })

  it('classifies known real blocks as real', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    expect(buildBlock(project, 'CPU', 'block-1').category).toBe('real')
  })

  it('assigns max(zIndex)+1 so z-index never collides after deletes', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    const withBlocks = {
      ...project,
      blocks: [
        { ...buildBlock(project, 'CPU', 'a'), zIndex: 5 },
        { ...buildBlock(project, 'GPU', 'b'), zIndex: 2 },
      ],
    }

    expect(buildBlock(withBlocks, 'SRAM', 'c').zIndex).toBe(6)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/domain/blockFactory.test.ts
```

Expected: FAIL because `src/domain/blockFactory.ts` does not exist.

- [ ] **Step 3: Implement the domain block factory**

Create `src/domain/blockFactory.ts`:

```ts
import type { Block, BlockType, Project } from './project'

const FANTASY_TYPES = new Set<BlockType>([
  'EmotionEngine',
  'DreamSynth',
  'QuantumMemory',
  'ConsciousnessProcessor',
  'RealityDistortionUnit',
  'TimeCore',
])

export function nextZIndex(blocks: Block[]): number {
  return blocks.reduce((max, block) => Math.max(max, block.zIndex + 1), 0)
}

export function buildBlock(
  project: Project,
  type: BlockType,
  id: string = crypto.randomUUID(),
): Block {
  return {
    id,
    type,
    category: FANTASY_TYPES.has(type) ? 'fantasy' : 'real',
    x: 32,
    y: 32,
    w: 192,
    h: 112,
    rotation: 0,
    glow: true,
    zIndex: nextZIndex(project.blocks),
  }
}
```

- [ ] **Step 4: Remove `buildBlock` from `ChipStage.tsx` and import it**

In `src/features/editor/canvas/ChipStage.tsx`, delete the local `FANTASY_TYPES` constant and the `buildBlock` function, and add this import next to the existing imports:

```tsx
import { buildBlock } from '../../../domain/blockFactory'
```

Keep the existing re-export so other modules importing `buildBlock` from `ChipStage` keep working until they are updated in this plan. Add at the bottom of `ChipStage.tsx`:

```tsx
export { buildBlock }
```

(Note: `EditorPage.tsx` imports `buildBlock` from `./canvas/ChipStage`. Task 7 rewrites `EditorPage` to use the editor store, which no longer imports `buildBlock` directly. The re-export keeps the file compiling until then.)

- [ ] **Step 5: Delete the obsolete ChipStage unit test**

Run:

```bash
git rm src/features/editor/canvas/ChipStage.test.tsx
```

(`buildBlock` is now covered by `src/domain/blockFactory.test.ts`. `ChipStage` rendering is browser-verified.)

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- src/domain/blockFactory.test.ts
npm run build
```

Expected: block-factory tests pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/domain/blockFactory.ts src/domain/blockFactory.test.ts src/features/editor/canvas/ChipStage.tsx
git commit -m "refactor: move block factory to domain and fix z-index"
```

### Task 2: Die Geometry For All Four Shapes

**Files:**
- Modify: `src/features/editor/canvas/geometry.ts`
- Modify: `src/features/editor/canvas/geometry.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Append to `src/features/editor/canvas/geometry.test.ts`:

```ts
import { clampBlockToDie, clampBlockToRadial, normalizeDie } from './geometry'
import type { Die } from '../../../domain/project'

function farthestCornerDistance(
  block: { x: number; y: number; w: number; h: number },
  center: { x: number; y: number },
) {
  const corners = [
    { x: block.x, y: block.y },
    { x: block.x + block.w, y: block.y },
    { x: block.x, y: block.y + block.h },
    { x: block.x + block.w, y: block.y + block.h },
  ]
  return Math.max(...corners.map((c) => Math.hypot(c.x - center.x, c.y - center.y)))
}

describe('clampBlockToRadial', () => {
  it('leaves a block that already fits unchanged', () => {
    const result = clampBlockToRadial({ x: 270, y: 270, w: 60, h: 60 }, { width: 600, height: 600 }, 300)
    expect(result).toEqual({ x: 270, y: 270, w: 60, h: 60 })
  })

  it('pulls an out-of-bounds block inside the radius', () => {
    const result = clampBlockToRadial({ x: 560, y: 280, w: 80, h: 80 }, { width: 600, height: 600 }, 300)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(300 + 1e-6)
  })

  it('shrinks and centers a block larger than the radius', () => {
    const result = clampBlockToRadial({ x: 0, y: 0, w: 1000, h: 1000 }, { width: 600, height: 600 }, 300)
    expect(result.w).toBeLessThan(1000)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(300 + 1e-6)
  })
})

describe('clampBlockToDie', () => {
  it('uses rectangular bounds for rect and square dies', () => {
    const die: Die = { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }
    expect(clampBlockToDie({ x: 940, y: -10, w: 120, h: 80 }, die)).toEqual({
      x: 840,
      y: 0,
      w: 120,
      h: 80,
    })
  })

  it('keeps every corner inside a circular die', () => {
    const die: Die = { shape: 'circle', width: 600, height: 600, background: 'grid-cyan' }
    const result = clampBlockToDie({ x: 560, y: 280, w: 80, h: 80 }, die)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(300 + 1e-6)
  })

  it('uses the tighter incircle for a hexagonal die', () => {
    const die: Die = { shape: 'hexagon', width: 600, height: 600, background: 'grid-cyan' }
    const result = clampBlockToDie({ x: 560, y: 280, w: 80, h: 80 }, die)
    const incircle = 300 * (Math.sqrt(3) / 2)
    expect(farthestCornerDistance(result, { x: 300, y: 300 })).toBeLessThanOrEqual(incircle + 1e-6)
  })
})

describe('normalizeDie', () => {
  it('keeps rectangular dimensions for the rect shape', () => {
    const die: Die = { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }
    expect(normalizeDie(die, 'rect')).toEqual(die)
  })

  it('squares the dimensions for non-rect shapes', () => {
    const die: Die = { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }
    expect(normalizeDie(die, 'circle')).toEqual({
      shape: 'circle',
      width: 640,
      height: 640,
      background: 'grid-cyan',
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/features/editor/canvas/geometry.test.ts
```

Expected: FAIL because `clampBlockToRadial`, `clampBlockToDie`, and `normalizeDie` do not exist.

- [ ] **Step 3: Implement the geometry helpers**

Append to `src/features/editor/canvas/geometry.ts` (keep the existing `snapToGrid` and `clampBlockToRect`):

```ts
import type { Die, DieShape } from '../../../domain/project'

const HEXAGON_INCIRCLE_RATIO = Math.sqrt(3) / 2

export function clampBlockToRadial(block: BlockRect, die: DieRect, radius: number): BlockRect {
  const centerX = die.width / 2
  const centerY = die.height / 2

  let { w, h } = block
  let halfDiagonal = Math.hypot(w / 2, h / 2)
  if (halfDiagonal > radius && halfDiagonal > 0) {
    const scale = radius / halfDiagonal
    w *= scale
    h *= scale
    halfDiagonal = radius
  }

  const maxDistance = Math.max(0, radius - halfDiagonal)
  let blockCenterX = block.x + block.w / 2
  let blockCenterY = block.y + block.h / 2
  const offsetX = blockCenterX - centerX
  const offsetY = blockCenterY - centerY
  const distance = Math.hypot(offsetX, offsetY)
  if (distance > maxDistance && distance > 0) {
    const scale = maxDistance / distance
    blockCenterX = centerX + offsetX * scale
    blockCenterY = centerY + offsetY * scale
  }

  return { x: blockCenterX - w / 2, y: blockCenterY - h / 2, w, h }
}

export function clampBlockToDie(block: BlockRect, die: Die): BlockRect {
  switch (die.shape) {
    case 'rect':
    case 'square':
      return clampBlockToRect(block, { width: die.width, height: die.height })
    case 'circle':
      return clampBlockToRadial(block, die, die.width / 2)
    case 'hexagon':
      return clampBlockToRadial(block, die, (die.width / 2) * HEXAGON_INCIRCLE_RATIO)
  }
}

export function normalizeDie(die: Die, shape: DieShape): Die {
  if (shape === 'rect') {
    return { ...die, shape }
  }
  const side = Math.min(die.width, die.height)
  return { ...die, shape, width: side, height: side }
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/features/editor/canvas/geometry.test.ts
npm run build
```

Expected: geometry tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/canvas/geometry.ts src/features/editor/canvas/geometry.test.ts
git commit -m "feat: clamp blocks inside all four die shapes"
```

### Task 3: Editor Store — Selection, History, And Commands

**Files:**
- Create: `src/stores/editorStore.ts`
- Create: `src/stores/editorStore.test.ts`

- [ ] **Step 1: Write failing editor-store tests**

Create `src/stores/editorStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { buildBlock } from '../domain/blockFactory'
import type { Project } from '../domain/project'
import { createEditorStore } from './editorStore'

function seededProject(): Project {
  const base = createProject('Dream Chip', 'project-1', 100)
  return {
    ...base,
    blocks: [
      buildBlock(base, 'CPU', 'cpu'),
      { ...buildBlock(base, 'GPU', 'gpu'), zIndex: 1 },
    ],
  }
}

function fixedIds(...ids: string[]) {
  return () => ids.shift() ?? 'extra-id'
}

describe('editor store selection and history', () => {
  it('selecting a block does not create an undo entry', () => {
    const store = createEditorStore(seededProject())
    store.getState().select('cpu')

    expect(store.getState().selectedBlockId).toBe('cpu')
    expect(store.getState().past).toHaveLength(0)
  })

  it('undo and redo restore previous and next project states', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('new-block') })
    store.getState().addBlock('SRAM')
    expect(store.getState().project.blocks).toHaveLength(3)

    store.getState().undo()
    expect(store.getState().project.blocks).toHaveLength(2)

    store.getState().redo()
    expect(store.getState().project.blocks).toHaveLength(3)
  })

  it('clears selection on undo when the selected block disappears', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('new-block') })
    store.getState().addBlock('SRAM') // selects 'new-block'
    expect(store.getState().selectedBlockId).toBe('new-block')

    store.getState().undo()
    expect(store.getState().selectedBlockId).toBeNull()
  })
})

describe('editor store commands', () => {
  it('adds a clamped block at the top z-index and selects it', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('new-block') })
    store.getState().addBlock('SRAM')

    const added = store.getState().project.blocks.find((block) => block.id === 'new-block')
    expect(added?.zIndex).toBe(2)
    expect(store.getState().selectedBlockId).toBe('new-block')
  })

  it('transforms a block and clamps it to the die', () => {
    const store = createEditorStore(seededProject())
    store.getState().transformBlock('cpu', { x: 5000, y: 5000, w: 100, h: 100, rotation: 30 })

    const moved = store.getState().project.blocks.find((block) => block.id === 'cpu')!
    expect(moved.x + moved.w).toBeLessThanOrEqual(960)
    expect(moved.y + moved.h).toBeLessThanOrEqual(640)
    expect(moved.rotation).toBe(30)
  })

  it('deletes the selected block and clears selection', () => {
    const store = createEditorStore(seededProject())
    store.getState().select('cpu')
    store.getState().deleteSelected()

    expect(store.getState().project.blocks.map((block) => block.id)).toEqual(['gpu'])
    expect(store.getState().selectedBlockId).toBeNull()
  })

  it('duplicates the selected block with a new id and top z-index', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('copy') })
    store.getState().select('cpu')
    store.getState().duplicateSelected()

    const copy = store.getState().project.blocks.find((block) => block.id === 'copy')!
    expect(copy.type).toBe('CPU')
    expect(copy.zIndex).toBe(2)
    expect(store.getState().selectedBlockId).toBe('copy')
  })

  it('reorders by swapping z-index with the adjacent block', () => {
    const store = createEditorStore(seededProject()) // cpu z=0, gpu z=1
    store.getState().select('cpu')
    store.getState().bringForward()

    const byId = Object.fromEntries(store.getState().project.blocks.map((b) => [b.id, b.zIndex]))
    expect(byId.cpu).toBe(1)
    expect(byId.gpu).toBe(0)
  })

  it('does not create history when reorder has no adjacent block', () => {
    const store = createEditorStore(seededProject())
    store.getState().select('gpu') // gpu already on top (z=1)
    store.getState().bringForward()

    expect(store.getState().past).toHaveLength(0)
  })

  it('squares the die and re-clamps blocks when shape changes', () => {
    const store = createEditorStore(seededProject())
    store.getState().setDieShape('circle')

    const die = store.getState().project.die
    expect(die).toMatchObject({ shape: 'circle', width: 640, height: 640 })
    for (const block of store.getState().project.blocks) {
      expect(block.x + block.w).toBeLessThanOrEqual(640)
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/stores/editorStore.test.ts
```

Expected: FAIL because `src/stores/editorStore.ts` does not exist.

- [ ] **Step 3: Implement the editor store**

Create `src/stores/editorStore.ts`:

```ts
import { createStore } from 'zustand/vanilla'
import type { Block, BlockType, DieShape, Project } from '../domain/project'
import { buildBlock, nextZIndex } from '../domain/blockFactory'
import { clampBlockToDie, normalizeDie } from '../features/editor/canvas/geometry'

const MAX_HISTORY = 100

export type BlockTransform = {
  x: number
  y: number
  w: number
  h: number
  rotation?: number
}

export type EditorState = {
  project: Project
  selectedBlockId: string | null
  past: Project[]
  future: Project[]
  select: (id: string | null) => void
  addBlock: (type: BlockType) => void
  transformBlock: (id: string, transform: BlockTransform) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  bringForward: () => void
  sendBackward: () => void
  setDieShape: (shape: DieShape) => void
  undo: () => void
  redo: () => void
}

type Options = {
  createId?: () => string
}

export function createEditorStore(initialProject: Project, options: Options = {}) {
  const createId = options.createId ?? (() => crypto.randomUUID())

  return createStore<EditorState>((set, get) => {
    function commit(next: Project, extra: Partial<EditorState> = {}) {
      const { project, past } = get()
      set({
        project: next,
        past: [...past, project].slice(-MAX_HISTORY),
        future: [],
        ...extra,
      })
    }

    function replaceBlocks(project: Project, blocks: Block[]): Project {
      return { ...project, blocks }
    }

    function clampToDie(block: Block, project: Project): Block {
      return { ...block, ...clampBlockToDie(block, project.die) }
    }

    function swapZIndex(direction: 'forward' | 'backward') {
      const { project, selectedBlockId } = get()
      const current = project.blocks.find((block) => block.id === selectedBlockId)
      if (current === undefined) return

      const candidates = project.blocks.filter((block) =>
        direction === 'forward' ? block.zIndex > current.zIndex : block.zIndex < current.zIndex,
      )
      if (candidates.length === 0) return

      const neighbor = candidates.reduce((best, block) =>
        direction === 'forward'
          ? block.zIndex < best.zIndex
            ? block
            : best
          : block.zIndex > best.zIndex
            ? block
            : best,
      )

      const blocks = project.blocks.map((block) => {
        if (block.id === current.id) return { ...block, zIndex: neighbor.zIndex }
        if (block.id === neighbor.id) return { ...block, zIndex: current.zIndex }
        return block
      })
      commit(replaceBlocks(project, blocks))
    }

    return {
      project: initialProject,
      selectedBlockId: null,
      past: [],
      future: [],

      select(id) {
        set({ selectedBlockId: id })
      },

      addBlock(type) {
        const { project } = get()
        const block = clampToDie(buildBlock(project, type, createId()), project)
        commit(replaceBlocks(project, [...project.blocks, block]), { selectedBlockId: block.id })
      },

      transformBlock(id, transform) {
        const { project } = get()
        const blocks = project.blocks.map((block) => {
          if (block.id !== id) return block
          const clamped = clampBlockToDie(
            { x: transform.x, y: transform.y, w: transform.w, h: transform.h },
            project.die,
          )
          return {
            ...block,
            ...clamped,
            rotation: transform.rotation ?? block.rotation,
          }
        })
        commit(replaceBlocks(project, blocks))
      },

      deleteSelected() {
        const { project, selectedBlockId } = get()
        if (selectedBlockId === null) return
        commit(
          replaceBlocks(
            project,
            project.blocks.filter((block) => block.id !== selectedBlockId),
          ),
          { selectedBlockId: null },
        )
      },

      duplicateSelected() {
        const { project, selectedBlockId } = get()
        const source = project.blocks.find((block) => block.id === selectedBlockId)
        if (source === undefined) return

        const copy = clampToDie(
          {
            ...source,
            id: createId(),
            x: source.x + 16,
            y: source.y + 16,
            zIndex: nextZIndex(project.blocks),
          },
          project,
        )
        commit(replaceBlocks(project, [...project.blocks, copy]), { selectedBlockId: copy.id })
      },

      bringForward() {
        swapZIndex('forward')
      },

      sendBackward() {
        swapZIndex('backward')
      },

      setDieShape(shape) {
        const { project } = get()
        const die = normalizeDie(project.die, shape)
        const blocks = project.blocks.map((block) => ({
          ...block,
          ...clampBlockToDie(block, die),
        }))
        commit({ ...project, die, blocks })
      },

      undo() {
        const { past, project, future, selectedBlockId } = get()
        if (past.length === 0) return
        const previous = past[past.length - 1]
        set({
          project: previous,
          past: past.slice(0, -1),
          future: [project, ...future],
          selectedBlockId: previous.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
        })
      },

      redo() {
        const { past, project, future, selectedBlockId } = get()
        if (future.length === 0) return
        const next = future[0]
        set({
          project: next,
          past: [...past, project].slice(-MAX_HISTORY),
          future: future.slice(1),
          selectedBlockId: next.blocks.some((block) => block.id === selectedBlockId)
            ? selectedBlockId
            : null,
        })
      },
    }
  })
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/stores/editorStore.test.ts
npm run build
```

Expected: all editor-store tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat: add editor store with selection, history, and commands"
```

### Task 4: Framework-Agnostic Debouncer

**Files:**
- Create: `src/lib/debounce.ts`
- Create: `src/lib/debounce.test.ts`

- [ ] **Step 1: Write the failing debouncer test**

Create `src/lib/debounce.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncer } from './debounce'

describe('createDebouncer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the callback once after the quiet window', () => {
    const callback = vi.fn()
    const debouncer = createDebouncer(callback, 600)

    debouncer.schedule()
    debouncer.schedule()
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(600)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancel prevents a pending callback', () => {
    const callback = vi.fn()
    const debouncer = createDebouncer(callback, 600)

    debouncer.schedule()
    debouncer.cancel()
    vi.advanceTimersByTime(600)

    expect(callback).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/lib/debounce.test.ts
```

Expected: FAIL because `src/lib/debounce.ts` does not exist.

- [ ] **Step 3: Implement the debouncer**

Create `src/lib/debounce.ts`:

```ts
export type Debouncer = {
  schedule: () => void
  cancel: () => void
}

export function createDebouncer(callback: () => void, delayMs: number): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined

  return {
    schedule() {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        callback()
      }, delayMs)
    },
    cancel() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
  }
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/lib/debounce.test.ts
npm run build
```

Expected: debouncer tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debounce.ts src/lib/debounce.test.ts
git commit -m "feat: add framework-agnostic debouncer"
```

### Task 5: Keyboard Shortcut Resolver

**Files:**
- Create: `src/features/editor/shortcuts.ts`
- Create: `src/features/editor/shortcuts.test.ts`

- [ ] **Step 1: Write the failing shortcut-resolver test**

Create `src/features/editor/shortcuts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveShortcut } from './shortcuts'

describe('resolveShortcut', () => {
  it('maps undo and redo', () => {
    expect(resolveShortcut({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: false })).toBe('undo')
    expect(resolveShortcut({ key: 'z', metaKey: true, ctrlKey: false, shiftKey: true })).toBe('redo')
    expect(resolveShortcut({ key: 'z', metaKey: false, ctrlKey: true, shiftKey: false })).toBe('undo')
  })

  it('maps delete, duplicate, reorder, and deselect', () => {
    expect(resolveShortcut({ key: 'Backspace', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('delete')
    expect(resolveShortcut({ key: 'Delete', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('delete')
    expect(resolveShortcut({ key: 'd', metaKey: true, ctrlKey: false, shiftKey: false })).toBe('duplicate')
    expect(resolveShortcut({ key: ']', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('bringForward')
    expect(resolveShortcut({ key: '[', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('sendBackward')
    expect(resolveShortcut({ key: 'Escape', metaKey: false, ctrlKey: false, shiftKey: false })).toBe('deselect')
  })

  it('returns null for unmapped keys', () => {
    expect(resolveShortcut({ key: 'a', metaKey: false, ctrlKey: false, shiftKey: false })).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/editor/shortcuts.test.ts
```

Expected: FAIL because `src/features/editor/shortcuts.ts` does not exist.

- [ ] **Step 3: Implement the resolver**

Create `src/features/editor/shortcuts.ts`:

```ts
export type ShortcutCommand =
  | 'undo'
  | 'redo'
  | 'delete'
  | 'duplicate'
  | 'bringForward'
  | 'sendBackward'
  | 'deselect'

export type ShortcutEvent = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
}

export function resolveShortcut(event: ShortcutEvent): ShortcutCommand | null {
  const mod = event.metaKey || event.ctrlKey
  const key = event.key.toLowerCase()

  if (mod && key === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (mod && key === 'd') return 'duplicate'
  if (!mod && (event.key === 'Delete' || event.key === 'Backspace')) return 'delete'
  if (!mod && event.key === ']') return 'bringForward'
  if (!mod && event.key === '[') return 'sendBackward'
  if (!mod && event.key === 'Escape') return 'deselect'
  return null
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/features/editor/shortcuts.test.ts
npm run build
```

Expected: resolver tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/shortcuts.ts src/features/editor/shortcuts.test.ts
git commit -m "feat: add keyboard shortcut resolver"
```

### Task 6: Pure Zoom Math

**Files:**
- Create: `src/features/editor/canvas/viewport.ts`
- Create: `src/features/editor/canvas/viewport.test.ts`

- [ ] **Step 1: Write the failing viewport test**

Create `src/features/editor/canvas/viewport.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { zoomAtPointer } from './viewport'

describe('zoomAtPointer', () => {
  it('zooms in toward the pointer and keeps that point stationary', () => {
    const result = zoomAtPointer({
      pointer: { x: 100, y: 100 },
      stagePos: { x: 0, y: 0 },
      oldScale: 1,
      deltaY: -100,
      scaleBy: 1.1,
    })

    expect(result.scale).toBeCloseTo(1.1, 5)
    // The world point under the pointer must map back to the same screen point.
    const worldX = (100 - result.pos.x) / result.scale
    expect(worldX).toBeCloseTo(100, 5)
  })

  it('clamps scale to the configured range', () => {
    const result = zoomAtPointer({
      pointer: { x: 0, y: 0 },
      stagePos: { x: 0, y: 0 },
      oldScale: 4,
      deltaY: -100,
      scaleBy: 1.1,
      min: 0.25,
      max: 4,
    })

    expect(result.scale).toBe(4)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/editor/canvas/viewport.test.ts
```

Expected: FAIL because `src/features/editor/canvas/viewport.ts` does not exist.

- [ ] **Step 3: Implement the zoom math**

Create `src/features/editor/canvas/viewport.ts`:

```ts
export type Point = { x: number; y: number }

export type ZoomInput = {
  pointer: Point
  stagePos: Point
  oldScale: number
  deltaY: number
  scaleBy?: number
  min?: number
  max?: number
}

export function zoomAtPointer(input: ZoomInput): { scale: number; pos: Point } {
  const scaleBy = input.scaleBy ?? 1.05
  const min = input.min ?? 0.25
  const max = input.max ?? 4

  const zoomingIn = input.deltaY < 0
  const unclamped = zoomingIn ? input.oldScale * scaleBy : input.oldScale / scaleBy
  const scale = Math.min(max, Math.max(min, unclamped))

  const worldPoint = {
    x: (input.pointer.x - input.stagePos.x) / input.oldScale,
    y: (input.pointer.y - input.stagePos.y) / input.oldScale,
  }

  return {
    scale,
    pos: {
      x: input.pointer.x - worldPoint.x * scale,
      y: input.pointer.y - worldPoint.y * scale,
    },
  }
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- src/features/editor/canvas/viewport.test.ts
npm run build
```

Expected: viewport tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/canvas/viewport.ts src/features/editor/canvas/viewport.test.ts
git commit -m "feat: add pointer-anchored zoom math"
```

---

## Phase B — Canvas And Wiring (browser-verified)

### Task 7: Toolbar, Hooks, Canvas Rewrite, And Route Wiring

**Files:**
- Create: `src/features/editor/EditorToolbar.tsx`
- Create: `src/features/editor/EditorToolbar.test.tsx`
- Create: `src/features/editor/useEditorShortcuts.ts`
- Create: `src/features/editor/useAutosave.ts`
- Rewrite: `src/features/editor/canvas/ChipStage.tsx`
- Rewrite: `src/features/editor/EditorPage.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write the failing toolbar test**

Create `src/features/editor/EditorToolbar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorToolbar } from './EditorToolbar'

function renderToolbar(overrides = {}) {
  const props = {
    dieShape: 'rect' as const,
    canUndo: true,
    canRedo: false,
    hasSelection: true,
    onSetDieShape: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onBringForward: vi.fn(),
    onSendBackward: vi.fn(),
    ...overrides,
  }
  render(<EditorToolbar {...props} />)
  return props
}

describe('EditorToolbar', () => {
  it('changes die shape', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Circle' }))
    expect(props.onSetDieShape).toHaveBeenCalledWith('circle')
  })

  it('disables redo when there is nothing to redo', () => {
    renderToolbar({ canRedo: false })
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('disables selection commands when nothing is selected', () => {
    renderToolbar({ hasSelection: false })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled()
  })

  it('invokes undo and delete handlers', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(props.onUndo).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/editor/EditorToolbar.test.tsx
```

Expected: FAIL because `EditorToolbar.tsx` does not exist.

- [ ] **Step 3: Implement the toolbar**

Create `src/features/editor/EditorToolbar.tsx`:

```tsx
import type { DieShape } from '../../domain/project'

type Props = {
  dieShape: DieShape
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  onSetDieShape: (shape: DieShape) => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  onDelete: () => void
  onBringForward: () => void
  onSendBackward: () => void
}

const SHAPES: { shape: DieShape; label: string }[] = [
  { shape: 'rect', label: 'Rect' },
  { shape: 'square', label: 'Square' },
  { shape: 'circle', label: 'Circle' },
  { shape: 'hexagon', label: 'Hexagon' },
]

const buttonClass = 'border border-cyan-900 px-3 py-1 text-xs uppercase tracking-wider disabled:opacity-30'

export function EditorToolbar({
  dieShape,
  canUndo,
  canRedo,
  hasSelection,
  onSetDieShape,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-cyan-900 bg-[#071015] p-3">
      <div className="flex gap-1">
        {SHAPES.map(({ shape, label }) => (
          <button
            key={shape}
            className={`${buttonClass} ${shape === dieShape ? 'bg-cyan-400/20 text-cyan-200' : ''}`}
            onClick={() => onSetDieShape(shape)}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <button className={buttonClass} disabled={!canUndo} onClick={onUndo}>
        Undo
      </button>
      <button className={buttonClass} disabled={!canRedo} onClick={onRedo}>
        Redo
      </button>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <button className={buttonClass} disabled={!hasSelection} onClick={onDuplicate}>
        Duplicate
      </button>
      <button className={buttonClass} disabled={!hasSelection} onClick={onDelete}>
        Delete
      </button>
      <button className={buttonClass} disabled={!hasSelection} onClick={onBringForward}>
        Forward
      </button>
      <button className={buttonClass} disabled={!hasSelection} onClick={onSendBackward}>
        Backward
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Verify the toolbar test passes**

Run:

```bash
npm test -- src/features/editor/EditorToolbar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Implement the shortcut and autosave hooks**

Create `src/features/editor/useEditorShortcuts.ts`:

```ts
import { useEffect } from 'react'
import { resolveShortcut, type ShortcutCommand } from './shortcuts'

export function useEditorShortcuts(handlers: Record<ShortcutCommand, () => void>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const command = resolveShortcut(event)
      if (command === null) return
      event.preventDefault()
      handlers[command]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}
```

Create `src/features/editor/useAutosave.ts`:

```ts
import { useEffect } from 'react'
import type { StoreApi } from 'zustand'
import { createDebouncer } from '../../lib/debounce'
import type { EditorState } from '../../stores/editorStore'
import type { Project } from '../../domain/project'

export function useAutosave(
  store: StoreApi<EditorState>,
  persist: (project: Project) => void,
  delayMs = 600,
) {
  useEffect(() => {
    const debouncer = createDebouncer(() => persist(store.getState().project), delayMs)
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.project !== previous.project) debouncer.schedule()
    })
    return () => {
      debouncer.cancel()
      unsubscribe()
    }
  }, [store, persist, delayMs])
}
```

- [ ] **Step 6: Rewrite the canvas**

Replace `src/features/editor/canvas/ChipStage.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer } from 'react-konva'
import type { Block, Die, Project } from '../../../domain/project'
import { snapToGrid } from './geometry'
import type { BlockTransform } from '../../../stores/editorStore'
import { zoomAtPointer } from './viewport'

const STAGE_WIDTH = 960
const STAGE_HEIGHT = 640
const GRID = 16
const MIN_BLOCK = 48

type Props = {
  project: Project
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onTransformBlock: (id: string, transform: BlockTransform) => void
}

function clipForDie(context: Konva.Context, die: Die) {
  const centerX = die.width / 2
  const centerY = die.height / 2
  if (die.shape === 'circle') {
    context.arc(centerX, centerY, die.width / 2, 0, Math.PI * 2)
    return
  }
  if (die.shape === 'hexagon') {
    const radius = die.width / 2
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      if (i === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.closePath()
    return
  }
  context.rect(0, 0, die.width, die.height)
}

function DieShape({ die }: { die: Die }) {
  const fill = '#0b1d24'
  const stroke = '#22d3ee'
  if (die.shape === 'circle') {
    return <Circle x={die.width / 2} y={die.height / 2} radius={die.width / 2} fill={fill} stroke={stroke} />
  }
  if (die.shape === 'hexagon') {
    return (
      <RegularPolygon
        x={die.width / 2}
        y={die.height / 2}
        sides={6}
        radius={die.width / 2}
        rotation={-90}
        fill={fill}
        stroke={stroke}
      />
    )
  }
  return <Rect width={die.width} height={die.height} fill={fill} stroke={stroke} />
}

function GridLines({ die }: { die: Die }) {
  const lines = []
  for (let x = GRID; x < die.width; x += GRID) {
    lines.push(<Line key={`v-${x}`} points={[x, 0, x, die.height]} stroke="#0e2b34" strokeWidth={1} />)
  }
  for (let y = GRID; y < die.height; y += GRID) {
    lines.push(<Line key={`h-${y}`} points={[0, y, die.width, y]} stroke="#0e2b34" strokeWidth={1} />)
  }
  return <Group clipFunc={(context) => clipForDie(context, die)}>{lines}</Group>
}

export function ChipStage({ project, selectedBlockId, onSelectBlock, onTransformBlock }: Props) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const blockRefs = useRef(new Map<string, Konva.Rect>())
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    if (transformer === null) return
    const node = selectedBlockId ? blockRefs.current.get(selectedBlockId) : undefined
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedBlockId, project.blocks])

  const sorted = project.blocks.slice().sort((left, right) => left.zIndex - right.zIndex)

  return (
    <Stage
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      draggable
      onWheel={(event) => {
        event.evt.preventDefault()
        const stage = event.target.getStage()
        const pointer = stage?.getPointerPosition()
        if (!stage || !pointer) return
        const next = zoomAtPointer({
          pointer,
          stagePos: { x: stage.x(), y: stage.y() },
          oldScale: scale,
          deltaY: event.evt.deltaY,
        })
        setScale(next.scale)
        setPosition(next.pos)
      }}
      onDragEnd={(event) => {
        if (event.target === event.target.getStage()) {
          setPosition({ x: event.target.x(), y: event.target.y() })
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.target.getStage()) onSelectBlock(null)
      }}
      className="border border-cyan-900"
    >
      <Layer>
        <DieShape die={project.die} />
        <GridLines die={project.die} />
        {sorted.map((block: Block) => (
          <Rect
            key={block.id}
            ref={(node) => {
              if (node) blockRefs.current.set(block.id, node)
              else blockRefs.current.delete(block.id)
            }}
            x={block.x}
            y={block.y}
            width={block.w}
            height={block.h}
            rotation={block.rotation}
            fill={block.category === 'fantasy' ? '#312e81' : '#164e63'}
            stroke={block.id === selectedBlockId ? '#f0abfc' : block.category === 'fantasy' ? '#a78bfa' : '#67e8f9'}
            strokeWidth={block.id === selectedBlockId ? 2 : 1}
            shadowColor={block.glow ? '#22d3ee' : undefined}
            shadowBlur={block.glow ? 12 : 0}
            draggable
            onClick={() => onSelectBlock(block.id)}
            onTap={() => onSelectBlock(block.id)}
            onDragStart={() => onSelectBlock(block.id)}
            onDragEnd={(event) => {
              onTransformBlock(block.id, {
                x: snapToGrid(event.target.x(), GRID),
                y: snapToGrid(event.target.y(), GRID),
                w: block.w,
                h: block.h,
                rotation: block.rotation,
              })
            }}
            onTransformEnd={(event) => {
              const node = event.target as Konva.Rect
              const scaleX = node.scaleX()
              const scaleY = node.scaleY()
              node.scaleX(1)
              node.scaleY(1)
              onTransformBlock(block.id, {
                x: node.x(),
                y: node.y(),
                w: Math.max(MIN_BLOCK, node.width() * scaleX),
                h: Math.max(MIN_BLOCK, node.height() * scaleY),
                rotation: node.rotation(),
              })
            }}
          />
        ))}
        {sorted.map((block) => (
          <Text
            key={`${block.id}-label`}
            x={block.x + 12}
            y={block.y + 12}
            rotation={block.rotation}
            text={block.type}
            fill="#ecfeff"
            listening={false}
          />
        ))}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < MIN_BLOCK || newBox.height < MIN_BLOCK ? oldBox : newBox
          }
        />
      </Layer>
    </Stage>
  )
}
```

- [ ] **Step 7: Rewrite the editor page to use the editor store**

Replace `src/features/editor/EditorPage.tsx` with:

```tsx
import { useMemo } from 'react'
import { useStore } from 'zustand'
import type { Project } from '../../domain/project'
import { createEditorStore } from '../../stores/editorStore'
import { BlockPalette } from './BlockPalette'
import { EditorToolbar } from './EditorToolbar'
import { ChipStage } from './canvas/ChipStage'
import { useAutosave } from './useAutosave'
import { useEditorShortcuts } from './useEditorShortcuts'

type Props = {
  project: Project
  persist: (project: Project) => void
}

export function EditorPage({ project, persist }: Props) {
  const store = useMemo(() => createEditorStore(project), [project])
  const state = useStore(store)

  useAutosave(store, persist)
  useEditorShortcuts({
    undo: state.undo,
    redo: state.redo,
    delete: state.deleteSelected,
    duplicate: state.duplicateSelected,
    bringForward: state.bringForward,
    sendBackward: state.sendBackward,
    deselect: () => state.select(null),
  })

  return (
    <main className="flex min-h-screen bg-[#03080b] text-[#d8f7ff]">
      <BlockPalette addBlock={state.addBlock} />
      <section className="flex flex-1 flex-col">
        <EditorToolbar
          dieShape={state.project.die.shape}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          hasSelection={state.selectedBlockId !== null}
          onSetDieShape={state.setDieShape}
          onUndo={state.undo}
          onRedo={state.redo}
          onDuplicate={state.duplicateSelected}
          onDelete={state.deleteSelected}
          onBringForward={state.bringForward}
          onSendBackward={state.sendBackward}
        />
        <div className="p-6">
          <h1 className="mb-4 text-lg tracking-[0.25em] uppercase">{state.project.name}</h1>
          <ChipStage
            project={state.project}
            selectedBlockId={state.selectedBlockId}
            onSelectBlock={state.select}
            onTransformBlock={state.transformBlock}
          />
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 8: Wire the editor route to persist via the project store**

In `src/app/App.tsx`, replace the `EditorRoute` function with:

```tsx
function EditorRoute() {
  const { projectId = '' } = useParams()
  const store = useProjectStore()
  const [project, setProject] = useState<Project>()

  useEffect(() => {
    void store.get(projectId).then(setProject)
  }, [projectId])

  if (project === undefined) return <p className="p-8">Loading project...</p>

  return (
    <EditorPage
      key={project.id}
      project={project}
      persist={(nextProject) => void store.save(nextProject)}
    />
  )
}
```

(The `key={project.id}` remounts the editor — and re-seeds `createEditorStore` — when navigating between projects. Persisting through `store.save` is now debounced inside `EditorPage` via `useAutosave`, replacing Milestone 1's save-on-every-change.)

- [ ] **Step 9: Verify the full suite and build**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass; production build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/features/editor src/app/App.tsx src/lib
git commit -m "feat: wire editor core canvas, toolbar, shortcuts, and autosave"
```

### Task 8: Browser Verification And Checkpoint

**Files:**
- Modify: `implementation.md`

- [ ] **Step 1: Start the development server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a localhost URL.

- [ ] **Step 2: Exercise the milestone in the in-app Browser**

Open the localhost URL, create a project, open the editor, and verify:

1. Switch the die shape through `Rect → Square → Circle → Hexagon`; the rendered die changes and the grid clips to the shape.
2. Add several blocks; drag one toward each edge of every shape and confirm it stays fully inside.
3. Select a block; resize and rotate it with the transformer handles; confirm it stays inside the die.
4. Use the toolbar to Duplicate, Delete, Forward, and Backward; confirm z-order changes.
5. Use keyboard shortcuts: `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo, `Delete`/`Backspace` delete, `Cmd/Ctrl+D` duplicate, `]`/`[` reorder, `Esc` deselect.
6. Zoom with the wheel toward the cursor and pan by dragging empty canvas.
7. Add ~150 blocks (hold/scripted) and confirm drag/select stay responsive.
8. Wait ~1s after the last edit, refresh, reopen the project, and confirm the layout persisted.

Expected: every die shape constrains drag and resize; undo/redo/reorder behave; autosave restores after refresh; the console has no errors.

- [ ] **Step 3: Record implementation notes**

Append a dated section to `implementation.md` recording:

```markdown
## 2026-06-02 - Editor core

### Implemented

- Added the editor store (selection, undo/redo history, add/transform/delete/duplicate/reorder/setDieShape).
- Added clamping for square, circle, and hexagon dies, plus die normalization on shape change.
- Added zoom/pan/grid/snap, resize/rotate via the Konva Transformer, the editor toolbar, keyboard shortcuts, and debounced autosave.
- Moved `buildBlock` to `src/domain/blockFactory.ts` and fixed z-index to `max+1`.

### Decisions

- Added a new `src/lib/` boundary for framework-agnostic utilities (the debouncer).
- Single selection only; multi-select deferred.
- Radial clamp is conservative (circumscribed circle inside the die circle / hexagon incircle) and ignores rotation for bounds.
- Switching to a non-rect shape squares the die dimensions and re-clamps blocks.
- Zoom/pan are ephemeral view state, never persisted in the project JSON.
```

Append additional bullets for any deviation discovered during implementation.

- [ ] **Step 4: Final verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected: tests and build pass; git status only lists the intended `implementation.md` change.

- [ ] **Step 5: Commit verification notes**

```bash
git add implementation.md
git commit -m "docs: record editor core decisions"
```

---

## Cross-Cutting Verification

After every task: `npm test` and `npm run build`. After Task 7 and Task 8, exercise the browser flow above.

## Requirement Coverage (Milestone 2)

| Milestone 2 outcome | Task |
|---|---|
| square, circle, hexagon dies | 2 (clamp), 7 (render) |
| zoom, pan, visible grid, snap | 6 (zoom math), 7 (canvas) |
| block resize and rotate | 7 (Transformer) |
| die-bound constraints for all four shapes | 2, 3 (`transformBlock`/`setDieShape` clamp) |
| selection state | 3 |
| undo, redo, delete, duplicate, bring forward, send backward | 3 |
| keyboard shortcuts | 5 (resolver), 7 (hook) |
| autosave debounce that does not pollute undo history | 4 (debouncer), 7 (`useAutosave`) |
| all editor commands have focused unit tests | 1–6 |

## Self-Review Notes

- z-index collision from Milestone 1 is fixed in Task 1 (`nextZIndex` = `max+1`) and covered by `blockFactory.test.ts`.
- Method names are consistent across tasks: `clampBlockToDie`, `normalizeDie`, `createEditorStore`, `transformBlock`, `nextZIndex`, `resolveShortcut`, `zoomAtPointer`, `createDebouncer`.
- "Autosave does not pollute undo history" holds because `useAutosave` only reads `state.project` and calls `persist`; it never calls `commit`, `undo`, or `redo`.
- `EditorPage` re-seeds the editor store per project via `key={project.id}` so undo history never leaks across projects.
