# Public Launch QA Checklist

Status as of 2026-06-17: automated launch gates are complete. A manual browser QA pass was run on
2026-06-17 (dev mode, invite/closed/open + lockdown via server restarts, Playwright/Chrome). Two
defects found in that pass were fixed the same day (gallery lockdown wiring; reaction soft-gate
copy). **Sign-off remains pending owner review**: known remaining gaps are admin-UI-only (invite
codes, comment moderation, user bans, audit log are API-only) plus a dev-only StrictMode artifact on
the verify page to re-confirm on a production build. See "Manual QA Run — 2026-06-17" below. The
production gate has not been flipped.

## Manual QA Run — 2026-06-17 (results)

Legend: ✅ pass · ⚠️ pass-with-issue · ❌ fail/blocker · ➖ not exercisable in browser (API/automated only).

- ✅ **FIXED (was BLOCKER) — gallery lockdown is now wired.** With `VSL_GALLERY_LOCKDOWN=true` the
  original build still served public data because `server/src/index.ts` dropped `galleryLockdown` on
  the way into `createApp`. Fixed by routing runtime config through a single `buildAppDeps()` mapping
  (`server/src/app.ts`) that index.ts now uses; regression guard in `server/test/buildAppDeps.test.ts`.
  Re-verified against the running server: gallery/featured return empty, and detail/profile/share/poster
  all return `410 GALLERY_LOCKED`.
- ✅ **FIXED — reaction soft-gate copy.** A blocked like now reads "Verify your email before reacting."
  (`requireActiveUser` in `server/src/reactions/routes.ts` takes a per-action label; comment path keeps
  "before commenting"). Covered by `server/test/reactionsRoutes.test.ts`.
- ❌ **Admin UI gaps (API-only).** `AdminPage.tsx` surfaces chip hide/unhide/feature/unfeature/delete,
  chip report queue, and contests — but has **no UI** for: invite-code mint/list/revoke (runbook line
  27 claims an "admin invite-code panel"), comment report queue / comment hide, user ban/unban, or
  audit log. These exist only as `/api/admin/*` endpoints. Operators must use raw API calls for
  invite minting, comment moderation, and bans.
- ⚠️ **Email verification success shows a false failure in dev.** Backend verified the account
  (`email_verified_at` set; the "verify before publishing" notice cleared), but the verify page rendered
  "Verification Failed". Cause: React StrictMode double-invokes the effect in dev, so the single-use
  token is consumed by the first call and the second call 400s. Expected to render success in a
  production build (no double-invoke) — re-confirm on the prod bundle before sign-off. Reused-token
  failure is therefore also demonstrated.
- ⚠️ **Unverified reaction soft-gate shows the wrong message.** Liking as an unverified user is
  correctly blocked (403, like count unchanged) but the toast reads "Verify your email before
  commenting." for a *like* — `requireActiveUser` in `server/src/reactions/routes.ts` shares one
  message for like and comment.
- ➖ Reset revokes-all-sessions and comment report/hide/audit were not driven through the browser
  (no concurrent session / no comment-moderation UI); both are covered by the green
  `server/test/launchFlow.test.ts`.
- ➖ Gallery detail has no share-link control (share lives on the editor PublishPanel and `/s/:slug`).

## Automated Gates

- [x] Server launch-flow integration: invite signup, email verification, publish, gallery, like/comment,
      comment report/hide, audit, ban, profile, sitemap, reset session revocation.
- [x] `npm test`: client 77 files / 395 tests, server 61 files / 238 tests.
- [x] `npm run build`: green with known Vite >500 kB chunk warning.
- [x] `npm run typecheck --workspace server`: green.
- [x] `npm run lint`: green.
- [x] Load smoke recorded in `docs/ops/launch-runbook.md`.

## Manual Browser Matrix

Run against local or staging with client + API servers up and `VSL_ACCESS_MODE=invite`.

- [x] `closed` mode: signup blocked (closed-beta notice), login still works, gallery/share reads still work. ✅
- [x] `invite` mode: signup requires invite code (Invite Code field appears; missing/invalid blocked). ✅
- [x] `open` mode: signup works without invite code. ✅
- [x] Invite mint/redeem/exhaust/expire/revoke. ✅ (mint+list+revoke via API — no UI; redeem/exhaust/expire via signup form)
- [~] Email verification page success and reused-token failure. ⚠️ backend verifies; dev page shows false "Verification Failed" (StrictMode) — re-confirm on prod build.
- [x] Unverified publish/reaction soft-gate when verification is required. ✅ (like 403; toast copy fixed to "before reacting").
- [x] Forgot password request and reset link success. ✅ (enumeration-safe; reset + new-password login confirmed)
- [~] Password reset revokes older sessions. ➖ not browser-driven; covered by `launchFlow.test.ts`.
- [x] Publish to public gallery. ✅ (publish → make public; verified-account soft-gate allowed it)
- [x] Gallery detail loads poster, fake spec, reactions, comments, and share link. ✅ (poster/spec/reactions/comments) ➖ no share-link control on detail.
- [x] Like/unlike works for verified active users. ✅
- [x] Comment create/delete works for verified active users. ✅
- [ ] Report comment, hide as admin, confirm public thread and admin comment queue clear. ❌ no client UI (API-only); server path covered by `launchFlow.test.ts`.
- [x] Ban user, confirm login and reaction are blocked. ✅ (ban via API → session revoked + login blocked) ❌ no ban UI.
- [x] Feature/unfeature chip and confirm Featured row. ✅
- [x] Public profile `/u/:handle` shows only public visible chips. ✅
- [x] `robots.txt` and `sitemap.xml` include public share/profile URLs only. ✅
- [x] `VSL_GALLERY_LOCKDOWN=true`: gallery/featured empty; detail/profile/share/poster return 410. ✅ (fixed wiring; re-verified on running server)
- [x] `VSL_GALLERY_LOCKDOWN=false`: public reads recover. ✅ (default off; all public reads served during QA)

## Local-First Regression

- [x] Start the client with the API server stopped. ✅
- [x] Dashboard opens existing local projects from IndexedDB. ✅ (2 local projects + presets render)
- [x] Editor opens a local project. ✅ (Blocks readout + Konva canvases render)
- [x] Edit, autosave, refresh, and export still work. ✅ (added a block → "Autosaved" → survived refresh; export controls present)
- [x] Only expected `/api/*` offline errors appear. ✅ (only `/api/me` + `/api/health` 502 via dead proxy)

## Visual Gate

- [x] Gallery list reads as premium and consistent with v2 page-theme language. ✅ (dark space theme, poster-first)
- [x] Gallery detail poster/spec layout is polished. ✅
- [x] Share page is crawler-friendly and visually aligned. ✅ (server-rendered OG/Twitter meta + poster.png 3200x1800)
- [x] Public profile cards are clean and not visually amateurish. ✅
- [~] No overlapping text or broken mobile layout in launch-critical pages. ➖ desktop-first verified; mobile not assessed (out of scope per product invariants).

## Production Sign-Off

- [ ] Owner reviewed this checklist.
- [ ] Fresh backup taken.
- [ ] Operator can access admin panel.
- [ ] First invite batch prepared.
- [ ] Explicit go/no-go given.
- [ ] On go: set `VSL_ACCESS_MODE=invite` in production and verify `/api/health`.
