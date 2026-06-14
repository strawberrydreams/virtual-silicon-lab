# V3-M6 Deploy Packaging & QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move v3 from feature-complete sharing to deploy-ready: production-safe server startup, basic abuse controls, bounded uploads, deploy documentation, file-backed PNG storage, and final regression QA.

**Architecture:** Keep the editor local-first. The server remains a publish/share boundary, but production startup now fails closed when required env vars are missing. Runtime options are loaded once in `server/src/index.ts`, passed into `createApp`, and used by route middleware/validators. PNG storage is tracked as a separate M6 checkpoint because moving from SQLite data URLs to files affects DB shape, share poster serving, and gallery responses.

**Tech Stack:** Hono + TypeScript + better-sqlite3 server, Vitest. Client build remains Vite + React.

---

## File Structure

**New:**
- `server/src/config.ts` — parse production/development runtime env.
- `server/src/rateLimit.ts` — small fixed-window in-memory limiter for mutating API routes.
- `server/test/config.test.ts`
- `server/test/rateLimitRoutes.test.ts`

**Modified:**
- `server/src/index.ts` — load runtime config, fail production startup safely.
- `server/src/app.ts` — accept secure-cookie, upload-limit, and rate-limit options.
- `server/src/accounts/routes.ts` — set `Secure` on signed session cookies when configured.
- `server/src/publish/routes.ts` — pass upload byte limit into publish validation.
- `server/src/publish/validation.ts` — reject oversized PNG data URLs.
- `server/test/helpers.ts`, auth/publish tests as needed.
- `implementation.md`, `CLAUDE.md` — record M6 progress.

---

## Task 1: Runtime Config And Production Startup

- [x] Add tests for `loadRuntimeConfig`.
- [x] Development mode may use the existing insecure fallback secret, with explicit metadata so `index.ts` can warn.
- [x] Production mode requires:
  - `VSL_SESSION_SECRET` with at least 32 characters.
  - `VSL_PUBLIC_BASE_URL` as a valid `http:` or `https:` URL.
- [x] Production mode sets `secureCookies: true` and enables default mutating API rate limits.
- [x] Update `server/src/index.ts` to use the config object instead of reading env inline.

## Task 2: Secure Session Cookies

- [x] Add a route test proving `Set-Cookie` includes `Secure` when `createApp({ secureCookies: true })`.
- [x] Thread `secureCookies` through `AppDeps`.
- [x] Keep dev/test cookies unchanged unless the option is explicitly true.

## Task 3: Upload Size Limits

- [x] Add validation tests for oversized `dieImageDataUrl` and `posterImageDataUrl`.
- [x] Default to an 8 MiB decoded PNG byte limit per image; allow tests/runtime config to override.
- [x] Reject before `upsertPublishedChip` with the existing `INVALID_INPUT` response shape.

## Task 4: Mutating API Rate Limit

- [x] Add a route test that repeated `POST /api/auth/login` calls eventually return `429 RATE_LIMITED`.
- [x] Implement a fixed-window limiter keyed by client IP plus request path.
- [x] Apply only to mutating `/api/*` methods (`POST`, `PATCH`, `DELETE`) so public gallery/share reads are not throttled in v3.
- [x] Return `Retry-After` and `{ error: { code: 'RATE_LIMITED', message } }`.

## Task 5: File-Backed PNG Storage Checkpoint

- [x] Add a DB/storage design before editing schema: preserve API fields (`dieImageUrl`, `posterImageUrl`) while moving bytes out of SQLite.
- [x] Migrate or dual-read existing data URL rows.
- [x] Serve stored files through stable server URLs and keep `/s/:slug/poster.png` working.
- [x] Run publish/gallery/share regression tests after the storage change.

## Task 6: Deploy Docs And Final QA

- [x] Document production env vars and local deploy commands.
- [x] Run `npm test` and `npm run build`.
- [x] Run browser QA for signup → publish → gallery → share link → remix import → local edit.
- [x] Update `CLAUDE.md` to mark M6 complete only after file-backed storage and final QA are done.

---

## Current Slice

This pass implemented all M6 tasks. File-backed storage uses nullable `die_image_path` / `poster_image_path` columns plus dual-read fallback for legacy data URL rows; new publish rows store empty legacy data URL columns and stable `/uploads/...` paths.
