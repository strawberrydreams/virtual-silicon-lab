# v13-M2 Canvas Authoring UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose freeform die authoring in the editor UI with a toolbar convert action, accurate 2D rendering, and basic Konva vertex add/move/delete controls.

**Architecture:** Reuse M1 store commands as the only mutation surface. `EditorToolbar` adds a `Freeform` shape option that calls the existing `setDieShape('freeform')` conversion path; `ChipArtwork` routes freeform through `traceDieOutline(resolveDieOutline(die))`; `ChipStage` renders an overlay of draggable vertex handles plus edge hit targets only when `project.die.shape === 'freeform'`.

**Tech Stack:** React 19, react-konva, TypeScript, Vitest, Testing Library.

---

## Global Constraints

- Local-only: no server, route, SQLite, sync, publish, gallery, or storage migration change.
- TDD: add failing tests before production edits for each behavior slice.
- Keep geometry normalized: stage overlay converts pixel coordinates to `{ x: px / die.width, y: py / die.height }`; store commands continue to clamp to `[0,1]`.
- Keep v13 limited to straight-line freeform vertices. No bezier handles, boolean CSG, lasso, or blank pen tool.
- Browser QA is required after implementation because jsdom cannot verify real Konva canvas hit testing.

### Task 1: Freeform toolbar entry

**Files:**
- Modify: `src/features/editor/EditorToolbar.tsx`
- Test: `src/features/editor/EditorToolbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that renders `EditorToolbar`, clicks `Freeform`, and expects `onSetDieShape('freeform')`. Also render with `dieShape: 'freeform'` and assert the button is active with `aria-pressed="true"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/editor/EditorToolbar.test.tsx`
Expected: FAIL because no `Freeform` button exists.

- [ ] **Step 3: Write minimal implementation**

Add `{ shape: 'freeform', label: 'Freeform' }` to the toolbar shape controls, outside the parametric menu, so conversion is one click and uses the existing `onSetDieShape` path.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/editor/EditorToolbar.test.tsx`
Expected: PASS.

### Task 2: Render freeform dies through the shared outline path

**Files:**
- Modify: `src/features/editor/canvas/ChipArtwork.tsx`
- Test: `src/features/editor/canvas/ChipArtwork.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a freeform project test that asserts the rendered die base and seal rings use `Shape` nodes named like the existing parametric outline branch instead of the fallback `Rect`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/editor/canvas/ChipArtwork.test.tsx`
Expected: FAIL because freeform currently falls through to the full-frame rectangle branch.

- [ ] **Step 3: Write minimal implementation**

In `clipForDie`, `DieShape`, and `SealRingLayer`, route `die.shape === 'freeform'` through `traceDieOutline(resolveDieOutline(die))` the same way parametric shapes are routed. Keep legacy `rect`, `square`, `circle`, and `hexagon` primitive branches unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/editor/canvas/ChipArtwork.test.tsx`
Expected: PASS.

### Task 3: Freeform vertex overlay in the stage

**Files:**
- Modify: `src/features/editor/canvas/ChipStage.tsx`
- Modify: `src/features/editor/EditorPage.tsx`
- Test: `src/features/editor/canvas/ChipStage.test.tsx`
- Test: `src/features/editor/EditorPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `ChipStage.test.tsx`, render a freeform project and assert visible vertex handles and edge add targets. Simulate a handle drag callback and expect `onMoveFreeformVertex(index, point)` with normalized coordinates. Simulate edge double-click and expect `onAddFreeformVertex(index, point)`. Simulate handle selection plus Delete and expect `onDeleteFreeformVertex(index)`.

In `EditorPage.test.tsx`, expand the mocked `ChipStage` props and assert `moveFreeformVertex`, `addFreeformVertex`, and `deleteFreeformVertex` are passed from the editor store.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:client -- src/features/editor/canvas/ChipStage.test.tsx src/features/editor/EditorPage.test.tsx`
Expected: FAIL because `ChipStage` has no freeform callbacks or overlay.

- [ ] **Step 3: Write minimal implementation**

Add three optional callback props to `ChipStage`: `onAddFreeformVertex`, `onMoveFreeformVertex`, and `onDeleteFreeformVertex`. When the die is freeform, resolve vertices, render a non-listening outline guide, render edge hit targets that insert a midpoint after the clicked edge, and render draggable circular handles. Keep one selected vertex index in component state. Delete/Backspace deletes the selected vertex unless the die is already at three vertices.

Wire `EditorPage` to pass `state.addFreeformVertex`, `state.moveFreeformVertex`, and `state.deleteFreeformVertex`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:client -- src/features/editor/canvas/ChipStage.test.tsx src/features/editor/EditorPage.test.tsx`
Expected: PASS.

### Task 4: Focused and full verification

**Files:**
- Modify: `implementation.md`

- [ ] **Step 1: Run focused tests**

Run: `npm run test:client -- src/features/editor/EditorToolbar.test.tsx src/features/editor/canvas/ChipArtwork.test.tsx src/features/editor/canvas/ChipStage.test.tsx src/features/editor/EditorPage.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run full client tests**

Run: `npm run test:client`
Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS, with only the known Vite large chunk warning if it appears.

- [ ] **Step 4: Browser QA**

Start the Vite dev server and verify: editor loads, `Freeform` converts the current die, freeform outline is non-rectangular for converted non-rect shapes, handles render, dragging a handle updates the outline, double-clicking an edge adds a vertex, selecting a handle and pressing Delete removes it down to the three-vertex floor, and the console has no relevant warnings/errors.

- [ ] **Step 5: Update `implementation.md`**

Record implementation decisions, trade-offs, RED/GREEN evidence, browser QA, and remaining limitations.
