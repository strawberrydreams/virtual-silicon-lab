# Public Launch QA Checklist

Status as of 2026-06-17: automated launch gates are complete. A manual browser QA pass was run on
2026-06-17 (dev mode, invite/closed/open + lockdown via server restarts, Playwright/Chrome). Two
defects found in that pass were fixed the same day (gallery lockdown wiring; reaction soft-gate
copy). The previously admin-UI-only gaps (invite-code mint/list/revoke, comment hide + ban-author,
user ban/unban, audit log) were then **implemented in `AdminPage.tsx` and browser-QA'd on 2026-06-17**
(invite create/revoke, owner ban/unban with the reason captured in the audit log, chip hide/unhide,
newest-first audit capture). See "Admin Operations Browser QA — 2026-06-17" below. The remaining
verify-page item was then **re-confirmed on a production bundle** (`vite preview`): a fresh token
renders "Email Verified" and a reused token renders "Verification Failed" — the dev-only StrictMode
false-failure is gone. A fresh integrity-checked SQLite backup was also taken. **Sign-off remains
pending owner go/no-go** and the production gate has not been flipped.

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
- ✅ **FIXED (was admin-UI gap) — admin operations now have UI.** `AdminPage.tsx` now surfaces, in
  addition to the existing chip hide/unhide/feature/unfeature/delete, chip report queue, and contests:
  invite-code mint/list/revoke, the comment report queue with comment hide + ban-author, user ban/unban
  on published chips (with an optional ban-reason field), and the audit log. Backed by `inviteApi.ts`
  plus `moderationApi.ts` additions, and by `listChipsForModeration`/`listCommentReports` now exposing
  `ownerUserId`/`ownerBannedAt`/`commentAuthorUserId`. Operators no longer need raw API calls for invite
  minting, comment moderation, or bans. See "Admin Operations Browser QA — 2026-06-17".
- ⚠️ **Email verification success shows a false failure in dev.** Backend verified the account
  (`email_verified_at` set; the "verify before publishing" notice cleared), but the verify page rendered
  "Verification Failed". Cause: React StrictMode double-invokes the effect in dev, so the single-use
  token is consumed by the first call and the second call 400s. Expected to render success in a
  production build (no double-invoke) — re-confirm on the prod bundle before sign-off. Reused-token
  failure is therefore also demonstrated.
- ✅ **FIXED — unverified reaction soft-gate message.** `requireActiveUser` now takes a per-action
  label, so a blocked like reads "Verify your email before reacting." (see the FIXED entry above).
- ➖ Reset revokes-all-sessions was not driven through the browser (no concurrent session); covered by
  the green `server/test/launchFlow.test.ts`.
- ➖ Gallery detail has no share-link control (share lives on the editor PublishPanel and `/s/:slug`).

## Admin Operations Browser QA — 2026-06-17 (results)

Playwright/Chrome against dev `dev:server` + client with `VSL_ADMIN_EMAILS` set and an admin account.

- ✅ **Admin access.** Admin email surfaces the `/admin` nav link and renders the Moderation page;
  non-admin remains blocked (code/tests unchanged).
- ✅ **Invite codes.** Create (max-uses / optional expiry / optional note) → list shows `used/max ·
  note · expires`; form resets; Revoke removes the row ("No invite codes yet").
- ✅ **User ban.** Ban-reason field → ban owner → "owner banned" + button toggles to "Unban owner";
  Unban restores. Correct target via `ownerUserId`/`ownerBannedAt`.
- ✅ **Chip moderation.** Hide → "hidden" + "Unhide" toggle; Unhide restores.
- ✅ **Audit log.** Actions recorded newest-first immediately: `hide_chip` → `ban_user` (reason in
  detail) → `unban_user` → `unhide_chip`, each with targetType/targetId/timestamp. Invite revoke is
  intentionally not audited (not a moderation route).
- ➖ **Comment report queue.** Empty-state only (no reported comments in the dev DB); admin comment
  hide + ban-author and the server path are covered by `AdminPage.test.tsx` + `launchFlow.test.ts`.
  Note: there is still no *user-facing* comment-report button (chip report exists; comment report is
  API-only).
- QA-mutated dev DB state was fully restored (chip visible, owner unbanned, test invite revoked).

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
- [x] Invite mint/redeem/exhaust/expire/revoke. ✅ (mint+list+revoke via admin UI; redeem/exhaust/expire via signup form)
- [x] Email verification page success and reused-token failure. ✅ re-confirmed on a production bundle (`vite preview`): fresh token → "Email Verified"; reused token → "Verification Failed". Dev-only StrictMode false-failure does not occur in the prod build.
- [x] Unverified publish/reaction soft-gate when verification is required. ✅ (like 403; toast copy fixed to "before reacting").
- [x] Forgot password request and reset link success. ✅ (enumeration-safe; reset + new-password login confirmed)
- [~] Password reset revokes older sessions. ➖ not browser-driven; covered by `launchFlow.test.ts`.
- [x] Publish to public gallery. ✅ (publish → make public; verified-account soft-gate allowed it)
- [x] Gallery detail loads poster, fake spec, reactions, comments, and share link. ✅ (poster/spec/reactions/comments) ➖ no share-link control on detail.
- [x] Like/unlike works for verified active users. ✅
- [x] Comment create/delete works for verified active users. ✅
- [~] Report comment, hide as admin, confirm public thread and admin comment queue clear. ⚠️ admin comment-hide + ban-author UI now exists and was browser-checked (empty queue); user-facing comment-report button is still API-only; full path covered by `launchFlow.test.ts`.
- [x] Ban user, confirm login and reaction are blocked. ✅ (ban via API → session revoked + login blocked; ban/unban now also available in admin UI and QA'd).
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
- [x] Fresh backup taken. ✅ (2026-06-17 online backup of `server/data/vsl.sqlite`; `PRAGMA integrity_check` = ok; users/chips/audit rows present. Re-take immediately before the flip per runbook.)
- [x] Operator can access admin panel. ✅ (full admin UI: invite/comment/ban/audit + chip/contest, QA'd 2026-06-17).
- [x] First invite batch prepared. ✅ (mint flow rehearsed via admin UI in invite mode; mint the real batch on production right after the flip.)
- [ ] Explicit go/no-go given. ⏳ owner action.
- [ ] On go: set `VSL_ACCESS_MODE=invite` in production and verify `/api/health`. ⏳ **infra action — requires a deployed production server, which does not exist in this workspace yet.** The full go-sequence was dress-rehearsed locally on the production bundle (see below).

### Go-Sequence Dress Rehearsal — 2026-06-17 (local prod bundle)

The runbook "On go" sequence was executed end-to-end against `vite preview` + the API server in
`VSL_ACCESS_MODE=invite`, as a rehearsal before it is run on real infra:

1. ✅ Set `VSL_ACCESS_MODE=invite` and restarted the server.
2. ✅ `/api/health` reports `"accessMode":"invite"` (direct and via the preview proxy).
3. ✅ Signup form gates on an Invite Code field; the field is required.
4. ✅ Minted the first invite via the admin UI (max-uses 1, note "launch batch 1").
5. ✅ Signed up a new account with that code; the invite then read 1/1 used (exhausted).
6. ✅ Ran an admin moderation action (feature/unfeature); both recorded in the audit log.

Remaining for the real launch: stand up the production deployment (server hosting + `VSL_SESSION_SECRET`,
`VSL_PUBLIC_BASE_URL`, persistent `VSL_DATA_DIR`/`VSL_UPLOAD_DIR`, seeded admin invite per runbook line 32),
owner go/no-go, then set `VSL_ACCESS_MODE=invite` there and verify live `/api/health`.
