# v6 Mobile QA — Results

Date: 2026-06-18
Build: cfe18fe (branch `v6-mobile-responsive`)
Viewports: Android-class 360x800, iPhone-class 390x844, desktop spot-check 1280x900.
Method: Playwright device emulation against local dev (Vite client on :5173, API on :8787; `/s/*`
share viewer served directly from :8787). Seed data: existing dev DB published chip
`panther-scale-8313ef09` (owner "M2 Browser") + three local projects.

For every surface and viewport, the pass bar is: no horizontal scroll
(`documentElement.scrollWidth <= clientWidth`), no overlapping/clipped text, posters not clipped,
tap targets >= 44px, primary nav drawer opens/closes, type legible.

| Surface | Route | 360px | 390px | Notes |
|---|---|---|---|---|
| Landing | `/` | ✅ | ✅ | Hero single-column; full-width CTAs; hero preview frame below. No overflow (345/345, 375/375). |
| Gallery list | `/gallery` | ✅ | ✅ | Poster grid single-column; sort control wraps. No overflow (390/390). |
| Gallery detail | `/gallery/<slug>` | ✅ | ✅ | Poster/spec/reactions/comments stack; spec grid 1-col. No overflow (360/360, 375/375). Comment form nit found + fixed (see below). |
| Public profile | `/u/<handle>` | ✅ | ✅ | No handle seeded → "Profile not found" state renders cleanly, no overflow (390/390). Populated grid reuses the identical `gallery-grid`/`gallery-card` classes verified on Gallery list. |
| Share viewer | `/s/<slug>` | ✅ | ✅ | Server-rendered; `.grid` collapses to single column via the M1 `@media (max-width:767px)`; poster scales to width. No overflow (375/375). |
| Login/account | `/account` | ✅ | ✅ | Single column (Tailwind); tightened mobile gutters. No overflow (375/375). |
| Dashboard | `/dashboard` | ✅ | ✅ | Preset + project grids single-column; New/Random actions reachable. No overflow (375/375). |
| Editor preview | `/editor/<id>` | ✅ | ✅ | Mobile read-only branch: chip artwork canvas fit-to-width (canvasW 326@360 / 356@390), fake spec, Publish + Export panels, "Edit on desktop" CTA. No overflow (360/360, 375/375). |

## Drawer nav (390px, on `/`)
- Hamburger opens drawer: `data-open=true`, nav visible, toggle → "Close menu", `aria-expanded=true`. ✅
- Link tap (Gallery) navigates to `/gallery` and closes drawer (`data-open=false`). ✅
- Reopen + Escape closes (`data-open=false`). ✅
- Reopen + backdrop tap closes (`data-open=false`). ✅
- Resize to 1280px: drawer auto-closes, hamburger hidden (`display:none`), horizontal nav restored (`display:flex`), no overflow. ✅

## Desktop regression spot-check (1280x900)
- `/editor/<id>` renders the full authoring shell (`[aria-label="Chip editor workspace"]`), not the
  mobile preview. ✅ Header shows the horizontal nav; no overflow. The v6 media queries only apply
  below 768px, so desktop layout is unchanged.

## Console errors observed (not blockers)
- Editor preview route: two `404` on `GET /api/published-chips/source/<id>` — this is `PublishPanel`'s
  expected lookup for an unpublished project; it then renders "Not published yet." Normal reused
  behavior, not a v6 regression.

## Nit found and fixed during QA
- **Gallery detail comment form** (`/gallery/<slug>`): the `<textarea>` rendered at its browser-default
  ~186px width inside a `display:block` form, looking cramped on mobile (the M1 `flex-direction:column`
  rule was inert on a block element). Fixed by `fix(v6): full-width comment form on mobile gallery
  detail` — `textarea { width:100%; min-height:5rem }` + full-width submit button inside the existing
  `@media (max-width:767px)` block. Re-verified: textarea 360px, button 360px, no overflow.

## Visual gate sign-off
Mobile layouts read as intentional and premium, consistent with the v2 page themes: dark panels,
cyan accents, uppercase display type. Single-column flows on every surface, no overlapping text, no
clipped posters, full-width primary actions, the chip artwork preview renders correctly fit-to-width
on the editor route, and the drawer nav behaves correctly (open/link/Escape/backdrop/resize). No
horizontal scrolling at 360px or 390px on any surface. **No release blockers.** Admin (`/admin`)
remains intentionally out of scope (desktop-only operator tool).
