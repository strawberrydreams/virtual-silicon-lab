# SoC Custom Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the v2 editor direction into a Chip Custom Studio foundation with schema v2 studio data, deterministic global reflow, generated fake spec, and the first UI/export-visible studio hooks.

**Architecture:** Keep one local-first Project JSON document, but evolve it to schema v2 with `studio` defaults. Build pure domain helpers first: migration, global reflow, and generated spec. Then wire a minimal editor slice that lets the app show studio tools and generated spec without replacing every canvas interaction in one pass.

**Tech Stack:** Vite, React 19, TypeScript, Zustand, Konva/React Konva, Vitest, React Testing Library.

---

## File Map

- `src/domain/project.ts`: schema v2 types for `StudioState`, stickers, sprays, and generated spec profile.
- `src/domain/projectMigration.ts`: migrate legacy projects into schema v2 with studio defaults.
- `src/domain/studioDefaults.ts`: reusable default studio state and generated spec fallback.
- `src/studio/globalReflow.ts`: pure deterministic grid reflow engine.
- `src/studio/generatedSpec.ts`: pure generated Fake Spec metrics from blocks and studio decorations.
- `src/studio/globalReflow.test.ts`: RED/GREEN tests for no-overlap, global movement, and bounds.
- `src/studio/generatedSpec.test.ts`: RED/GREEN tests for metrics from tile mix, stickers, and sprays.
- `src/features/editor/BlockPalette.tsx`: rename/reframe creation rail as tile/sticker/spray kit.
- `src/features/editor/EditorPage.tsx`: show generated spec rail entry and pass studio-aware controls.
- `src/features/specs/GeneratedSpecPanel.tsx`: display generated metrics and generated feature copy.
- `src/features/editor/StudioInspector.tsx`: edit selected sticker/spray properties from the inspector rail.
- `src/features/editor/canvas/ChipArtwork.tsx`: shared static export render plus editor-injected interactive renderers for sprays and stickers.
- `src/features/editor/canvas/ChipStage.tsx`: studio item drag/transform selection and local block reflow preview.
- `implementation.md`: record schema decision, trade-offs, and first-slice verification.

## Task 1: Schema v2 Studio Defaults

- [x] Write failing migration tests in `src/domain/projectMigration.test.ts` that expect migrated projects to have `schemaVersion: 2`, `studio.layoutMode: 'global-reflow'`, `studio.detailMode: 'semi-auto'`, empty `sprays`, empty `stickers`, and default tile settings.
- [x] Run `npm test -- src/domain/projectMigration.test.ts` and verify the new tests fail because schema v2 studio fields do not exist.
- [x] Add studio types and defaults in `src/domain/project.ts` and `src/domain/studioDefaults.ts`.
- [x] Update `migrateProject()` to return schema v2 projects with studio defaults while accepting old schema v1 projects.
- [x] Run `npm test -- src/domain/projectMigration.test.ts` and verify the migration tests pass.

## Task 2: Global Reflow Engine

- [x] Create `src/studio/globalReflow.test.ts` with tests for deterministic packing, no overlap, bounds, and global movement when inserting a tile near the top row.
- [x] Run `npm test -- src/studio/globalReflow.test.ts` and verify it fails because `reflowBlocksGlobally()` does not exist.
- [x] Create `src/studio/globalReflow.ts` with a grid-based deterministic packer that accepts blocks, die, target block id, and target x/y.
- [x] Ensure the packer returns cloned blocks, never mutates source blocks, clamps to die bounds, and preserves zIndex/id/type/category.
- [x] Run `npm test -- src/studio/globalReflow.test.ts` and verify it passes.

## Task 3: Generated Fake Spec

- [x] Create `src/studio/generatedSpec.test.ts` with tests that fantasy tiles and sprays increase Fantasy/Style, memory tiles increase Bandwidth, and overcrowding reduces Stability.
- [x] Run `npm test -- src/studio/generatedSpec.test.ts` and verify it fails because `generateStudioSpec()` does not exist.
- [x] Create `src/studio/generatedSpec.ts` with deterministic metrics and feature text.
- [x] Run `npm test -- src/studio/generatedSpec.test.ts` and verify it passes.

## Task 4: Minimal Editor UI Hook

- [x] Add `src/features/specs/GeneratedSpecPanel.test.tsx` for metric labels and generated features.
- [x] Run `npm test -- src/features/specs/GeneratedSpecPanel.test.tsx` and verify it fails because the component does not exist.
- [x] Add `GeneratedSpecPanel.tsx` and render it in `EditorPage` above or beside `FakeSpecForm`.
- [x] Reframe `BlockPalette` visible headings from block library to studio tile/sticker/spray kit without removing existing block creation.
- [x] Run `npm test -- src/features/specs/GeneratedSpecPanel.test.tsx src/features/editor src/app` and verify pass.

## Task 5: First Studio Artwork Hook

- [x] Add tests or render-contract assertions for stickers/sprays once the data model is present.
- [x] Add Konva spray/sticker layers to `ChipArtwork` so editor and export share them.
- [x] Run `npm test -- src/features/export src/features/editor/canvas src/studio` and verify pass.

## Task 6: Documentation And QA

- [x] Update `implementation.md` with schema v2 decision, global reflow behavior, generated spec mapping, and deferred full drag interaction if not complete.
- [x] Run `git diff --check`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Start `npm run dev -- --host 127.0.0.1`.
- [x] Use Browser QA for dashboard -> editor: generated spec visible, studio rail visible, no console errors, and existing export controls still visible.

## Task 7: Direct Studio Item Editing

- [x] Add RED store tests for sticker/spray selection, move, update, duplicate, delete, and undo behavior.
- [x] Add `StudioInspector` tests for sticker text/rotation and spray radius/intensity edits.
- [x] Add shared `ChipArtwork` render-hook tests so export static artwork and editor interactive artwork stay separated.
- [x] Add `selectedStudioItem` and studio item commands to `editorStore` while preserving `selectedBlockId` compatibility.
- [x] Add `StudioInspector` to the right rail and wire update handlers from `EditorPage`.
- [x] Make sticker/spray artwork draggable/selectable in `ChipStage` through injected renderers and shared Transformer refs.
- [x] Add local block drag reflow preview in `ChipStage` so Global reflow is visible during drag without creating history entries.
- [x] Run targeted tests, full `npm test`, and `npm run build`.
- [x] Run final Browser QA for sticker/spray click, drag/edit, generated spec update, export controls, and console health.

## Current Execution Slice

Tasks 1-7 are implemented and verified. The current SoC Custom Studio slice is complete.
