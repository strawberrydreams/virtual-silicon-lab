# v12 Continuum Sync QA Release Pack

Version line: **0.10 v12**. Continuum Sync adds opt-in, sign-in-only multi-device sync over the
existing local-first model. This pack is the manual QA gate run before tagging the release.

## Preconditions

- Run the API server and the dev server with the same public base so `/api/sync/*` is reachable:
  `VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173`.
- Two independent browser storage contexts signed into the SAME account (for example, a normal window
  and a private window), plus one anonymous context.

## Manual QA checklist

- **Anonymous stays local** — signed out, create/edit/delete projects; confirm NO `/api/sync/*`
  requests fire and everything works as before.
- **First-login adoption** — with anonymous local projects present, sign in; confirm the first
  `GET /api/sync/projects?since=0` is followed by `PUT`s that upload each pre-existing local project.
- **Multi-device round-trip** — create/edit a project on device A; on device B (same account), after
  a sync pass (interval or tab refocus) the change appears. Delete on A; it disappears on B.
- **Sync status** — the header badge shows `Syncing...` -> `Synced` on a normal pass; `Offline` when
  the server is unreachable; back to `Synced` when reachable again.
- **Offline** — with DevTools offline, local edits still save with no error; going online + refocus
  reconciles.
- **Publish unchanged** — publish a chip, open it in the gallery and via the share link; confirm the
  publish/gallery/share behavior is identical to v11.
- **Export parity** — the 2D die/poster PNG (`x4`, `3200x1800`) and MP4 (`1280x720` / `8s`) exports
  are unchanged; sync does not touch the export paths.

## Regression gates

- `npm test` — client + server suites green.
- `npm run build` — green (only the known >500 kB chunk warning).
- `npm run typecheck:server` — green.
- `rg "three" dist/assets/index-*.js` — no output (Three stays out of the core bundle; unchanged by
  v12).
