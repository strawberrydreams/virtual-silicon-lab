# v13-M4 Final QA & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close v13 Freeform with release documentation, QA pack, and final regression gates.

**Architecture:** M4 is documentation + verification. Update the release-doc test first, then update English/Korean READMEs and add a `docs/ops/` QA release pack. No production code should change in M4 unless final QA exposes a release-blocking issue.

**Tech Stack:** Markdown docs, Vitest release-doc contract test, browser QA, existing npm verification scripts.

---

## Global Constraints

- Do not touch server routes, SQLite migrations, sync, publish API, or project schema in M4.
- Preserve all M2/M3 uncommitted work in the current branch.
- Use TDD for the release-doc contract: update `tests/releaseDocs.test.ts`, watch it fail, then update docs.
- `docs/` is gitignored in this repo; new QA/plan docs exist on disk but require force-add later if staging.

### Task 1: Release-doc contract

**Files:**
- Modify: `tests/releaseDocs.test.ts`

- [ ] **Step 1: Write failing test**

Rewrite the v12 release-doc assertions to v13: version `0.11 v13`, `v13 Freeform`, freeform die outline authoring, vertex handles, 3D/export parity, and `docs/ops/v13-freeform-qa.md`.

- [ ] **Step 2: Run test**

Run: `npm run test:client -- tests/releaseDocs.test.ts`
Expected: FAIL because README and QA pack still describe v12.

### Task 2: README and QA pack

**Files:**
- Modify: `README.md`
- Modify: `README.kr.md`
- Create: `docs/ops/v13-freeform-qa.md`

- [ ] **Step 1: Update docs**

Bump both README version lines to `0.11 v13`, add v13 to the intro/version map/release overview, add a Freeform authoring section, update editor shape count from ten to eleven, and point final QA to `docs/ops/v13-freeform-qa.md`.

Create a QA pack covering freeform conversion, vertex add/move/delete, block reclamp, 2D rendering, 3D showcase, die/poster PNG export, MP4 export, no backend/sync change, and final regression commands.

- [ ] **Step 2: Run release-doc test**

Run: `npm run test:client -- tests/releaseDocs.test.ts`
Expected: PASS.

### Task 3: Final verification

**Files:**
- Modify: `implementation.md`

- [ ] **Step 1: Run full verification**

Run:
- `npm run test:client`
- `npm run build`
- `npm test`
- `npx eslint` on M4-touched files

Expected: PASS, except full `npm run lint` may remain blocked by the unrelated known lint issues already recorded in M2.

- [ ] **Step 2: Browser QA**

Run the v13 release smoke: create project, convert to Freeform, drag/add/delete vertices, open 3D showcase, confirm export controls, and check console logs.

- [ ] **Step 3: Update `implementation.md`**

Record RED/GREEN release-doc evidence, README/QA pack updates, final commands, browser QA, and known lint caveat.
