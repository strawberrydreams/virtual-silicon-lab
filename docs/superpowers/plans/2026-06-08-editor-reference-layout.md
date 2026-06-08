# Editor Reference Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the editor screen toward the provided reference image: command-bar driven, dense SoC layout, left mode rail + library panel, central canvas workspace, right analysis/selection inspector, and bottom status readout.

**Architecture:** Preserve the existing editor store and Konva chip renderer while changing the surrounding editor information architecture first. Split shell/navigation components before visual polish so existing canvas and export behavior remain stable during layout migration.

**Tech Stack:** React 19, TypeScript, Zustand, Konva/react-konva, Vitest, Testing Library, Vite.

**Commit Policy:** Do not commit. The user explicitly requested checkpoint stops and no commits.

---

## Checkpoints

1. **Checkpoint 1: Shell Structure**
   - Target: editor frame matches the reference layout at a structural level.
   - Stop after: tests pass for top command bar, left mode rail, library panel, center workspace, right inspector, bottom status bar.
   - No browser polish required yet.

2. **Checkpoint 2: Library + Toolbar Fidelity**
   - Target: left rail gains icon-like mode buttons, library has search/filter/grid/list sections, toolbar becomes metadata row + shape/theme row + tool strip.
   - Stop after: toolbar and palette tests pass and desktop browser screenshot is visually close.

3. **Checkpoint 3: Inspector Fidelity**
   - Target: right rail presents Studio Analysis, Selected Tile, Appearance, and Layer Visibility in reference order.
   - Stop after: selected tile and no-selection states are tested and browser QA has no console errors.

4. **Checkpoint 4: Canvas Chrome + Status**
   - Target: canvas workspace gets coordinate gutters, zoom controls, grid/snap/DRC status, and tighter stage framing.
   - Stop after: browser QA on desktop and one narrow viewport passes.

---

## File Map

- Modify `src/features/editor/EditorPage.tsx`
  - Owns top-level editor layout and passes store actions into child panels.
- Modify `src/features/editor/BlockPalette.tsx`
  - Split visual structure into mode rail + library panel while preserving existing addBlock/addSticker/addSpray callbacks.
- Modify `src/features/editor/EditorToolbar.tsx`
  - Reorganize controls into reference-like command rows without changing handler signatures in checkpoint 1.
- Modify `src/features/editor/canvas/ChipStage.tsx`
  - Later checkpoints only: add workspace chrome and zoom/status affordances around existing canvas.
- Modify `src/styles.css`
  - Primary layout and visual system changes for the editor reference surface.
- Modify tests:
  - `src/features/editor/EditorPage.test.tsx`
  - `src/features/editor/BlockPalette.test.tsx`
  - `src/features/editor/EditorToolbar.test.tsx`
- Maintain `implementation.md`
  - Append checkpoint decisions, trade-offs, and verification results continuously.

---

## Checkpoint 1 Task: Shell Structure

**Files:**
- Modify: `src/features/editor/EditorPage.test.tsx`
- Modify: `src/features/editor/BlockPalette.test.tsx`
- Modify: `src/features/editor/EditorPage.tsx`
- Modify: `src/features/editor/BlockPalette.tsx`
- Modify: `src/styles.css`
- Modify: `implementation.md`

- [x] **Step 1: Write failing layout contract tests**

Add expectations that:
- `EditorPage` exposes `Editor top command bar`, `Editor canvas workspace`, and `Editor status bar`.
- `BlockPalette` exposes `Editor mode rail`, `Library panel`, search input, filter buttons, and `Add custom tile`.
- Existing commands remain reachable.

Run:

```bash
npm test -- src/features/editor/EditorPage.test.tsx src/features/editor/BlockPalette.test.tsx
```

Expected: FAIL because the new landmarks and controls do not exist yet.

- [x] **Step 2: Implement structural shell**

Update `EditorPage` to use this structure:

```tsx
<main aria-label="Chip editor workspace" className="editor-shell editor-shell--reference">
  <BlockPalette ... />
  <section aria-label="Editor canvas workspace" className="editor-mainframe">
    <div aria-label="Editor top command bar" className="editor-topbar">...</div>
    <EditorToolbar ... />
    <div className="editor-stage-wrap">...</div>
    <div aria-label="Editor status bar" className="editor-statusbar">...</div>
  </section>
  <aside aria-label="Inspector and export rail" className="editor-side-rail editor-inspector-rail">...</aside>
</main>
```

Update `BlockPalette` so it renders:

```tsx
<aside aria-label="Creation rail" className="editor-left-shell">
  <nav aria-label="Editor mode rail" className="editor-mode-rail">...</nav>
  <section aria-label="Library panel" className="editor-side-rail editor-creation-rail">...</section>
</aside>
```

- [x] **Step 3: Add checkpoint 1 CSS**

Update `src/styles.css` so:
- `.editor-shell` uses four columns: mode/library composite, center, inspector.
- `.editor-left-shell` contains fixed-width mode rail and library panel.
- `.editor-topbar`, `.editor-mainframe`, `.editor-statusbar` match the reference structure.
- Existing `.editor-stage-wrap`, `.editor-toolbar`, and rail classes continue to work.

- [x] **Step 4: Verify checkpoint 1 tests**

Run:

```bash
npm test -- src/features/editor/EditorPage.test.tsx src/features/editor/BlockPalette.test.tsx
```

Expected: PASS.

- [x] **Step 5: Update implementation notes and stop**

Append to `implementation.md`:
- Checkpoint 1 scope completed.
- Store/canvas logic intentionally untouched.
- Commit intentionally not created.

Stop and ask the user whether to proceed to Checkpoint 2.

---

## Checkpoint 2 Task: Library + Toolbar Fidelity

**Files:**
- Modify: `src/features/editor/BlockPalette.tsx`
- Modify: `src/features/editor/EditorToolbar.tsx`
- Modify: `src/styles.css`
- Modify tests for palette and toolbar.

- [x] Add icon-style mode buttons using text/icons already available in the app.
- [x] Reflow hardware tiles into a 3-column dense grid.
- [x] Add library filter state if needed, or static filter controls if behavior is deferred.
- [x] Split toolbar visually into shape tabs, finish tabs, and operation strip.
- [x] Verify with targeted tests and browser screenshot.
- [x] Stop for approval.

---

## Checkpoint 3 Task: Inspector Fidelity

**Files:**
- Modify or create inspector grouping components under `src/features/editor/`.
- Modify `src/features/editor/EditorPage.tsx`.
- Modify `src/styles.css`.
- Modify tests for selected/no-selection states.

- [x] Reorder right rail into Studio Analysis, Selected Tile, Appearance, Layer Visibility.
- [x] Keep existing color/image/spec/export controls reachable through compact panels or existing sections.
- [x] Add selected block metrics from existing project state.
- [x] Verify with tests and browser console/screenshot.
- [x] Stop for approval.

---

## Checkpoint 4 Task: Canvas Chrome + Visual QA

**Files:**
- Modify `src/features/editor/canvas/ChipStage.tsx`.
- Modify `src/styles.css`.
- Add or update focused tests when DOM chrome changes.

- [x] Add coordinate gutters and zoom controls around the existing Konva stage.
- [x] Add bottom status readouts for autosave/grid/snap/DRC/coordinates.
- [x] Run `npm test`, `npm run build`, and Browser QA on `/editor/:id`.
- [x] Update `implementation.md`.
- [x] Stop with final QA summary, no commit.
