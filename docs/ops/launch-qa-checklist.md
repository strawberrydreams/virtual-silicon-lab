# Public Launch QA Checklist

Status as of 2026-06-17: automated launch gates are complete. Manual production/browser sign-off is
pending owner review, so the production gate has not been flipped.

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

- [ ] `closed` mode: signup blocked, login still works, gallery/share reads still work.
- [ ] `invite` mode: signup requires invite code.
- [ ] `open` mode: signup works without invite code.
- [ ] Invite mint/redeem/exhaust/expire/revoke.
- [ ] Email verification page success and reused-token failure.
- [ ] Unverified publish/reaction soft-gate when verification is required.
- [ ] Forgot password request and reset link success.
- [ ] Password reset revokes older sessions.
- [ ] Publish to public gallery.
- [ ] Gallery detail loads poster, fake spec, reactions, comments, and share link.
- [ ] Like/unlike works for verified active users.
- [ ] Comment create/delete works for verified active users.
- [ ] Report comment, hide as admin, confirm public thread and admin comment queue clear.
- [ ] Ban user, confirm login and reaction are blocked.
- [ ] Feature/unfeature chip and confirm Featured row.
- [ ] Public profile `/u/:handle` shows only public visible chips.
- [ ] `robots.txt` and `sitemap.xml` include public share/profile URLs only.
- [ ] `VSL_GALLERY_LOCKDOWN=true`: gallery/featured empty; detail/profile/share/poster return 410.
- [ ] `VSL_GALLERY_LOCKDOWN=false`: public reads recover.

## Local-First Regression

- [ ] Start the client with the API server stopped.
- [ ] Dashboard opens existing local projects from IndexedDB.
- [ ] Editor opens a local project.
- [ ] Edit, autosave, refresh, and export still work.
- [ ] Only expected `/api/*` offline errors appear.

## Visual Gate

- [ ] Gallery list reads as premium and consistent with v2 page-theme language.
- [ ] Gallery detail poster/spec layout is polished.
- [ ] Share page is crawler-friendly and visually aligned.
- [ ] Public profile cards are clean and not visually amateurish.
- [ ] No overlapping text or broken mobile layout in launch-critical pages.

## Production Sign-Off

- [ ] Owner reviewed this checklist.
- [ ] Fresh backup taken.
- [ ] Operator can access admin panel.
- [ ] First invite batch prepared.
- [ ] Explicit go/no-go given.
- [ ] On go: set `VSL_ACCESS_MODE=invite` in production and verify `/api/health`.
