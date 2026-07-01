# Virtual Silicon Lab 0.9 v11

[![한국어](https://img.shields.io/badge/README-한국어-0A66C2?style=for-the-badge)](README.kr.md)

A local-first creative web app for designing fictional semiconductor dies and exporting
high-resolution chip PNGs and press-release-style posters. It is **not** an EDA tool and has
nothing to do with real manufacturing. v3·v4 added a publish / share / reactions (likes·comments) /
contests / remix community layer on top of the editor's local-first model; v5 added invite access,
account security, safety/moderation, onboarding, discovery, and ops hardening in preparation for a
real public launch; v6 made the public read surfaces, account/dashboard, and a read-only editor
preview responsive (mobile); v7 added a **Visual Depth** layer that shows finished chips as a derived
3D showcase (turntable orbit + in-browser MP4 export); **v8 added server-only AI-Assisted Creation**
(prompt → chip, naming/spec copy, layout suggestions, variations); **v9 "Deep Canvas" pushed the 2D
authoring surface past rectangles with parametric die shapes, shared 2D/3D material finishes, and
subtle in-editor ambient motion**; **v10 3D Authoring** turns the derived 3D showcase into a
persisted presentation surface with camera, lighting, environment, animation, and full-scene look
presets; and **v11 Mobile 3D Authoring** brings mobile look presets, lighting chips, and touch
camera save/reset to the phone-width editor without enabling mobile 2D canvas authoring.

> Version line: the `0.9` line of this repo corresponds to v11 (Mobile 3D Authoring); `0.8` was v10
> (3D Authoring), `0.7` was v9 (Deep Canvas), `0.6` was v8 (AI-Assisted Creation), `0.5` was v7
> (Visual Depth), `0.4` was v6 (mobile/responsive), and `0.3` was v5 (public-launch prep). The 2D
> Konva authoring + PNG export contract is unchanged across all of them; v11's mobile authoring
> writes the same additive client-side `scene3d` project JSON that rides along in publish snapshots.
> The public-launch gate is still **not** live —
> flipping it to production is a separate ops decision (see "Launch Status").

## Release Overview

- **v1 MVP** — local-first editor, four die shapes, presets/remix, fake spec sheet + dual PNG export,
  landing page.
- **v2 Visual Major** — full redesign of the page shell, editor surface, chip material renderer, and
  poster output toward premium semiconductor press-release imagery. The SoC Custom Studio also landed
  in this stream.
- **v3 Share Core** — Node + TypeScript + SQLite backend (`server/` workspace): accounts, publish
  snapshot uploads, public gallery, share links, and gallery → my-projects remix import. Editing
  stays 100% local-first; the server only receives explicit publish snapshots/PNGs.
- **v4 Community** — moderation + access gate, reactions (likes·comments·report), ranking/trending,
  contests, and remix lineage.
- **v5 Public Launch (ready, not live)** — invite-code access, account security (email verification,
  password reset), safety/moderation hardening (bans, comment hide, audit log, admin ops UI),
  onboarding/first-run, discovery/SEO/public profiles, and ops hardening (rate-limit, gallery
  lockdown, SQLite backup).
- **v6 Mobile/Responsive** — a 768px breakpoint + mobile nav drawer reflow the public read surfaces
  (landing·gallery·detail·profile·share viewer) and account/dashboard into a single mobile column;
  the editor branches to a read-only preview on mobile (authoring stays desktop). Admin (`/admin`)
  stays desktop-only and out of scope. 360/390px mobile QA passed (`docs/ops/mobile-qa.md`).
- **v7 Visual Depth** — the editor and public gallery share a lazy full-screen Three.js 3D showcase
  derived from the serialized project snapshot: PBR/PMREM/ACES/bloom materials, turntable/glow
  animation, an editor-only deterministic 1280×720 MP4 export, and an admission budget that falls
  back to the poster when WebGL is absent or the chip exceeds 400 pieces. The server-rendered share
  viewer links to gallery 3D without client JS. Three·recorder·`mp4-muxer` stay in lazy chunks with
  no schema/migration/API/upload change. 3D showcase QA: `docs/ops/3d-showcase-qa.md`.
- **v8 AI-Assisted Creation (server-only)** — a server foundation plus four editor/dashboard AI
  features: prompt → fresh local chip, "Generate from this chip" naming + fake-spec copy, per-item
  layout suggestions, and independent local variations. The `ANTHROPIC_API_KEY` is server-only and
  never reaches the client bundle; a deterministic fake provider is the default so the whole surface
  runs offline. No `Project` schema, publish, or export change; local-first stays intact.
- **v9 Deep Canvas** — parametric die shapes (octagon, rounded/chamfered-rect, keyed, L-shape, plus)
  with slider parameters, a named chip-level **finish** (matte/satin/gloss/metallic) plus per-block
  finish override shared by the 2D renderer and the 3D showcase, and editor-only ambient motion. A
  single pure die-outline derivation feeds clamp, 2D render, 3D extrusion, and export, so all ten
  shapes stay consistent and the PNG raster contract is unchanged. No server route or SQLite
  migration.
- **v10 3D Authoring** — the view-only 3D showcase is now an editor authoring surface. Authors can
  persist a normalized hero camera, lighting preset + intensity, environment/post overrides,
  deterministic turntable/glow animation settings, and one-click full-scene look presets. The same
  pure `resolveScene3D` descriptor feeds editor, gallery, share deep links, and MP4 capture, while the
  2D die/poster PNG contracts remain unchanged. Final QA: `docs/ops/v10-3d-authoring-qa.md`.
- **v11 Mobile 3D Authoring** — the mobile editor route now uses the same local editor store and
  persistence path for a curated 3D subset: mobile look presets, lighting chips, touch orbit camera
  save/reset, compact accessible control rails, and the existing unavailable fallback. 2D Konva
  authoring remains desktop-only; no backend route, SQLite migration, or schema change was added.
  Final QA: `docs/ops/v11-mobile-3d-authoring-qa.md`.

## Key Features

### Editor (local-first)

- Start instantly with no login; projects persist to IndexedDB (localStorage fallback).
- React + Konva editor: **ten die shapes** — four primitives (rect/square/circle/hexagon) plus six
  parametric shapes (octagon, rounded-rect, chamfered-rect, keyed, L-shape, plus) with normalized
  slider parameters — grid/snap/zoom/pan, resize/rotate/reorder, undo/redo, 16 real·fantasy block
  types, decorations, and page themes.
- Three page themes: `laboratory`, `anime`, `space`.
- 16 remixable presets (10 v2 hero chips/posters + 6 base presets).
- Deterministic random chip generator that runs with no AI.
- Editable fake spec sheet + three poster formats (`press-hero`, `architecture-slide`,
  `product-closeup`).
- Two PNG exports rendered on dedicated offscreen Konva stages:
  - die-only: `pixelRatio: 4`
  - poster: logical `1600x900` × `pixelRatio: 2` → final `3200x1800`

### Deep Canvas authoring (v9)

- **Parametric die shapes** — six code-generated shapes beyond the four primitives. Geometry is
  always generated by a pure `resolveDieOutline`, never hand-drawn, so outlines stay simple
  (non-self-intersecting). Customization is slider parameters only (corner radius, chamfer, notch
  corner/size, arm width), each normalized and clamped to a safe range.
- **One outline, four consumers** — clamp, 2D render, 3D extrusion, and export all take their shape
  knowledge from the same `resolveDieOutline` + `outlineToPolygon`. Block clamp is generalized to a
  four-corners-inside-polygon rule that handles concave shapes (L, plus, notched) naturally; changing
  shape or parameters live re-clamps existing blocks as one undoable commit.
- **Material finishes** — a named chip-level finish (matte/satin/gloss/metallic) resolves to one
  shared descriptor that drives both the 2D Konva fills/shadows/glow (export-safe) and the 3D PBR
  materials. The default finish is theme-derived; an optional **per-block finish override** inherits
  the chip finish when unset.
- **Ambient in-editor motion** — a restrained glow pulse and trace shimmer driven by a single
  `requestAnimationFrame` over pure time functions. It is editor-canvas only, has an editor toggle,
  respects `prefers-reduced-motion` (default off under reduced motion), and degrades by density to
  protect ~60fps. **Export is always static:** the export stages render the canonical neutral frame,
  so no animated transient ever reaches a PNG.

### 3D Authoring (v10)

- The v10 authoring surface covers camera, lighting, environment, animation, and full-scene look presets.
- **Persisted 3D presentation** — each project can carry optional `scene3d` settings for camera,
  lighting, environment, and animation. The resolver is pure domain code, so the same authored scene
  works in the editor, gallery, share target, and MP4 export without server routes or SQLite changes.
- **Camera / lighting / environment / animation controls** — the editor showcase can save/reset the
  current camera, choose safe lighting moods plus intensity, apply curated background/exposure/bloom
  settings, and tune deterministic turntable/glow motion. Gallery and share views remain viewer-only.
- **Look presets** — `Orbit hero`, `Inspection`, and `Dramatic closeup` apply camera, lighting,
  environment, animation, and full-scene look presets through undoable editor commands while preserving
  authored animation when appropriate.
- **Export parity** — MP4 uses the same resolved scene descriptor as the live showcase; 2D exports stay
  fixed at die-only `pixelRatio: 4` and poster `3200x1800`.

### Mobile 3D Authoring (v11)

- v11 ships mobile look presets, lighting chips, and touch camera save/reset.
- **Store-backed mobile 3D surface** — phone-width editor routes keep the 2D canvas read-only, but the
  3D showcase now uses the same editor store, undoable commands, and autosave path as desktop.
- **Curated mobile controls** — mobile exposes one-tap look presets, lighting chips, touch orbit,
  `Save current view`, and `Reset 3D default`; precision lighting, environment, and animation sliders
  remain desktop-only.
- **Responsive control rail** — the mobile showcase uses compact horizontally scrollable preset rails
  with accessible group labels and 44px tap targets while the desktop control rail remains unchanged.
- **Round-trip parity** — mobile-authored `scene3d` flows through gallery, share, and MP4 via the same
  resolved scene descriptor as desktop. Export contracts stay fixed at die-only `pixelRatio: 4`,
  poster `3200x1800`, and MP4 `1280x720` / `30fps` / `8s`.

### AI-Assisted Creation (v8 server)

- **Prompt → chip** — type a prompt on the dashboard to generate a fresh, independent local project
  that opens in the editor.
- **Generate from this chip** — zero-input AI naming + fake-spec copy from the current chip,
  previewed before a single undoable Apply.
- **Layout suggestions** — per-item "Suggest improvements" with Accept/Reject; Accept is one undoable
  commit.
- **Variations** — generate 2–4 re-themed variations; per-card Save creates a fresh independent local
  project and never mutates the source.
- Every AI invariant flows through the same pure `mapAiDraftToProject` mapping, so adversarial AI
  output can never produce an invalid project. A deterministic fake provider is the default; the real
  Anthropic provider is selected only when configured. Requests are bounded (2000-char prompt, 64
  blocks) and quota-limited (per-user 24h quota + production per-IP burst limit). The
  `ANTHROPIC_API_KEY` is server-only and absent from the client bundle.

### Sharing & Community (v3·v4 server)

- Accounts (signup/login, argon2id + signed session cookie) and explicit publish snapshot uploads.
- Public gallery (`/gallery`) and share links (`/s/:slug`, OG/Twitter meta + a crawler `poster.png`).
- "Remix into my projects" from gallery detail — creates an independently editable local copy.
- Reactions: one like per user per chip + a flat comment thread + a report button.
- Ranking/trending sort: `trending` (last 7 days) · `top` (all-time) · `newest`.
- Contests: submission → voting → results phases, self-vote blocking, results podium.
- Remix lineage: ancestor spine + direct children, a "Remixed from" link in the share viewer.

### Public-Launch Readiness (v5 server + admin UI)

- **Invite-code access** — `VSL_ACCESS_MODE` with three modes: `closed`/`invite`/`open`. In `invite`
  mode signup requires an invite code; login, gallery, and share reads are unaffected.
- **Account security** — email verification, forgot/reset password (enumeration-safe), and other-
  session revocation on password change/reset. Unverified accounts can be soft-gated out of
  publish/reactions (configurable).
- **Safety / moderation** — user ban/unban, comment hide·report queue, and an append-only audit log.
- **Admin ops UI (`/admin`)** — exposed to accounts listed in `VSL_ADMIN_EMAILS`. Invite-code
  issue/list/revoke, the reported-chip queue, the comment-report queue (hide·ban author), chip
  hide/unhide·feature/unfeature·delete, user ban/unban, and audit-log review are all handled in the UI.
- **Onboarding / first-run** — a local first-run checklist and a Featured gallery row.
- **Discovery / SEO** — public handle profiles at `/u/:handle` (public·visible chips only), plus a
  `robots.txt`·`sitemap.xml` covering only public share/profile URLs.
- **Ops hardening** — mutating `/api/*` rate limits (with stricter login/signup/forgot/report
  sensitive endpoints), an emergency gallery-wide lockdown (`VSL_GALLERY_LOCKDOWN`, public reads →
  410), and an online SQLite backup script (`server/scripts/backup.ts`).

## Getting Started

```bash
npm install
npm run dev -- --host 127.0.0.1   # open the printed URL in desktop Chrome
npm run dev:server                # v3/v4/v5/v8 API server (http://127.0.0.1:8787)
npm test                          # client + server unit tests (vitest)
npm run test:client               # client tests only
npm run test:server               # server tests only
npm run build                     # build the static bundle into dist/
npm run verify:deploy             # pre-deploy build + server typecheck + full tests
```

To exercise the admin UI locally, set `VSL_ADMIN_EMAILS` to your admin email and sign up / log in with
it. Invite mode runs with `VSL_ACCESS_MODE=invite`.

```bash
VSL_ADMIN_EMAILS="admin@example.com" VSL_ACCESS_MODE="invite" npm run dev:server
```

The AI surface runs against a deterministic fake provider by default (no key required). To exercise
the real provider, set `VSL_AI_PROVIDER=anthropic` and a server-only `ANTHROPIC_API_KEY`.

Konva and the editor runtime bundle into one chunk that exceeds Vite's 500kB warning threshold. This
is intentional for now and is a candidate for later code-splitting.

## Launch Status

v5 is **launch-ready, not live**. The automated gates (`npm test`, `npm run build`, server typecheck,
lint) are all green, and the admin ops UI plus the invite → verify → publish → moderate → ban →
profile/SEO → reset flow are covered by unit/integration tests and browser QA. v8 (AI), v9 (Deep
Canvas), v10 (3D Authoring), and v11 (Mobile 3D Authoring) do not change the launch gate: AI is
server-only behind an explicit provider/key, while v9/v10/v11 are client-side authoring with no new
server route or SQLite migration.
Flipping the real production switch (`VSL_ACCESS_MODE=invite`) is left as an ops action after the
deploy environment is set up and the owner signs off. Ops docs live under `docs/ops/` (runbook,
backup/restore, QA checklist, and v11 mobile 3D authoring release QA).

> Email caveat: the server currently uses only a console-output `ConsoleEmailProvider`. Email
> verification and password-reset links are **printed to the server log only** and are not actually
> sent. A real public launch needs a real email provider (SMTP/SES/Postmark, etc.). The current state
> is sufficient for local console testing and browser QA.

## v3·v4·v5·v8 Server Deploy Notes

The server is a Hono + SQLite shared layer. Editor project storage is still authoritative in the
browser's local storage; the server only receives snapshots/PNGs the user explicitly publishes. SQLite
writes directly to a local file, so it needs a host with a **persistent disk** (not pure serverless).

Required ops env:

- `NODE_ENV=production`
- `VSL_SESSION_SECRET`: a random string of 32+ chars. Missing/short fails production startup.
- `VSL_PUBLIC_BASE_URL`: the public server origin, e.g. `https://chips.example.com`. Used for absolute
  share/gallery image URLs.

Access / safety env:

- `VSL_ACCESS_MODE`: `closed` | `invite` | `open`. **Default `closed`**; `invite` is the v5 launch
  mode. (The legacy `VSL_SIGNUPS_OPEN` is still read as a fallback: `true`→`open`, otherwise
  →`closed`. New setups should use `VSL_ACCESS_MODE`.)
- `VSL_ADMIN_EMAILS`: comma-separated admin email list. Accounts logging in with these emails get
  `/admin` ops powers (invite codes·comment/chip moderation·bans·audit log). e.g. `a@x.com,b@y.com`
- `VSL_REQUIRE_VERIFIED_PUBLISH`: whether to block publish/reactions before email verification
  (`true`/`false`). **Production default `true`**, development default `false`.
- `VSL_GALLERY_LOCKDOWN`: an emergency switch that locks the gallery/Featured/detail/profile/share/
  poster at once (`true` → public reads return 410). Default `false`.

AI env (v8, server-only):

- `VSL_AI_PROVIDER`: `fake` | `anthropic`. **Default `fake`** (deterministic, offline). `anthropic` is
  used only when `ANTHROPIC_API_KEY` is also set.
- `ANTHROPIC_API_KEY`: server-only Anthropic key. Never bundled into the client; absent from
  `dist/assets`.
- `VSL_AI_MODEL`: model id for the real provider. Default `claude-opus-4-8`.
- `VSL_AI_DAILY_QUOTA`: per-user 24h generation quota. Default `20`. (Production also applies a per-IP
  burst limit per AI endpoint.)

Optional ops env:

- `PORT`: default `8787`
- `VSL_DATA_DIR`: SQLite DB location. Default `server/data` (DB file: `server/data/vsl.sqlite`)
- `VSL_UPLOAD_DIR`: publish PNG file storage. Default `${VSL_DATA_DIR}/uploads`
- `VSL_UPLOAD_MAX_BYTES`: decoded-byte cap for each die/poster PNG. Default 8 MiB
- `VSL_RATE_LIMIT_WINDOW_MS`, `VSL_RATE_LIMIT_MAX`: mutating `/api/*` rate limit. Default 60s/120
  (login·signup·forgot·report endpoints are automatically stricter in production)

Local production smoke:

```bash
npm run verify:deploy
NODE_ENV=production \
VSL_SESSION_SECRET="replace-with-at-least-32-random-chars" \
VSL_PUBLIC_BASE_URL="http://127.0.0.1:8787" \
VSL_ACCESS_MODE="invite" \
VSL_ADMIN_EMAILS="admin@example.com" \
npm run start:server
```

New publish PNGs are stored as files under `VSL_UPLOAD_DIR` rather than in SQLite, and the DB keeps
only the `/uploads/...` path. Legacy data-URL rows keep serving via dual-read.

Backup (live/WAL-safe, online backup):

```bash
npx tsx server/scripts/backup.ts server/data/vsl.sqlite backups
sqlite3 backups/<file>.bak "PRAGMA integrity_check;"   # expected: ok
```

`backups/` is git-ignored. For restore/ops procedures see `docs/ops/backup-restore.md` and
`docs/ops/launch-runbook.md`.
