# V6-M4 Mobile QA & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the full mobile browser QA matrix (Playwright device emulation) across every v6 surface, sign off the visual gate, update the launch QA checklist's mobile line, bump the version line to 0.4 (v6), and confirm all gates green for release.

**Architecture:** QA-and-docs milestone — no product code unless QA finds a blocker (fixes go back through the relevant M1–M3 task pattern). New `docs/ops/mobile-qa.md` records the matrix; `docs/ops/launch-qa-checklist.md` line ~115 flips from "mobile not assessed" to assessed; `README.md` version line moves to 0.4; `CLAUDE.md` Milestone Status gains the v6 block.

**Tech Stack:** Vite preview/dev server · Playwright MCP (device-emulation, narrow viewports) · Markdown docs.

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- **No database schema change, no migration, no new API.** Any QA-blocker code fix must respect `src/domain/` purity, the export raster contract, and local-first.
- Breakpoint is **768px**. QA widths: **iPhone-class ~390px** and **Android-class ~360px** (both well below 768) plus one **≥768px** spot-check to confirm desktop is unchanged.
- "Visual quality IS the product": mobile layouts must read as intentional and premium (consistent with v2 page themes) — no horizontal scroll, no overlapping text, no clipped posters, tap targets ≥ 44px, legible type.
- One concern per commit.

## Surfaces under test (the v6 mobile contract)

Landing `/` · Gallery list `/gallery` · Gallery detail `/gallery/:slug` · Public profile `/u/:handle` · Share viewer `/s/:slug` (server-rendered) · Login/account `/account` (+ forgot/reset/verify states) · Dashboard `/dashboard` · Editor read-only preview `/editor/:id`. (Admin `/admin` is explicitly **out of scope** — desktop-only operator tool.)

---

### Task 1: Bring up the app for mobile QA

**Files:** none (environment setup folded into Task 2's deliverable).

- [ ] **Step 1: Confirm gates are green before QA**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green (client + server suites pass; build exits 0 with known chunk warning; typecheck/lint exit 0). If anything fails, stop and fix before QA.

- [ ] **Step 2: Start the API server and the client**

Run (two background processes):
- `npm run dev:server` → API on `http://127.0.0.1:8787`
- `npm run dev -- --host 127.0.0.1` → client (note the printed port, typically 5173)

Expected: `/api/health` reachable; client loads in a desktop browser.

- [ ] **Step 3: Seed at least one published chip for the read surfaces**

Using the running app (desktop browser), ensure there is ≥1 published chip so `/gallery`, `/gallery/:slug`, `/u/:handle`, and `/s/:slug` have content. If none exists: sign in, open a hero/preset project, publish it (PublishPanel), and note its slug + the owner handle. Record the slug/handle for Task 2's navigations. No commit (runtime seed only).

---

### Task 2: Run the mobile QA matrix and record results

**Files:**
- Create: `docs/ops/mobile-qa.md`

**Interfaces:** none (documentation deliverable).

- [ ] **Step 1: Create the QA results doc skeleton**

Create `docs/ops/mobile-qa.md`:

```markdown
# v6 Mobile QA — Results

Date: 2026-06-...
Build: <git short SHA>
Viewports: Android-class 360x800, iPhone-class 390x844, desktop spot-check 1280x900.
Method: Playwright device emulation against local dev (`/api` proxied to :8787).

For every surface and viewport, the pass bar is: no horizontal scroll, no overlapping/clipped
text, posters not clipped, tap targets >= 44px, primary nav drawer opens/closes, type legible.

| Surface | Route | 360px | 390px | Notes |
|---|---|---|---|---|
| Landing | `/` | | | |
| Gallery list | `/gallery` | | | |
| Gallery detail | `/gallery/<slug>` | | | |
| Public profile | `/u/<handle>` | | | |
| Share viewer | `/s/<slug>` | | | |
| Login/account | `/account` | | | |
| Dashboard | `/dashboard` | | | |
| Editor preview | `/editor/<id>` | | | |

## Drawer nav
- Opens from hamburger, closes on link tap, closes on backdrop tap, closes on Escape, closes on resize to desktop: <result>

## Visual gate sign-off
<intentional/premium assessment; any nits + whether they block release>
```

- [ ] **Step 2: For each surface, drive Playwright at 360px and 390px**

For each route in the table, use the Playwright MCP tools:
1. `browser_resize` to `360x800`, `browser_navigate` to the route.
2. `browser_snapshot` and check the accessibility tree for the surface's key content.
3. Detect horizontal overflow with `browser_evaluate`:

```js
() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth })
```

Pass when `scrollW <= clientW` (no horizontal scroll). 4. `browser_take_screenshot` for the visual record. 5. Repeat at `390x844`.

Record PASS/FAIL + any note per cell in `docs/ops/mobile-qa.md`.

- [ ] **Step 3: Exercise the drawer nav on a mobile viewport**

At `360x800` on `/`: click the hamburger ("Open menu"), confirm the drawer opens (`browser_snapshot`), click a link (e.g. Gallery) and confirm it navigates and the drawer closes, reopen and click the backdrop to confirm close, reopen and press `Escape` to confirm close, then `browser_resize` to `1280x900` and confirm the horizontal nav is shown (drawer auto-closed). Record under "Drawer nav".

- [ ] **Step 4: Editor preview spot-check**

At `360x800`, navigate to `/editor/<id>` for the seeded project. Confirm: read-only chip preview renders fit-to-width (no horizontal scroll), fake spec is visible, the export and publish panels are present, and the "Edit on desktop" CTA is visible. At `1280x900`, confirm the full authoring shell renders instead. Record results.

- [ ] **Step 5: Desktop regression spot-check**

At `1280x900`, navigate landing/gallery/dashboard/editor and confirm the desktop layout is unchanged from pre-v6 (the media queries only apply below 768px). Record one line in the doc.

- [ ] **Step 6: Fill the visual gate sign-off and commit**

Complete the "Visual gate sign-off" section: state whether mobile layouts read as intentional/premium and list any nits. If a nit is a **release blocker** (horizontal scroll, overlapping text, clipped poster, sub-44px primary tap target), stop and fix it via the matching M1–M3 task pattern (CSS media query or component fix), re-run that surface, then continue. Commit the doc:

```bash
git add docs/ops/mobile-qa.md
git commit -m "docs(ops): record v6 mobile QA matrix"
```

---

### Task 3: Update the launch QA checklist's mobile line

**Files:**
- Modify: `docs/ops/launch-qa-checklist.md` (line ~115, the `[~] ... mobile not assessed` item)

**Interfaces:** none.

- [ ] **Step 1: Find the line**

Run: `grep -n "mobile not assessed" docs/ops/launch-qa-checklist.md`
Expected: one match (currently `- [~] No overlapping text or broken mobile layout in launch-critical pages. ➖ desktop-first verified; mobile not assessed (out of scope per product invariants).`).

- [ ] **Step 2: Flip it to assessed**

Replace that line with (adjust the marker to `[x]` only if Task 2's gate passed with no blockers):

```markdown
- [x] No overlapping text or broken mobile layout in launch-critical pages. ✅ v6 mobile QA passed at 360/390px across landing, gallery, detail, profile, share, account, dashboard, and the editor read-only preview; see `docs/ops/mobile-qa.md`.
```

- [ ] **Step 3: Verify and commit**

Run: `grep -n "mobile QA passed" docs/ops/launch-qa-checklist.md`
Expected: one match.

```bash
git add docs/ops/launch-qa-checklist.md
git commit -m "docs(ops): mark mobile layout assessed in launch QA checklist"
```

---

### Task 4: Version bump + Milestone Status, final gates

**Files:**
- Modify: `README.md` (line 1 title `0.3 v5` → `0.4 v6`; and the version-line note around line 9)
- Modify: `CLAUDE.md` (add a `### v6 Mobile/Responsive` block under "Milestone Status"; update the "Working Context" bullet)

**Interfaces:** none.

- [ ] **Step 1: Bump the README version line**

In `README.md`, change the title `# Virtual Silicon Lab 0.3 v5` to `# Virtual Silicon Lab 0.4 v6`, and update the version note (around line 9) to record that the `0.4` line is v6 (mobile/responsive). Add a one-line v6 entry to the feature/section list describing mobile read + account surfaces and the editor read-only mobile preview.

- [ ] **Step 2: Add the v6 Milestone Status block to `CLAUDE.md`**

Under "## Milestone Status", add a `### v6 Mobile/Responsive (branch \`v6-mobile-responsive\`)` block summarizing M0–M4: breakpoint foundation + `useIsMobile` + nav drawer (M0); public read-surface reflow (M1); account/dashboard reflow (M2); editor read-only mobile preview (M3); mobile QA matrix + visual gate + checklist flip (M4). Update the "Working Context" intro bullet to note v6 is complete through M4 on its branch (public launch remains a separate gate; admin stays desktop-only). Reference the spec `docs/superpowers/specs/2026-06-17-mobile-responsive-design.md` and these plans.

- [ ] **Step 3: Run the full gates one last time**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: bump to 0.4 v6 and record v6 milestone status"
```

- [ ] **Step 5: Record the milestone + finish the branch**

Append a `## V6-M4 Mobile QA & Release (2026-06-...)` entry to `implementation.md` (matrix result, visual gate sign-off, checklist flip, version bump). Commit it. Then **REQUIRED SUB-SKILL:** use `superpowers:finishing-a-development-branch` to verify tests and present merge/PR options for the completed `v6-mobile-responsive` branch.

```bash
git add implementation.md
git commit -m "docs(impl): record v6-m4 mobile QA and release"
```

---

## Self-Review

**1. Spec coverage (V6-M4):**
- Full mobile browser QA matrix (Playwright device emulation, iOS-Safari + Android-Chrome widths) across all surfaces → Task 2. ✅
- Visual gate sign-off (intentional/premium, no overlap/clip, no horizontal scroll, ≥44px targets) → Task 2 Step 6. ✅
- Update the launch QA checklist's mobile line → Task 3. ✅
- Final gates green → Task 1 Step 1 + Task 4 Step 3. ✅
- Release pack (version line, milestone status) → Task 4. ✅
- Admin out of scope → stated in "Surfaces under test". ✅

**2. Placeholder scan:** Each QA step has a concrete Playwright action + the exact overflow-detection snippet + a recorded pass bar. Doc edits show exact target lines via grep. Dates/SHAs are runtime-filled (`2026-06-...`, `<git short SHA>`) by design — they cannot be known until execution. ✅

**3. Type consistency:** No code/types introduced (QA + docs milestone). Any blocker fix routes back through the M1–M3 task patterns. ✅

## Notes

- If QA surfaces a blocker, the fix is small and local (a media-query tweak or a component branch) and should be committed separately with a `fix(v6):` message before re-running the affected surface — do not bundle fixes into the doc commits.
- The spec path referenced in Task 4 is `docs/superpowers/specs/2026-06-17-mobile-responsive-design.md`; confirm the exact filename with `ls docs/superpowers/specs | grep mobile` before linking.
