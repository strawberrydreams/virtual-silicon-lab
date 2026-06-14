# V3-M3 Public Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a public gallery where anyone can browse public published chips and open a detail page showing the poster image and fake spec.

**Architecture:** Reuse the M2 `published_chips` table. Add unauthenticated read-only endpoints under `/api/gallery`, backed by service queries that only return `is_public = 1`. The client adds a gallery API and two page components (`/gallery`, `/gallery/:slug`) inside the existing page-theme app shell. M4 still owns `/s/:slug` share links and OG metadata; M5 still owns remix import.

**Tech Stack:** Hono, better-sqlite3, shared domain project JSON, Vitest, React Testing Library, React Router, v2 page theme CSS variables.

---

## File Map

| File | Role |
|---|---|
| `server/src/publish/service.ts` | Add public gallery list/detail query helpers. |
| `server/src/publish/routes.ts` | Add `GET /api/gallery` and `GET /api/gallery/:slug`. |
| `server/test/galleryRoutes.test.ts` | Server API tests for public-only list/detail behavior. |
| `src/features/gallery/galleryApi.ts` | Fetch client for public gallery endpoints. |
| `src/features/gallery/GalleryPage.tsx` | Public gallery listing route. |
| `src/features/gallery/GalleryDetailPage.tsx` | Public chip detail route with poster and spec. |
| `src/features/gallery/*.test.tsx` | Client API/page tests. |
| `src/app/App.tsx` | Add Gallery nav and routes, auto-apply hero page theme on detail. |
| `implementation.md`, `CLAUDE.md` | Record M3 outcome and decisions. |

## Task 1: Public gallery server API

- [x] Write `server/test/galleryRoutes.test.ts` proving `/api/gallery` returns only public chips ordered newest first, includes owner display name and poster URL, and `/api/gallery/:slug` returns poster + project spec for public chips while private/missing slugs return 404.
- [x] Run `npx vitest run test/galleryRoutes.test.ts --root server`; expect 404 route failures.
- [x] Add `listPublicPublishedChips` and `getPublicPublishedChipBySlug` to `server/src/publish/service.ts`.
- [x] Add unauthenticated gallery routes to `server/src/publish/routes.ts`.
- [x] Run `npx vitest run test/galleryRoutes.test.ts --root server`; expect pass.

## Task 2: Client gallery API

- [x] Write `src/features/gallery/galleryApi.test.ts` for list/detail success, 404 detail mapping to null, API error mapping, and 502/503/504 unreachable mapping.
- [x] Run `npm run test:client -- src/features/gallery/galleryApi.test.ts`; expect import failure.
- [x] Implement `src/features/gallery/galleryApi.ts`.
- [x] Run the targeted test; expect pass.

## Task 3: Gallery pages and routes

- [x] Write `src/features/gallery/GalleryPage.test.tsx` for loading, empty, offline, and card/link rendering.
- [x] Write `src/features/gallery/GalleryDetailPage.test.tsx` for poster/spec rendering, missing slug state, and offline state.
- [x] Update `src/app/App.test.tsx` to expect the Gallery nav link and `/gallery` route.
- [x] Run targeted client tests; expect import/route failures.
- [x] Implement `GalleryPage`, `GalleryDetailPage`, and wire routes/nav in `App.tsx`.
- [x] Run targeted client tests; expect pass.

## Task 4: Docs and verification

- [x] Update `implementation.md` with M3 decisions and limitations.
- [x] Update `CLAUDE.md` milestone status for V3-M3.
- [x] Run `npm test`, `npm run build`, and `npm run typecheck --workspace server`.
- [x] Browser QA: publish a chip as public, open `/gallery`, verify the card/poster appears, open detail, verify poster/spec, then stop the API server and confirm gallery reports offline without affecting local routes.
