# v6 Mobile / Responsive — Design

Status: design (approved decisions captured below; awaiting written-spec review)
Date: 2026-06-17
Branch: `v6-mobile-responsive`
Version line: 0.4 (v6)

## Summary

v5 made Virtual Silicon Lab public-launch-ready. Its public surfaces (gallery, share, profile,
landing) are reachable by anyone with a link, but the app is hard-floored to desktop
(`body { min-width: 1024px }` in `src/styles.css`). v6 makes the **read and account surfaces usable
on phones** so that real users arriving from a shared link or profile have a working experience. The
Konva editor remains a desktop tool; on mobile, the editor route shows a **read-only chip preview with
share/export and an "edit on desktop" call-to-action** instead of an unusable canvas.

This is a frontend + server-rendered-share-CSS effort. **No database schema change, no migration, no
new API.** "Visual quality IS the product" still applies: mobile layouts must look intentional, not
like a squeezed desktop page.

## Goals

- Public read surfaces render cleanly on phones: landing (`/`), gallery list (`/gallery`), gallery
  detail (`/gallery/:slug`), share viewer (`/s/:slug`, server-rendered), public profile (`/u/:handle`).
- Account surfaces render cleanly on phones: login/account (`/account`), project dashboard
  (`/dashboard`), onboarding/first-run.
- The editor route (`/editor/:id`) on mobile shows a read-only preview of the chip (reusing the shared
  artwork render) plus fake spec, die/poster export, share link, and an "edit on desktop" CTA.
- A working primary navigation on mobile (collapsible drawer).
- No horizontal scrolling; tap targets ≥ 44px; legible type on small screens.

## Non-Goals (explicitly out of scope for v6)

- **Mobile editing** of chips (touch drag/resize/transform on the Konva canvas). The editor stays
  desktop-only for authoring.
- **Admin page (`/admin`) responsiveness.** It is an operator tool with dense tables/actions; it stays
  desktop-only. (May be revisited later.)
- **PWA / installability / offline read cache** and native share-sheet integration. Natural future
  add given the local-first base, but deferred out of v6 to keep scope tight.
- **Tablet-specific layouts.** Tablets (≥ 768px) use the existing desktop layout.
- Any backend/schema/API change beyond responsive CSS for the server-rendered share template.

## Decisions (locked during brainstorming)

- **Theme:** mobile / responsive (v6 = 0.4 line).
- **Scope:** public read surfaces + account/login + project dashboard + onboarding. Editor not editable
  on mobile.
- **Editor fallback on mobile:** read-only preview + CTA + share/export.
- **Admin on mobile:** desktop-only (out of scope).
- **Tablet:** treated as desktop (two-tier breakpoint).

## Approach

Chosen: **responsive reflow of the existing single component tree** (not a separate mobile route tree,
not PWA). Rationale: the app already uses one component tree with hand-written CSS in `src/styles.css`
plus some Tailwind utilities; a single responsive tree avoids duplication and keeps one source of
truth. Rejected alternatives: a dedicated mobile component/route tree (doubles maintenance) and a
PWA-inclusive scope (scope creep; deferred).

### Breakpoint strategy

- Remove the `body { min-width: 1024px }` floor that currently forces a desktop viewport.
- Two tiers: **mobile `< 768px`** (single-column, stacked) and **desktop `≥ 768px`** (existing layout
  unchanged). Tablets fall into the desktop tier.
- Implement primarily via media queries in `src/styles.css` against existing class names, plus targeted
  component changes where structure (not just style) must change (navigation drawer, editor mobile
  branch). Tailwind responsive prefixes may be used where a component is already Tailwind-based
  (e.g. `AccountPage`).
- A single shared breakpoint constant/util so JS-side checks (editor mobile branch, nav drawer) and CSS
  agree on 768px.

### Mobile detection (for structural branches)

- A small pure hook `useIsMobile()` (or `useViewport`) backed by `matchMedia('(max-width: 767px)')`,
  returning a boolean and updating on resize/orientation change. Pure logic is unit-tested
  (matchMedia mocked); it is the only JS gate for the editor read-only branch and the nav drawer's
  default state.

## Component / Surface Design

### Navigation (`App.tsx` header)

- Desktop (`≥ 768px`): unchanged horizontal nav + theme switcher.
- Mobile (`< 768px`): brand stays left; nav collapses behind a hamburger button that opens a drawer/
  sheet containing the same links (Lab / Projects / Gallery / Contests / Account / Admin-if-admin) and
  the theme switcher. Drawer open/close is a small pure disclosure state (unit-tested); closes on
  navigation and on backdrop tap. Focus is trapped while open; Escape closes.

### Public read surfaces

- **Landing (`/`):** hero/sections stack to one column; CTAs full-width-ish; no fixed desktop widths.
- **Gallery list (`/gallery`):** poster grid collapses to a single column (or 1-wide cards); the
  Trending/Top/Newest segmented control wraps/stays tappable; Featured row scrolls horizontally or
  stacks.
- **Gallery detail (`/gallery/:slug`):** poster, fake spec, reactions (like/report), and the comment
  thread stack vertically; lineage spine/child grid reflow to one column. Any live Konva render here
  fits to viewport width.
- **Public profile (`/u/:handle`):** profile header + chip cards to a single column.
- **Share viewer (`/s/:slug`):** server-rendered HTML in `server/src/share/`. Add responsive CSS to the
  share template so the crawler-and-human page reads well on phones (poster scales to width, meta/CTA
  stack). OG/`poster.png` unchanged.

### Account surfaces

- **Login / account (`/account`):** forms to single column, full-width inputs, comfortable spacing
  (already partly Tailwind). Verify/reset/forgot states reflow.
- **Project dashboard (`/dashboard`):** project + preset cards stack to one column; "new/random"
  actions remain reachable. Tapping a project on mobile routes to the editor's read-only preview.
- **Onboarding / first-run:** the first-run checklist/coachmarks reflow or present as a mobile-friendly
  sheet; nothing depends on desktop-only positioning.

### Editor route on mobile (`/editor/:id`)

- When `useIsMobile()` is true, `EditorPage` renders a **read-only preview branch** instead of the
  authoring shell:
  - The chip artwork rendered read-only via the existing shared `ChipArtwork` render on a Konva stage
    fit to viewport width (reusing the export/render path; no editor chrome, no transformer, no
    toolbars).
  - The fake spec shown below the preview.
  - Actions: copy share link (if published), export die/poster PNG (existing export stages), and a
    prominent "Edit on desktop" CTA.
  - Local-first preserved: this reads the same local project JSON; it never mutates it.
- Desktop branch unchanged.

## Data Flow & Boundaries

- No change to `src/domain/`, storage, stores' editing commands, or the server API/DB.
- The mobile editor preview reuses the existing serializable project data + shared artwork render; it
  must not scrape DOM and must not introduce a second source of truth.
- The only server change is responsive CSS inside the existing share HTML template.

## Testing Strategy

- **Pure logic, unit-tested:** `useIsMobile()` (matchMedia mocked), nav drawer disclosure state, any
  breakpoint util. Per project convention, Konva rendering is not unit-tested.
- **Component tests:** nav renders hamburger + drawer below breakpoint and horizontal nav above
  (matchMedia mocked); editor route renders the read-only preview branch on mobile and the authoring
  shell on desktop (mock the mobile hook).
- **Browser QA matrix (Playwright device emulation, narrow viewport):** landing, gallery list/detail,
  profile, share, login/account, dashboard, onboarding, and the editor read-only preview — each checked
  for no horizontal scroll, tappable targets, readable type, and working drawer nav. iOS-Safari- and
  Android-Chrome-width viewports.
- **Visual gate:** mobile layouts read as intentional and premium (consistent with v2 page themes), no
  overlapping text, no clipped posters. This replaces the v5 checklist's "mobile not assessed" note.
- All existing gates stay green: `npm test`, `npm run build`, server typecheck, lint.

## Milestones

- **V6-M0 Responsive Foundation** — remove the `min-width: 1024px` floor; establish the 768px two-tier
  breakpoint (CSS + shared constant); add `useIsMobile()`; convert the header nav to a mobile drawer.
  Acceptance: app no longer forces desktop width; nav works on a phone viewport; gates green.
- **V6-M1 Public Read Surfaces** — landing, gallery list, gallery detail, public profile, and the
  server-rendered share viewer reflow cleanly on mobile.
- **V6-M2 Account & Dashboard** — login/account, project dashboard, and onboarding/first-run reflow on
  mobile.
- **V6-M3 Editor Read-Only Mobile Preview** — `/editor/:id` renders the read-only artwork preview +
  spec + share/export + "edit on desktop" CTA on mobile; desktop authoring unchanged.
- **V6-M4 Mobile QA & Release** — full mobile browser QA matrix, visual gate sign-off, update the launch
  QA checklist's mobile line, final gates, release pack.

## Risks / Open Questions

- **Konva fit-to-viewport on mobile:** stage sizing must derive from viewport width without breaking
  the export stages' fixed raster contract (die `pixelRatio:4`, poster `3200x1800`). The preview stage
  is display-only and separate from export stages, so the export contract is untouched — but this needs
  care in M3.
- **Hand-written CSS volume:** `src/styles.css` is large; reflow touches many class blocks. Mitigate by
  scoping media queries near each block and QA-ing surface by surface per milestone.
- **Share template CSS:** the server share HTML is minimal; adding responsive CSS must not regress
  crawler/OG behavior.
