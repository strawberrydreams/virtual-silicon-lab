# v13-M1 Freeform Vertex Editing Store Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editor-store commands to seed a freeform die from the current shape and to add/move/delete its vertices, with block re-clamp and undo/redo, all as unit-tested store logic (no canvas UI yet).

**Architecture:** `setDieShape('freeform')` already runs through `normalizeDie`, so making `normalizeDie` seed `die.freeform` (via M0's `seedFreeformFromDie`) is all that is needed to convert the current shape to an editable freeform polygon. A shared `projectWithFreeformVertices` helper (mirroring the existing `projectWithDieShapeParams`) rebuilds `die.freeform` and re-clamps blocks; three thin commands — `addFreeformVertex`, `deleteFreeformVertex`, `moveFreeformVertex` — call it. Move uses the store's existing tag-coalesce so a drag collapses into one undo step. Vertices are normalized `[0,1]`; the canvas layer (M2) will convert pixel↔normalized.

**Tech Stack:** TypeScript, Zustand (`zustand/vanilla` via `createStore`), Vitest (globals OFF — explicit `import { describe, expect, it } from 'vitest'`). Vanilla stores tested via `store.getState()`.

## Global Constraints

- **Local-only.** No server/route/SQLite/sync change. Schema stays `10` (set in M0).
- **Normalized coordinates.** `Die.freeform.vertices` stay in `[0,1] × [0,1]`; commands take and store normalized `FreeformVertex` (`{ x: number; y: number }`). Clamping to `[0,1]` reuses M0's `resolveFreeformVertices`.
- **Reuse M0.** `seedFreeformFromDie` (`src/domain/die/seedFreeform.ts`), `resolveFreeformVertices` (`src/domain/die/freeformVertices.ts`), and `clampBlockToDie` (`src/features/editor/canvas/geometry.ts`) already exist — do not reimplement them.
- **Minimum 3 vertices.** `deleteFreeformVertex` is a no-op when it would drop below 3.
- **Undo/redo via `commit`.** All edits go through the store's existing `commit(next, extra, tag)` so they participate in the shared history; a vertex drag coalesces via a per-vertex tag.
- **No UI in M1.** Konva vertex handles, the palette `Freeform` entry, and `ChipArtwork` wiring are M2.
- **TDD, one concern per commit.** Test command: `npx vitest run <path>`; full client suite: `npm run test:client`.

---

### Task 1: Seed freeform vertices on shape switch (`normalizeDie`)

**Files:**
- Modify: `src/features/editor/canvas/geometry.ts` (`normalizeDie`: seed freeform, keep dimensions, drop stale `freeform`)
- Test: `src/features/editor/canvas/geometry.test.ts`, `src/stores/editorStore.test.ts`

**Interfaces:**
- Consumes: `seedFreeformFromDie` (`../../../domain/die/seedFreeform`), existing `Die`, `DieShape`.
- Produces: `normalizeDie(die, 'freeform')` returns a die with `shape: 'freeform'`, `freeform: { vertices: seedFreeformFromDie(die) }`, ORIGINAL width/height (not squared), and no `dieShapeParams`. Switching to any non-freeform shape drops any `freeform` field. Because `setDieShape` already calls `normalizeDie` and re-clamps blocks, this makes `setDieShape('freeform')` seed and clamp with no store change.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/editor/canvas/geometry.test.ts` (import `normalizeDie` if not already imported; a `Die` literal helper or inline object is fine — match the file's existing style):

```ts
  it('seeds freeform vertices from the current outline and keeps dimensions', () => {
    const rect: Die = { shape: 'rect', width: 120, height: 80, background: 'grid-cyan' }
    const next = normalizeDie(rect, 'freeform')
    expect(next.shape).toBe('freeform')
    expect(next.width).toBe(120)
    expect(next.height).toBe(80)
    expect(next.dieShapeParams).toBeUndefined()
    expect(next.freeform).toEqual({
      vertices: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    })
  })

  it('drops a stale freeform field when switching to a non-freeform shape', () => {
    const freeform: Die = {
      shape: 'freeform',
      width: 100,
      height: 100,
      background: 'grid-cyan',
      freeform: { vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }] },
    }
    const next = normalizeDie(freeform, 'rect')
    expect(next.shape).toBe('rect')
    expect(next.freeform).toBeUndefined()
  })
```

Add to `src/stores/editorStore.test.ts`:

```ts
  it('seeds a freeform die and re-clamps blocks when switching shape', () => {
    const store = createEditorStore(seededProject())
    store.getState().setDieShape('freeform')
    const die = store.getState().project.die
    expect(die.shape).toBe('freeform')
    expect(die.freeform?.vertices.length).toBeGreaterThanOrEqual(3)
    expect(store.getState().past).toHaveLength(1)
    const polygon = outlineToPolygon(resolveDieOutline(die))
    for (const block of store.getState().project.blocks) {
      expect(pointInPolygon({ x: block.x, y: block.y }, polygon)).toBe(true)
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/editor/canvas/geometry.test.ts src/stores/editorStore.test.ts`
Expected: FAIL — `normalizeDie` squares the die and never sets `freeform`, so the freeform assertions fail.

- [ ] **Step 3: Write minimal implementation**

In `src/features/editor/canvas/geometry.ts`, add the import next to the existing `dieOutline` import:

```ts
import { seedFreeformFromDie } from '../../../domain/die/seedFreeform'
```

Replace `normalizeDie` with:

```ts
export function normalizeDie(die: Die, shape: DieShape): Die {
  const next = { ...die, shape }
  delete next.dieShapeParams
  delete next.freeform
  if (shape === 'freeform') {
    return { ...next, freeform: { vertices: seedFreeformFromDie(die) } }
  }
  if (
    shape === 'rect' ||
    shape === 'rounded-rect' ||
    shape === 'chamfered-rect' ||
    shape === 'keyed' ||
    shape === 'l-shape'
  ) {
    return next
  }
  const side = Math.min(die.width, die.height)
  return { ...next, width: side, height: side }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/editor/canvas/geometry.test.ts src/stores/editorStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/canvas/geometry.ts src/features/editor/canvas/geometry.test.ts src/stores/editorStore.test.ts
git commit -m "feat(v13-m1): seed freeform vertices when switching die shape"
```

---

### Task 2: Add and delete freeform vertex commands

**Files:**
- Modify: `src/stores/editorStore.ts` (interface + `projectWithFreeformVertices` helper + `addFreeformVertex` / `deleteFreeformVertex`)
- Test: `src/stores/editorStore.test.ts`

**Interfaces:**
- Consumes: `FreeformVertex` (`../domain/project`), `resolveFreeformVertices` (`../domain/die/freeformVertices`), existing `clampBlockToDie`, `commit`.
- Produces (added to the `EditorState` type and the returned store object):
  - `addFreeformVertex(index: number, point: FreeformVertex): void` — inserts `point` at array position `index` (clamped to `[0, length]`); no-op unless `die.shape === 'freeform'`.
  - `deleteFreeformVertex(index: number): void` — removes the vertex at `index`; no-op if `index` is out of range or the result would have fewer than 3 vertices.
  - Both re-clamp all blocks and push one undo step. The shared `projectWithFreeformVertices(baseline, vertices)` normalizes the vertices (via `resolveFreeformVertices`), rebuilds `die.freeform`, and re-clamps blocks — mirroring the existing `projectWithDieShapeParams`.

- [ ] **Step 1: Write the failing tests**

Add to `src/stores/editorStore.test.ts` a helper that starts from a freeform die, then the tests:

```ts
  function freeformStore() {
    const store = createEditorStore(seededProject())
    store.getState().setDieShape('freeform')
    return store
  }

  it('adds a freeform vertex at the given index and pushes one undo step', () => {
    const store = freeformStore()
    const before = store.getState().project.die.freeform!.vertices.length
    const pastBefore = store.getState().past.length
    store.getState().addFreeformVertex(1, { x: 0.5, y: 0 })
    const vertices = store.getState().project.die.freeform!.vertices
    expect(vertices).toHaveLength(before + 1)
    expect(vertices[1]).toEqual({ x: 0.5, y: 0 })
    expect(store.getState().past).toHaveLength(pastBefore + 1)
  })

  it('clamps an added vertex to the unit square', () => {
    const store = freeformStore()
    store.getState().addFreeformVertex(0, { x: 1.4, y: -0.2 })
    expect(store.getState().project.die.freeform!.vertices[0]).toEqual({ x: 1, y: 0 })
  })

  it('deletes a freeform vertex but refuses to drop below three', () => {
    const store = freeformStore()
    // Reduce to exactly 3 vertices first.
    while (store.getState().project.die.freeform!.vertices.length > 3) {
      store.getState().deleteFreeformVertex(0)
    }
    expect(store.getState().project.die.freeform!.vertices).toHaveLength(3)
    const pastBefore = store.getState().past.length
    store.getState().deleteFreeformVertex(0)
    expect(store.getState().project.die.freeform!.vertices).toHaveLength(3)
    expect(store.getState().past).toHaveLength(pastBefore)
  })

  it('ignores freeform vertex commands when the die is not freeform', () => {
    const store = createEditorStore(seededProject())
    store.getState().addFreeformVertex(0, { x: 0.5, y: 0.5 })
    expect(store.getState().project.die.freeform).toBeUndefined()
    expect(store.getState().past).toHaveLength(0)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/stores/editorStore.test.ts`
Expected: FAIL — `addFreeformVertex`/`deleteFreeformVertex` are not defined on the store.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/editorStore.ts`, add imports near the existing domain imports:

```ts
import type { FreeformVertex } from '../domain/project'
import { resolveFreeformVertices } from '../domain/die/freeformVertices'
```

Add to the `EditorState` interface (next to `setDieShapeParams`):

```ts
  addFreeformVertex: (index: number, point: FreeformVertex) => void
  moveFreeformVertex: (index: number, point: FreeformVertex) => void
  deleteFreeformVertex: (index: number) => void
```

Add the helper alongside `projectWithDieShapeParams`:

```ts
    function projectWithFreeformVertices(baseline: Project, vertices: FreeformVertex[]): Project {
      if (baseline.die.shape !== 'freeform') return baseline
      const die = { ...baseline.die, freeform: { vertices: resolveFreeformVertices({ vertices }) } }
      const blocks = baseline.blocks.map((block) => ({
        ...block,
        ...clampBlockToDie(block, die),
      }))
      return { ...baseline, die, blocks }
    }
```

Add the two commands to the returned store object (near `setDieShapeParams`):

```ts
      addFreeformVertex(index, point) {
        const { project } = get()
        if (project.die.shape !== 'freeform') return
        const current = resolveFreeformVertices(project.die.freeform)
        const at = Math.min(Math.max(0, index), current.length)
        const vertices = [...current.slice(0, at), point, ...current.slice(at)]
        commit(projectWithFreeformVertices(project, vertices))
      },

      deleteFreeformVertex(index) {
        const { project } = get()
        if (project.die.shape !== 'freeform') return
        const current = resolveFreeformVertices(project.die.freeform)
        if (index < 0 || index >= current.length) return
        if (current.length - 1 < 3) return
        const vertices = [...current.slice(0, index), ...current.slice(index + 1)]
        commit(projectWithFreeformVertices(project, vertices))
      },
```

> Note: `moveFreeformVertex` is declared in the interface here but implemented in Task 3. Declaring it now would make the store object type-incomplete. To keep the tree green after THIS task, also add the `moveFreeformVertex` stub in Task 3's commit — so add the interface line and both add/delete now, and implement `moveFreeformVertex` in Task 3. If your toolchain flags the missing `moveFreeformVertex` implementation, add the interface line in Task 3 instead. Simplest: add only `addFreeformVertex` and `deleteFreeformVertex` to the interface in THIS task, and add the `moveFreeformVertex` interface line in Task 3.

Apply the "simplest" path: in THIS task add only `addFreeformVertex` and `deleteFreeformVertex` to the interface; leave `moveFreeformVertex` for Task 3.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/editorStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat(v13-m1): add and delete freeform vertex store commands"
```

---

### Task 3: Move freeform vertex command with drag coalescing

**Files:**
- Modify: `src/stores/editorStore.ts` (interface line + `moveFreeformVertex`)
- Test: `src/stores/editorStore.test.ts`

**Interfaces:**
- Consumes: `projectWithFreeformVertices` (Task 2), `resolveFreeformVertices`, `commit`.
- Produces: `moveFreeformVertex(index: number, point: FreeformVertex): void` — replaces the vertex at `index` with `point`; no-op unless `die.shape === 'freeform'` and `index` is in range. Re-clamps blocks and commits with the coalesce tag `` `freeform-vertex-move:${index}` `` so a continuous drag of one vertex collapses into a single undo step.

- [ ] **Step 1: Write the failing tests**

Add to `src/stores/editorStore.test.ts` (the `freeformStore()` helper from Task 2 is in scope):

```ts
  it('moves a freeform vertex and coalesces a drag into one undo step', () => {
    const store = freeformStore()
    const pastBefore = store.getState().past.length
    const original = store.getState().project.die.freeform!.vertices[0]
    store.getState().moveFreeformVertex(0, { x: 0.1, y: 0.1 })
    store.getState().moveFreeformVertex(0, { x: 0.2, y: 0.2 })
    store.getState().moveFreeformVertex(0, { x: 0.3, y: 0.3 })
    expect(store.getState().project.die.freeform!.vertices[0]).toEqual({ x: 0.3, y: 0.3 })
    expect(store.getState().past).toHaveLength(pastBefore + 1)

    store.getState().undo()
    expect(store.getState().project.die.freeform!.vertices[0]).toEqual(original)

    store.getState().redo()
    expect(store.getState().project.die.freeform!.vertices[0]).toEqual({ x: 0.3, y: 0.3 })
  })

  it('clamps a moved vertex to the unit square and ignores out-of-range indices', () => {
    const store = freeformStore()
    const count = store.getState().project.die.freeform!.vertices.length
    store.getState().moveFreeformVertex(0, { x: 2, y: -1 })
    expect(store.getState().project.die.freeform!.vertices[0]).toEqual({ x: 1, y: 0 })
    const snapshot = store.getState().project
    store.getState().moveFreeformVertex(count + 5, { x: 0.5, y: 0.5 })
    expect(store.getState().project).toBe(snapshot)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/stores/editorStore.test.ts`
Expected: FAIL — `moveFreeformVertex` is not defined on the store.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/editorStore.ts`, add the `moveFreeformVertex` line to the `EditorState` interface (next to `addFreeformVertex`/`deleteFreeformVertex`):

```ts
  moveFreeformVertex: (index: number, point: FreeformVertex) => void
```

Add the command to the returned store object (next to `addFreeformVertex`):

```ts
      moveFreeformVertex(index, point) {
        const { project } = get()
        if (project.die.shape !== 'freeform') return
        const current = resolveFreeformVertices(project.die.freeform)
        if (index < 0 || index >= current.length) return
        const vertices = current.map((vertex, i) => (i === index ? point : vertex))
        commit(projectWithFreeformVertices(project, vertices), {}, `freeform-vertex-move:${index}`)
      },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/editorStore.test.ts`
Expected: PASS (drag coalesces to one undo step; undo/redo restore vertex position).

- [ ] **Step 5: Full suite + typecheck**

Run: `npm run test:client`
Expected: whole client suite PASS.
Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat(v13-m1): move freeform vertex with drag coalescing"
```

---

### Task 4: Record M1 in implementation.md

**Files:**
- Modify: `implementation.md` (append a v13-M1 section)

**Interfaces:**
- Consumes: nothing. Documentation only — do not modify source/test files.

- [ ] **Step 1: Append the implementation note**

Read the existing v13-M0 section first to match the file's English format, then append a `## V13-M1 Freeform Vertex Editing` section recording: `normalizeDie` now seeds `die.freeform` via `seedFreeformFromDie` (keeping dimensions, dropping stale `freeform`/`dieShapeParams`), so `setDieShape('freeform')` converts the current shape to an editable polygon and re-clamps blocks with no store-command change; new `projectWithFreeformVertices` helper (mirrors `projectWithDieShapeParams`) re-clamps blocks after any vertex edit; `addFreeformVertex` / `deleteFreeformVertex` (min-3 enforced) / `moveFreeformVertex` (per-vertex tag-coalesce → one undo step per drag) store commands, all normalized to `[0,1]` via `resolveFreeformVertices` and no-op off freeform. Note that Konva vertex handles, the palette `Freeform` entry, and `ChipArtwork.tsx` 2D rendering remain M2.

- [ ] **Step 2: Verify the full suite is green**

Run: `npm run test:client`
Expected: PASS (whole client suite).

- [ ] **Step 3: Commit**

```bash
git add implementation.md
git commit -m "docs(v13-m1): record freeform vertex editing commands"
```

---

## Self-Review

**Spec coverage (M1 slice of the v13 spec — "add / move / delete vertex, min-3 enforcement, block re-clamp after edit, undo/redo"):**
- Convert current shape → seeded freeform die (store) → Task 1 (`normalizeDie` + `setDieShape`). ✓
- `geometry.ts normalizeDie` no longer squares freeform (captured M1 TODO from M0 final review) → Task 1. ✓
- Add vertex (`[0,1]` clamp) → Task 2. ✓
- Delete vertex (min-3) → Task 2. ✓
- Move vertex + block re-clamp + undo/redo, drag = one undo step → Task 3. ✓
- No-op off freeform / out-of-range guards → Tasks 2–3. ✓
- Konva handles, palette entry, `ChipArtwork` wiring → **out of M1 scope** (M2). ✓

**Placeholder scan:** No TBD/TODO. The `Die` literal helper in Task 1's geometry test is described as "match the file's existing style"; if the file has a shared `die()` builder, use it — otherwise the inline literal shown is complete and valid.

**Type consistency:** `addFreeformVertex`/`moveFreeformVertex`/`deleteFreeformVertex(index: number, point: FreeformVertex)` signatures are identical in the interface and the store object across Tasks 2–3. `projectWithFreeformVertices(baseline: Project, vertices: FreeformVertex[]): Project` is defined in Task 2 and consumed unchanged in Task 3. `resolveFreeformVertices` and `clampBlockToDie` are M0/existing exports, imported once. Interface staleness avoided: only `addFreeformVertex`/`deleteFreeformVertex` are added to the interface in Task 2; `moveFreeformVertex` is added in Task 3 in the same commit that implements it, so the store object never declares an unimplemented method.
