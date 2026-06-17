# V6-M2 Account & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the account/login surface (`/account` and its verify/reset/forgot states), the project dashboard (`/dashboard`), and onboarding/first-run guidance reflow cleanly on phones.

**Architecture:** Pure CSS reflow against existing class names in `src/styles.css` for the dashboard (hand-written CSS) and a targeted gutter tweak for the account page (already Tailwind-based, single-column by default). No JS, no component-structure changes. Mobile rules use `@media (max-width: 767px)`.

**Tech Stack:** Vite · hand-written CSS in `src/styles.css` · Tailwind v4 utilities in `src/features/account/AccountPage.tsx`.

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- **No database schema change, no migration, no new API** (per spec).
- Breakpoint is **768px** (`max-width: 767px` for mobile). Tablets use the desktop tier. The spec permits Tailwind responsive prefixes on already-Tailwind components (`AccountPage`); the dashboard uses hand-written CSS media queries.
- CSS is **not** unit-tested; verified by `npm run build` + grep. Full mobile **browser QA + visual gate is folded into V6-M4**.
- `src/domain/` purity and local-first behavior untouched.
- One concern per commit.

## Pre-work findings (read before starting)

- `AccountPage.tsx` is already Tailwind-responsive: wrapper `mx-auto max-w-3xl px-6 py-10`, inputs `w-full`, two-up sections use `grid gap-6 md:grid-cols-2` (single column below Tailwind's `md`). It needs only a small-screen gutter tightening, not a structural rewrite.
- Onboarding/first-run is rendered by `FirstRunCoachmarks` **inside the desktop editor only**; it already has a `@media (max-width: 760px)` block making it static, and the V6-M3 mobile editor branch does not render it. Dashboard/account first-run *guidance text* lives in the dashboard header and account intro copy, which reflow via Task 1 / Task 2. No new onboarding component work is required in M2.

---

### Task 1: Dashboard mobile reflow (`/dashboard`)

**Files:**
- Modify: `src/styles.css` (append a media block after the `.v2-empty-state` / preset-card section, near line ~650; the dashboard shares `.v2-dashboard*`, `.v2-preset-grid`, `.v2-project-grid` classes)

**Interfaces:**
- Consumes: existing classes `.v2-dashboard__header`, `.v2-dashboard__inner`, `.v2-preset-grid`, `.v2-project-grid`.
- Produces: a dashboard whose preset/project grids collapse to one column and whose header padding tightens on phones. (No JS interface.)

**Why:** `.v2-preset-grid` and `.v2-project-grid` are `repeat(3, minmax(0, 1fr))` — three columns are unreadable at 360px. The dashboard `.v2-dashboard__inner` is capped by `max-width: 1240px` (a max, not a floor) so it already fits; only the grids and header spacing need mobile rules.

- [ ] **Step 1: Append the dashboard mobile media block to `src/styles.css`**

Add after the `.v2-empty-state { ... }` block (locate it near line ~645; insert before the next unrelated section):

```css
@media (max-width: 767px) {
  .v2-dashboard__header {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .v2-preset-grid,
  .v2-project-grid {
    grid-template-columns: 1fr;
  }

  .v2-preset-card {
    min-height: auto;
  }
}
```

> The `.v2-dashboard__header` padding values mirror the landing mobile gutter (1.25rem) for consistency; if the header already has zero horizontal padding at desktop, this only applies on mobile and is harmless. Verified visually in V6-M4.

- [ ] **Step 2: Verify the rule landed**

Run: `grep -c "v2-preset-grid" src/styles.css`
Expected: `2` (original combined selector + new override).

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: exit 0 (known chunk warning acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat(v6): dashboard mobile reflow"
```

---

### Task 2: Account page mobile gutter tightening (`/account`)

**Files:**
- Modify: `src/features/account/AccountPage.tsx` (the two top-level wrapper `className` strings — both use `mx-auto max-w-3xl px-6 py-10`)

**Interfaces:**
- Consumes: nothing new.
- Produces: an account page with comfortable phone gutters; layout already single-columns by default. (No exported symbol changes.)

**Why:** The page is already responsive (single column, `w-full` inputs). The only mobile nit is the `px-6 py-10` page padding being slightly generous on a 360px screen. Switch to a mobile-first `px-4 py-8 sm:px-6 sm:py-10` so phones get tighter gutters while desktop is unchanged. (Tailwind `sm` = 640px; the spec explicitly permits Tailwind prefixes on this already-Tailwind component.)

- [ ] **Step 1: Find both wrapper class strings**

Run: `grep -n "mx-auto max-w-3xl px-6 py-10" src/features/account/AccountPage.tsx`
Expected: at least two matches (the signed-out form wrapper and the signed-in account wrapper).

- [ ] **Step 2: Update both wrapper class strings**

Replace each occurrence of:

```
mx-auto max-w-3xl px-6 py-10 text-[var(--v2-text)]
```

with:

```
mx-auto max-w-3xl px-4 py-8 text-[var(--v2-text)] sm:px-6 sm:py-10
```

Use `replace_all` (the two wrappers share the identical class string).

- [ ] **Step 3: Verify the change**

Run: `grep -c "px-4 py-8 text-\[var(--v2-text)\] sm:px-6 sm:py-10" src/features/account/AccountPage.tsx`
Expected: count matches the number of wrappers found in Step 1 (≥ 2).

- [ ] **Step 4: Run the account page tests + build**

Run: `npm run test:client -- src/features/account/AccountPage.test.tsx && npm run build`
Expected: account tests PASS (class-string change does not affect behavior); build exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/features/account/AccountPage.tsx
git commit -m "feat(v6): tighten account page mobile gutters"
```

---

### Task 3: Full-gate verification + onboarding confirmation

**Files:** `implementation.md` (milestone entry only).

- [ ] **Step 1: Confirm onboarding needs no new code**

Run: `grep -n "max-width: 760px" src/styles.css`
Expected: a match inside the `.editor-coachmarks` media block — confirming first-run coachmarks already reflow to static positioning on small screens. (The mobile editor branch in V6-M3 does not render coachmarks at all; dashboard/account guidance reflow via Tasks 1–2.) No code change required here.

- [ ] **Step 2: Run the full gates**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: client + server suites PASS; build exits 0; server typecheck exits 0; lint exits 0.

- [ ] **Step 3: Record the milestone**

Append a `## V6-M2 Account & Dashboard (2026-06-...)` entry to `implementation.md`: dashboard grids collapse to one column + header gutter; account page mobile gutter tightening (Tailwind, already single-column); onboarding confirmed covered by the existing coachmarks ≤760 block + the M3 mobile editor branch; visual confirmation deferred to V6-M4. Commit:

```bash
git add implementation.md
git commit -m "docs(impl): record v6-m2 account and dashboard"
```

---

## Self-Review

**1. Spec coverage (V6-M2):**
- Login/account forms single column, full-width inputs → already true (Tailwind); Task 2 tightens gutters. ✅
- Verify/reset/forgot states reflow → they share `AccountPage`'s wrapper + `w-full` inputs, so Task 2 covers them. ✅
- Project dashboard cards stack to one column; new/random actions reachable → Task 1 (the `.v2-action-row` new/random buttons already wrap via `flex-wrap`). ✅
- Onboarding/first-run reflow → Task 3 Step 1 confirms existing coverage; no new code. ✅

**2. Placeholder scan:** Every step shows the exact class string / CSS block and an exact verifying grep. No TODO/TBD. ✅

**3. Type consistency:** No TS types introduced. The Tailwind class swap is a pure string change verified by an exact grep count. ✅

## Out of scope for M2 (handled in later milestones)

- Editor read-only mobile preview → V6-M3.
- Admin page responsiveness → out of scope for all of v6 (operator tool, stays desktop-only).
- Mobile browser QA matrix + visual gate → V6-M4.
