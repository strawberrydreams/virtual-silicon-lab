# v13-M3 3D + Export Parity Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock in that freeform dies flow through 3D model generation and 2D/MP4 export surfaces without bespoke export code.

**Architecture:** M3 is a verification milestone. The expected architecture is already in place from M0-M2: `resolveDieOutline` returns a polygon for freeform, `buildChip3DModel` consumes `outlineToPolygon(resolveDieOutline(die))`, and export stages compose shared `ChipArtwork` / `Chip3DModel` data. Add regression tests and browser QA; only change production code if a parity test exposes a real gap.

**Tech Stack:** TypeScript, Vitest, React Testing Library, react-konva mocks, Three model data, in-app Browser QA.

---

## Global Constraints

- Local-only: no server, sync, route, SQLite, publish, gallery, or schema change.
- Verification milestone: most tests are characterization/regression tests and should pass against the current M0-M2 implementation. If one fails, treat it as a real defect in the existing pipeline and fix the smallest affected production code.
- Freeform remains straight-line polygon only. No bezier, CSG, pen tool, or export-specific outline format.
- Export stages must continue to consume shared project data. Do not fork a freeform-specific export renderer.
- Browser QA is required for visual/export surfaces because jsdom cannot verify real Konva canvas pixels, WebGL, or downloads.

### Task 1: 3D footprint parity

**Files:**
- Modify: `src/visual/chip3d/chip3dModel.test.ts`

- [ ] **Step 1: Add regression tests**

Add `freeform` to the shared die-shape footprint matrix and add a targeted arbitrary freeform test that expects the die-base footprint to equal `outlineToPolygon(resolveDieOutline(project.die), 64)`. Include a concave freeform polygon to lock in ordered polygon preservation.

- [ ] **Step 2: Run test**

Run: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts`
Expected: PASS. If it fails, fix only the 3D footprint pipeline defect.

### Task 2: Die and poster export stage parity

**Files:**
- Modify: `src/features/export/DieExportStage.test.tsx`
- Create: `src/features/export/PosterExportStage.test.tsx`

- [ ] **Step 1: Add regression tests**

For `DieExportStage`, assert a freeform project renders the hidden stage at `project.die.width`/`project.die.height`, passes the exact freeform project shape to `ChipArtwork`, and uses `renderMode="die-only"`.

For `PosterExportStage`, mock `react-konva` and `ChipArtwork`, render a freeform project in each poster format, and assert the shared `ChipArtwork` receives `project.die.shape === 'freeform'` inside the poster composition.

- [ ] **Step 2: Run tests**

Run: `npm run test:client -- src/features/export/DieExportStage.test.tsx src/features/export/PosterExportStage.test.tsx`
Expected: PASS. If one fails, fix only the export-stage wiring defect.

### Task 3: MP4 model handoff parity

**Files:**
- Modify: `src/features/export/VideoExportPanel.test.tsx`

- [ ] **Step 1: Add regression test**

Build a minimal model object whose die-base piece has a polygon footprint from a freeform project, render `VideoExportPanel`, click `Export turntable MP4`, and assert `recordTurntableMp4` receives the same model object unchanged. This locks MP4 export to the model pipeline instead of inspecting die shape itself.

- [ ] **Step 2: Run test**

Run: `npm run test:client -- src/features/export/VideoExportPanel.test.tsx`
Expected: PASS.

### Task 4: Verification and QA record

**Files:**
- Modify: `implementation.md`

- [ ] **Step 1: Run focused M3 tests**

Run: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts src/features/export/DieExportStage.test.tsx src/features/export/PosterExportStage.test.tsx src/features/export/VideoExportPanel.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:
- `npm run test:client`
- `npm run build`
- `npm test`

Expected: PASS. `npm run lint` is allowed to remain blocked only by the unrelated known lint issues already recorded in M2.

- [ ] **Step 3: Browser QA**

Start Vite, create/open a project, switch to Freeform, open the 3D showcase, verify a rendered WebGL canvas and MP4 export control, use Export panel controls for die/poster visibility, and confirm browser console warn/error logs are empty or only expected dev-server proxy noise.

- [ ] **Step 4: Update `implementation.md`**

Record tests added, whether production code changed, browser QA outcome, and any remaining limitations.
