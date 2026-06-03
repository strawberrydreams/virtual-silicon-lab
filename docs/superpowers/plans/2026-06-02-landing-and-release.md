# Landing, QA, And Static Deployment (Milestone 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the static-hosted MVP by hardening pre-release editor gaps, presenting the project with a polished landing/dashboard experience, documenting how to run and deploy it, and completing the desktop Chrome QA gate.

**Architecture:** Keep the existing local-only project model. M6 should not add backend sharing, accounts, mobile-first layout, or new persisted schema. Landing and dashboard polish reuse the existing preset catalog and remix path; release hardening stays inside geometry and palette boundaries.

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS v4, Zustand, Konva + React Konva, Vitest + React Testing Library. No new runtime dependency unless a release blocker requires it.

---

## Context From Earlier Milestones

- M0-M5 are complete on `feature/foundation-slice` in `.worktrees/foundation-slice`.
- M5 verified die-only and poster PNG dimensions in Chrome and recorded two remaining pre-release debts:
  - rect/square boundary clamping ignores block rotation;
  - `BlockPalette` exposes only 6 of the 16 v1 block types.
- M6 is the final MVP milestone in the roadmap. Work after this belongs to post-MVP unless a QA gate fails.

## Release Scope

- landing page with 3 to 5 hero chips or hero preset signals;
- direct start without login;
- project dashboard polish;
- README and demo GIF placeholder/instructions;
- static hosting configuration;
- desktop Chrome QA checklist and results;
- final code review before merging `feature/foundation-slice` into `main`.

## Explicit Non-Scope

- backend share links, accounts, gallery/rankings, AI generation, mobile responsive redesign, Three.js/PixiJS, MP4 export, real EDA formats, or manufacturing validation.

---

# Checkpoint 1 - Pre-Release Hardening

### Task 1: Write M6 release plan

**Files:**
- Create: `docs/superpowers/plans/2026-06-02-landing-and-release.md`
- Modify: `implementation.md`

- [x] Record M6 scope, non-scope, task sequence, acceptance gates, and the first checkpoint boundary.
- [x] Note that the first checkpoint resolves the two known M5 review debts before landing polish begins.

### Task 2: Make rectangular clamps rotation-aware

**Files:**
- Modify: `src/features/editor/canvas/geometry.ts`
- Modify: `src/features/editor/canvas/geometry.test.ts`
- Modify: `src/stores/editorStore.ts`
- Modify: `src/stores/editorStore.test.ts`

- [ ] Add a failing geometry test proving all four corners of a 45-degree rotated block remain inside a rectangular die.
- [ ] Extend rectangular clamp logic to account for a block's rotated axis-aligned extents.
- [ ] Pass the candidate rotation into clamp during transform, duplication, shape changes, and existing block clamp paths.
- [ ] Add a store regression test for a rotated rectangular transform near the die edge.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit.

### Task 3: Expose the full v1 block palette

**Files:**
- Modify: `src/features/editor/BlockPalette.tsx`
- Add: `src/features/editor/BlockPalette.test.tsx`

- [ ] Add a failing test that all 16 v1 `BlockType` entries are rendered.
- [ ] Replace the 6-item palette with all real and fantasy block types.
- [ ] Keep the compact desktop editor layout usable by grouping real and fantasy blocks.
- [ ] Verify a representative newly exposed block can be added.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit.

Stop after Task 3 for the requested checkpoint.

---

# Checkpoint 2 - Landing And Dashboard Polish

### Task 4: Add a landing route with direct start

**Files:**
- Add: `src/features/landing/LandingPage.tsx`
- Add: `src/features/landing/LandingPage.test.tsx`
- Modify: `src/app/App.tsx`

- [ ] Route `/` to a first-screen product landing experience.
- [ ] Provide direct `Start from preset` and `Start blank` actions without login.
- [ ] Link existing local projects/dashboard from the landing page.
- [ ] Use the preset catalog for hero chips/signals; avoid fake marketing-only UI.

### Task 5: Polish dashboard for repeated use

**Files:**
- Modify: `src/features/projects/ProjectDashboard.tsx`
- Modify: `src/features/projects/ProjectDashboard.test.tsx`
- Modify as needed: `src/features/projects/PresetCard.tsx`

- [ ] Make local projects, preset remixing, and empty states clearer and denser.
- [ ] Preserve direct create/open/duplicate/delete flows.
- [ ] Keep card dimensions stable across names and themes.

### Task 6: Add README and static deployment config

**Files:**
- Add: `README.md`
- Add/Modify: static hosting config as needed
- Modify: `package.json` only if needed

- [ ] Document local setup, tests, build, preview, browser QA, and static deployment.
- [ ] Include a demo GIF note or placeholder path if the actual GIF is deferred.
- [ ] Keep the app backend-free and statically buildable.

---

# Checkpoint 3 - Final QA, Review, And Merge Decision

### Task 7: Desktop Chrome QA gate

**Files:**
- Modify: `implementation.md`
- Modify: `CLAUDE.md`

- [ ] New visitor can place first block within 30 seconds.
- [ ] Refresh and revisit preserve projects.
- [ ] A preset produces a presentation-ready poster in under five minutes.
- [ ] Desktop Chrome interaction remains smooth during the 150-block smoke test.
- [ ] Console errors remain empty except favicon 404 if still present.
- [ ] `npm test` and `npm run build` pass.

### Task 8: Final code review and merge recommendation

- [ ] Review `main..feature/foundation-slice` for bugs, regressions, missing tests, and release blockers.
- [ ] Fix blockers or record non-blocking follow-up items.
- [ ] If clean, recommend merging `feature/foundation-slice` into `main`.

## Requirement Coverage

| Requirement | M6 Task |
|---|---|
| landing page with 3 to 5 hero chips/signals | 4 |
| direct start without login | 4 |
| project dashboard polish | 5 |
| README and demo GIF | 6 |
| static hosting configuration | 6 |
| desktop Chrome QA checklist | 7 |
| known pre-release debt closed | 2, 3 |
| final review before merge | 8 |

