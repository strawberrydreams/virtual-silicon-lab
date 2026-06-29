# V10-M7 Final QA Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close v10 by updating the release line to 0.8 v10, creating a 3D authoring QA release pack, and running final regression/browser gates.

**Architecture:** M7 should not introduce new product behavior. It adds a small documentation regression test, updates README release documentation, writes a concrete QA pack under `docs/ops/`, and records final results in `implementation.md`. If final browser QA exposes a release-blocking local QA plumbing issue, keep the fix scoped to that QA surface and record the trade-off.

**Tech Stack:** Vitest, Markdown docs, Vite browser smoke, existing local API server for publish/gallery/share round-trip.

---

### Task 1: Release Doc Contract

**Files:**
- Create: `tests/releaseDocs.test.ts`
- Modify: `implementation.md`

- [ ] **Step 1: Write the failing test.** Add a Vitest test that reads `README.md`, `README.kr.md`, and `docs/ops/v10-3d-authoring-qa.md`. It should require `0.8 v10`, a v10 3D Authoring release overview, explicit camera/lighting/environment/animation coverage, and final gate command names.
- [ ] **Step 2: Run RED.** Run `npm run test:client -- tests/releaseDocs.test.ts`. Expected: fail because README still says `0.7 v9` and the v10 QA pack does not exist.
- [ ] **Step 3: Update `implementation.md`.** Add a V10-M7 section noting the final QA/release scope and the RED result.

### Task 2: README + QA Pack

**Files:**
- Modify: `README.md`
- Modify: `README.kr.md`
- Create: `docs/ops/v10-3d-authoring-qa.md`

- [ ] **Step 1: Update English README.** Change the title/version line to `0.8 v10`, add v10 to the release overview, add a `3D Authoring (v10)` feature section, and update launch-status wording so v10 is described as client-side/no server route or SQLite migration.
- [ ] **Step 2: Update Korean README.** Mirror the English README changes in Korean.
- [ ] **Step 3: Create QA pack.** Add `docs/ops/v10-3d-authoring-qa.md` with final QA scope, browser scenarios, export parity contracts, known local-dev notes, and a verification checklist.
- [ ] **Step 4: Run GREEN.** Run `npm run test:client -- tests/releaseDocs.test.ts`. Expected: pass.

### Task 3: Final Gates + Browser QA

**Files:**
- Modify: `docs/ops/v10-3d-authoring-qa.md`
- Modify: `implementation.md`

- [ ] **Step 1: Run static gates.** Run `npm test`, `npm run build`, `npm run typecheck:server`, and `rg "three" dist/assets/index-*.js`.
- [ ] **Step 2: Run browser authoring smoke.** Start `npm run dev -- --host 127.0.0.1`, open `AURORA M5`, exercise camera save/reset, lighting, environment, animation, look preset, MP4 controls presence, Undo, and nonblank canvas.
- [ ] **Step 3: Run browser round-trip smoke.** Start the API server with signups open, publish an authored scene, open gallery/share deep link, confirm gallery/share 3D shows saved scene and no editor authoring controls.
- [ ] **Step 4: Record results.** Update the QA pack and `implementation.md` with exact commands, counts, browser observations, and known warnings.
- [ ] **Step 5: Commit.** Stage exact M7 files and commit `chore(v10-m7): finalize 3d authoring release`.
