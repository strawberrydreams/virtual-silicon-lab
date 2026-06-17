# Public Launch Operator Runbook

This runbook covers the v5 invite-mode launch path. Do not flip production access without an explicit
go/no-go from the owner.

## Launch Mode

- `VSL_ACCESS_MODE=closed`: no new signups. Existing users can sign in and public reads stay available.
- `VSL_ACCESS_MODE=invite`: signups require an invite code. This is the v5 launch mode.
- `VSL_ACCESS_MODE=open`: unrestricted signup. Not the default launch posture.

Required production env:

- `NODE_ENV=production`
- `VSL_SESSION_SECRET`: 32+ characters
- `VSL_PUBLIC_BASE_URL`: canonical `https://...` origin
- `VSL_ADMIN_EMAILS`: comma-separated operator emails
- `VSL_REQUIRE_VERIFIED_PUBLISH=true`
- `VSL_GALLERY_LOCKDOWN=false` unless responding to an incident

Rollback is config-only: set `VSL_ACCESS_MODE=closed`, deploy/restart, and verify `/api/health` reports
`"accessMode":"closed"`.

## Invite Codes

1. Sign in as an email listed in `VSL_ADMIN_EMAILS`.
2. Create invite codes from the admin invite-code panel or `POST /api/admin/invite-codes`.
3. Use `maxUses=1` for named invites. Use short expiry windows for events.
4. Revoke leaked or unused codes with `DELETE /api/admin/invite-codes/:code`.
5. Confirm redemption in the admin list: `usedCount` increments and exhausted codes stop accepting signups.

Bootstrap note: the first admin account still needs an operator-seeded invite code when production is
already in `invite` mode.

## Account Trust

- Signup sends a verification email when an email provider is configured.
- Publishing and reactions should run with `VSL_REQUIRE_VERIFIED_PUBLISH=true` in production.
- Forgot/reset is enumeration-safe: both known and unknown email requests return success.
- Reset password revokes all existing sessions for that account.
- Banned users cannot log in; existing sessions are revoked by the ban flow.

## Moderation

User reports:

1. Review `/api/admin/reports?status=open` for chip reports.
2. Hide/unhide or delete chips from the admin panel.
3. Resolve or dismiss reports to clear the queue.

Comment reports:

1. Review `/api/admin/comment-reports`.
2. Hide abusive comments with `POST /api/admin/comments/:id/hide`.
3. Hiding a reported comment resolves its open comment reports and records audit entries for both
   `hide_comment` and `report_resolved`.

User bans:

1. Ban users with `POST /api/admin/users/:id/ban`.
2. Include a short reason.
3. Verify the user no longer has an active session and cannot log in.
4. Use unban only after manual review.

Audit:

- Read `/api/admin/audit-log`.
- All hide/unhide/delete/feature/unfeature/report-resolve/ban/unban actions should have actor, target,
  detail, and timestamp.

## Gallery Lockdown

Set `VSL_GALLERY_LOCKDOWN=true` to stop public discovery during an incident.

Expected behavior:

- `/api/gallery` and `/api/gallery/featured` return empty lists.
- Gallery detail, profile, share HTML, and share poster endpoints return `410 GALLERY_LOCKED`.
- Owner-scoped local editing and publish APIs are not disabled by this switch.

Recovery: set `VSL_GALLERY_LOCKDOWN=false`, restart, and verify gallery, profile, share, and sitemap reads.

## Backups

Use the SQLite online backup flow documented in [backup-restore.md](backup-restore.md).

Minimum launch schedule:

- Before flipping `VSL_ACCESS_MODE=invite`.
- Daily while invite launch is active.
- Before migrations, bulk moderation, or manual database repair.

Restore drill:

1. Stop write traffic.
2. Copy the backup over the live DB path.
3. Restart the server.
4. Verify `/api/health`, admin login, gallery list, one share page, and one profile.

## Load Smoke

Local API-level smoke on 2026-06-17 seeded:

- 500 users
- 500 public visible chips
- 2,500 likes
- 1,000 comments

Results over 30 in-process Hono requests:

| Path | p50 | p95 | Max |
| --- | ---: | ---: | ---: |
| `/api/gallery?sort=trending` | 0.758 ms | 1.063 ms | 10.163 ms |
| `/api/gallery?sort=top` | 0.720 ms | 0.860 ms | 0.949 ms |
| `/api/gallery?sort=newest` | 0.508 ms | 0.635 ms | 0.727 ms |
| `/api/gallery/chip-0` | 0.042 ms | 0.073 ms | 0.279 ms |
| `/api/profiles/maker_0` | 0.044 ms | 0.067 ms | 0.181 ms |
| `/sitemap.xml` | 0.221 ms | 0.504 ms | 0.513 ms |

The M5 grouped-count gallery query is comfortably within launch-smoke budget at this scale.

## Launch Go/No-Go

Before production gate flip:

- `npm test` green.
- `npm run build` green. The existing Vite >500 kB chunk warning is accepted.
- `npm run typecheck --workspace server` green.
- `npm run lint` green.
- QA checklist reviewed and signed off.
- Fresh backup taken and restore path confirmed.

On go:

1. Set `VSL_ACCESS_MODE=invite`.
2. Restart/deploy.
3. Verify `/api/health` reports `"accessMode":"invite"`.
4. Mint first invite batch.
5. Smoke one real signup-with-invite path and one admin moderation action.
