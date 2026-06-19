# v7-M6 — Final QA & Release Design

> **Status:** approved design (brainstormed 2026-06-19). The closing v7 milestone. Builds on v7-M0–M5
> (M4 intentionally dropped). No open technology fork — this is a QA-and-release milestone. The next
> step after this spec is a bite-sized plan (`docs/superpowers/plans/2026-06-19-v7-m6-final-qa-release.md`).
> Mirrors the structure of the prior final-QA/release milestones (v6-M4, v5-M6).

## Goal

Sign off every v7 surface, record a 3D/video browser-QA matrix, confirm the bundle/performance budgets
hold, bump the public version line to **0.5 v7**, and hand the `v7-visual-depth` branch to
`superpowers:finishing-a-development-branch` (present merge/PR options — **not** auto-merged). No product
code unless QA surfaces a blocker.

The milestone gate: `npm test` / `npm run build` / `npm run typecheck --workspace server` / lint all
green with `three` + the recorder + `mp4-muxer` code-split out of the core and gallery-route chunks; the
3D/video QA matrix recorded with the owner's manual sign-off captured; the version line at 0.5 v7; the
branch ready for the owner's integration decision; local-first and the Konva PNG export contract intact.

## Decisions (resolved at milestone start)

- **Version line: 0.5 v7, README only.** Bump the `README.md` title `0.4 v6` → `0.5 v7` and its version
  note, mirroring exactly how v6-M4 moved the line. `package.json` stays at `1.0.0` — prior milestones
  never touched it; the README title is the source of truth for the public version line.
- **Branch finish: present options, no auto-merge.** Run `finishing-a-development-branch` to verify gates
  and present merge/PR options, but keep `v7-visual-depth` unmerged like `v4`/`v5`/`v6` unless the owner
  explicitly chooses to merge. Public launch and branch integration remain separate owner-gated decisions.
- **QA execution: split (agent-automatable + owner manual).** The agent drives the automatable cells via
  Playwright MCP and records them; **MP4 export** (WebCodecs/H.264 does not run reliably in headless
  Chromium) and the **"premium, not amateurish" M0-reference-board visual-quality sign-off** are flagged
  as **manual owner QA in a real Chrome**. The QA doc captures both, in clearly separated sections.

## Non-Goals / Out of Scope

- **No product code** beyond a QA-blocker fix (which routes back through the relevant milestone's task
  pattern and commits separately as `fix(v7):`, not bundled into doc commits).
- **No schema / migration / API / upload change** (v7 carried none; M6 introduces none).
- **No production launch / branch merge** performed automatically — `finishing-a-development-branch`
  presents options only.
- **No new 3D features.** Turntable, materials, MP4 export, gallery/share integration, and the budget are
  all already built (M0–M5); M6 only verifies and releases them.
- **Admin (`/admin`) and mobile 3D** remain out of scope (standing v7 exclusions).

## Surfaces / matrix under test (the v7 contract)

- **3D derivation fidelity** across all four die shapes — `rect`, `square`, `circle`, `hexagon` — plus a
  sample of hero-set / preset chips (neon-fantasy and matte-mono, to exercise emissive vs non-emissive).
- **Materials & lighting:** PBR/PMREM/ACES read as metal/substrate; fantasy/glow blocks glow without
  blowing out (re-confirm the M1 owner sign-off across shapes).
- **Turntable & glow:** smooth loop, no jank on the target desktop (re-confirm M2's measurement).
- **MP4 export** (owner-manual): a downloadable 1280×720 / 30fps / ~8s opaque H.264 clip that plays and
  loops seamlessly; PNG exports unchanged.
- **Gallery "View in 3D"** (`/gallery/:slug`): lazy, snapshot-derived, renders identically to the editor
  showcase; view-only (no export panel).
- **Share "View in 3D"** (`/s/:slug`): the server-rendered link resolves to the correct gallery page; OG/
  poster/crawler output unchanged.
- **Fallback:** WebGL-off (and over the 400-piece budget) hides/falls back to the static poster — no
  broken viewer.
- **2D regression:** editor authoring, autosave, all themes, hero presets, and die/poster PNG export
  (`pixelRatio:4` / `3200x1800`) unaffected.

## QA artifact: `docs/ops/3d-showcase-qa.md`

A new ops doc, structured like `docs/ops/mobile-qa.md`:
- Header: date, build short SHA, viewport/profile, method (Playwright MCP against local dev with `/api`
  proxied to `:8787`).
- A **derivation/material matrix** table: one row per die shape + sampled hero/preset, columns for
  derivation / materials+lighting / turntable, with PASS/FAIL + notes (agent-filled where automatable).
- A **gallery/share/fallback** section: "View in 3D" embed, share link target, WebGL-off fallback.
- An **owner manual sign-off** section (separated): MP4 export result (dims/duration/seam/PNG-unchanged)
  and the visual-quality "premium, not amateurish" sign-off against the M0 reference board.

## Bundle / Performance Budget Sign-off

From `npm run build` output and `dist/` inspection: confirm a separate lazy `Chip3DViewer-*` chunk
carries `three` + the recorder + `mp4-muxer`, and the core `index-*` chunk and the gallery route's
initial chunk are Three-free (consistent with M1–M5). Record the lazy chunk size. Frame timing is taken
from M2's existing measurement (worst ~9.3ms / p95 ~9.1ms over 180 frames) plus an owner spot re-check
during the manual QA — no visible jank.

## Testing Strategy

- **Regression:** the full automated suite is the regression guard (`npm test` = client then server;
  `npm run build`; `npm run typecheck --workspace server`; `npm run lint`). No new unit tests — M6 adds
  no code.
- **Browser QA:** the split matrix above. Automatable cells via Playwright MCP (accessibility snapshot +
  `scrollWidth<=clientWidth` overflow check where relevant + screenshots); WebCodecs MP4 and the visual
  sign-off are owner-manual in a real Chrome.
- **Blocker handling:** if QA finds a release blocker, fix it small and local via the relevant milestone's
  task pattern (respecting `src/domain/` purity, the PNG contract, and local-first), commit separately as
  `fix(v7):`, re-run the affected cell, then continue.

## Milestone Gate

- All gates green; `three`/recorder/`mp4-muxer` code-split out of core + gallery-route chunks; lazy chunk
  size recorded.
- `docs/ops/3d-showcase-qa.md` recorded; owner manual sign-off (MP4 + visual quality) captured.
- README at 0.5 v7; `CLAUDE.md` Milestone Status + Working Context updated; `implementation.md` V7-M6
  entry recorded.
- `finishing-a-development-branch` run; merge/PR options presented; branch left for the owner's decision.
- Local-first, Konva PNG export contract, and `src/domain/` purity unchanged.
