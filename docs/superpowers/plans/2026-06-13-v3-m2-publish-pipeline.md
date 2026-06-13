# V3-M2 Publish Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Let signed-in users publish a local project snapshot with die/poster PNG data, update that published snapshot, toggle visibility, and unpublish it without affecting local editing.

**Architecture:** The server owns the publish record, validates uploaded project JSON through shared `migrateProject(unknown)`, and stores PNG data URLs as text metadata in SQLite for M2. This deliberately defers filesystem/object storage to M6 deploy hardening while preserving the public API contract (`dieImageUrl` and `posterImageUrl`). The client adds a small publish API and an editor-side publish panel that renders PNGs from the existing export stages and treats an unreachable share server as local-first offline state.

**Tech Stack:** Hono, better-sqlite3, shared `src/domain` project migration, Vitest, React Testing Library, Zustand auth store, existing Konva export stages.

---

## File Map

| File | Role |
|---|---|
| `server/src/migrations.ts` | Add `002_published_chips` table and indexes. |
| `server/src/publish/validation.ts` | Validate publish payload fields and PNG data URL shape. |
| `server/src/publish/service.ts` | Insert/update/toggle/delete published chip records. |
| `server/src/publish/routes.ts` | Authenticated `/api/published-chips` routes. |
| `server/src/app.ts` | Mount publish routes beside account routes. |
| `server/test/publish*.test.ts` | Migration, validation, service, and API tests. |
| `src/features/publish/publishApi.ts` | Fetch client for publish endpoints. |
| `src/features/publish/PublishPanel.tsx` | Editor inspector panel for publish/update/visibility/unpublish. |
| `src/features/editor/EditorInspectorRail.tsx` | Mount `PublishPanel` above export controls. |
| `implementation.md`, `CLAUDE.md` | Record M2 decisions and milestone status. |

## Task 1: Publish table

- [x] Write `server/test/publishMigration.test.ts` proving `published_chips` exists, `(owner_user_id, source_project_id)` is unique, version defaults to 1, visibility defaults private, and user deletion cascades.
- [x] Run `npx vitest run test/publishMigration.test.ts --root server`; expect failure because the table is missing.
- [x] Add migration `002_published_chips` with `id`, `owner_user_id`, `source_project_id`, `slug`, `title`, `project_json`, `die_image_data_url`, `poster_image_data_url`, `is_public`, `version`, timestamps, a unique owner/source pair, and a unique slug.
- [x] Run `npx vitest run test/publishMigration.test.ts --root server`; expect pass.

## Task 2: Publish validation

- [x] Write `server/test/publishValidation.test.ts` for a valid payload, invalid project JSON, title length, non-boolean `isPublic`, and invalid PNG data URLs.
- [x] Run `npx vitest run test/publishValidation.test.ts --root server`; expect import failure.
- [x] Implement `server/src/publish/validation.ts` with `validatePublishInput(raw)` returning normalized `{ project, title, dieImageDataUrl, posterImageDataUrl, isPublic }`.
- [x] Run `npx vitest run test/publishValidation.test.ts --root server`; expect pass.

## Task 3: Publish service

- [x] Write `server/test/publishService.test.ts` covering first publish, republish incrementing `version`, visibility toggle without replacing images, and unpublish restricted to owner/source.
- [x] Run `npx vitest run test/publishService.test.ts --root server`; expect import failure.
- [x] Implement `server/src/publish/service.ts` with `upsertPublishedChip`, `setPublishedChipVisibility`, `deletePublishedChip`, and `getPublishedChipForOwnerProject`.
- [x] Run `npx vitest run test/publishService.test.ts --root server`; expect pass.

## Task 4: Publish API

- [x] Write `server/test/publishRoutes.test.ts` covering unauthorized publish, publish success, republish success, visibility patch, and delete.
- [x] Run `npx vitest run test/publishRoutes.test.ts --root server`; expect route failure.
- [x] Implement `server/src/publish/routes.ts`, reuse the signed session cookie auth boundary, and mount it from `server/src/app.ts`.
- [x] Run `npm run test --workspace server`; expect pass.

## Task 5: Client publish API and editor panel

- [x] Write `src/features/publish/publishApi.test.ts` for success, API error, and 502/503/504 unreachable mapping.
- [x] Write `src/features/publish/PublishPanel.test.tsx` for offline, anonymous, authenticated first publish, republish, visibility toggle, and unpublish states using fake stage refs.
- [x] Run the targeted client tests; expect import failure.
- [x] Implement `src/features/publish/publishApi.ts` and `src/features/publish/PublishPanel.tsx`.
- [x] Mount `PublishPanel` in `EditorInspectorRail` and pass the current `Project`.
- [x] Run targeted client tests; expect pass.

## Task 6: Docs and verification

- [x] Update `implementation.md` with M2 decisions, including the M2 data URL storage trade-off and M6 filesystem upload hardening follow-up.
- [x] Update `CLAUDE.md` milestone status for V3-M2.
- [x] Run `npm test`, `npm run build`, and `npm run typecheck --workspace server`.
- [x] Browser QA: with server running, publish from the editor, republish after a local edit, toggle public/private, unpublish, then stop the server and confirm local editor/export still works.
