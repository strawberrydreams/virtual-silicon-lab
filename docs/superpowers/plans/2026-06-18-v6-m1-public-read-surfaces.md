# V6-M1 Public Read Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public read surfaces — landing (`/`), gallery list (`/gallery`), gallery detail (`/gallery/:slug`), public profile (`/u/:handle`), and the server-rendered share viewer (`/s/:slug`) — reflow cleanly on phones with no horizontal scroll.

**Architecture:** Pure CSS reflow against the existing class names in `src/styles.css`, plus responsive CSS injected into the server share template's `BASE_STYLE`. No component-structure changes, no JS. Mobile rules live in `@media (max-width: 767px)` blocks scoped next to each surface's existing block, matching the canonical v6 breakpoint from V6-M0 (`src/lib/breakpoints.ts`).

**Tech Stack:** Vite · hand-written CSS in `src/styles.css` · server share HTML string in `server/src/share/viewer.ts` · Vitest (for the share-template string assertion only).

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- **No database schema change, no migration, no new API** (per spec). The only server change is responsive CSS inside the existing share HTML template.
- Breakpoint is **768px**: mobile is `< 768px` (`max-width: 767px`), desktop `≥ 768px`. Tablets use the desktop tier. All new v6 mobile rules use `@media (max-width: 767px)`.
- Konva rendering and CSS are **not** unit-tested; CSS is verified by `npm run build` + a grep assertion. The share template's emitted CSS is asserted as a string. Full mobile **browser QA + visual gate is folded into V6-M4**, not this milestone.
- `src/domain/` purity, the `@domain/*` server boundary, and local-first behavior are untouched.
- One concern per commit; commit at the end of each task.

---

### Task 1: Landing page mobile reflow (`/`)

**Files:**
- Modify: `src/styles.css` (append a media block after the `.v2-hero-preview__frame { ... }` block / the landing section, near line ~325)

**Interfaces:**
- Consumes: existing landing classes `.v2-landing__hero`, `.v2-landing__title`, `.v2-hero-preview__frame`, `.v2-featured-presets__grid`, `.v2-featured-card`, `.v2-action-row .v2-button`.
- Produces: a landing page that single-columns below 768px with no fixed two-column floor. (No JS interface.)

**Why:** `.v2-landing__hero` is `grid-template-columns: minmax(430px, 0.9fr) minmax(560px, 1.1fr)` (≈990px minimum) — on a 360px phone this forces ~990px of width and hard horizontal scroll. This is the single worst offender on the landing page.

- [ ] **Step 1: Append the landing mobile media block to `src/styles.css`**

Add immediately after the landing/hero-preview CSS (after the `.v2-hero-preview__frame` block, before the `.v2-hero-chip` block near line ~326):

```css
@media (max-width: 767px) {
  .v2-landing__hero {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 1.75rem;
    padding: 2.25rem 1.25rem 2rem;
  }

  .v2-landing__title {
    font-size: clamp(2.1rem, 9vw, 3.35rem);
  }

  .v2-hero-preview__frame {
    min-height: 360px;
  }

  .v2-featured-presets__grid {
    grid-template-columns: 1fr;
  }

  .v2-featured-card {
    grid-template-columns: 1fr;
  }

  .v2-landing__copy .v2-action-row .v2-button {
    flex: 1 1 100%;
  }
}
```

- [ ] **Step 2: Verify the rule landed**

Run: `grep -n "v2-landing__hero" src/styles.css`
Expected: two matches — the original block (~line 267) and the new media-query override.

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: exit 0 (the known Vite >500 kB chunk warning is acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat(v6): landing page mobile reflow"
```

---

### Task 2: Gallery list + profile grid mobile reflow (`/gallery`, `/u/:handle`)

**Files:**
- Modify: `src/styles.css` (append a media block after the `.gallery-featured__row { ... }` block, near line ~2742)

**Interfaces:**
- Consumes: existing classes `.gallery-page__hero`, `.gallery-grid`, `.gallery-featured__row`, `.gallery-card__poster` — shared by both `GalleryPage` and `ProfilePage` (profile reuses `gallery-grid`/`gallery-card`/`gallery-page__hero`).
- Produces: gallery list and profile grids that read cleanly at phone widths. (No JS interface.)

**Why:** `.gallery-grid` and `.gallery-featured__row` already use `repeat(auto-fit, minmax(280px/240px, 1fr))` + `width: min(1180px, calc(100vw - 2rem))`, so they already collapse to one column on phones. The remaining gap is the oversized hero top padding (`4.5rem 0 2rem`) and tightening the gutter. Profile shares these classes, so one block covers both surfaces.

- [ ] **Step 1: Append the gallery-list/profile mobile media block to `src/styles.css`**

Add immediately after the `.gallery-featured__row { ... }` block (near line ~2742, before `.editor-stage-wrap`):

```css
@media (max-width: 767px) {
  .gallery-page__hero {
    padding: 2.5rem 0 1.25rem;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
    margin-bottom: 3rem;
  }

  .gallery-featured__row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Verify the rule landed**

Run: `grep -c "gallery-featured__row" src/styles.css`
Expected: `2` (original block + new override).

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: exit 0 (known chunk warning acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat(v6): gallery list and profile mobile reflow"
```

---

### Task 3: Gallery detail mobile reflow (`/gallery/:slug`)

**Files:**
- Modify: `src/styles.css` (extend/replace the existing `@media (max-width: 860px)` block at line ~2484; append a `767px` block after it for the comment form + lineage)

**Interfaces:**
- Consumes: existing classes `.gallery-detail__hero`, `.gallery-spec__grid`, `.gallery-comments__form`, `.gallery-lineage__spine`, `.gallery-lineage__children`.
- Produces: a gallery detail page that stacks poster/spec/reactions/comments/lineage to one column on phones. (No JS interface.)

**Why:** `.gallery-detail__hero` already collapses to one column at 860px and `.gallery-spec__grid` drops to two columns there. At phone widths the spec grid should go to a single column and the comment form (currently a row) should stack. Lineage spine/children already use `auto-fit minmax(180px, 1fr)` so they collapse on their own.

- [ ] **Step 1: Append the gallery-detail phone media block to `src/styles.css`**

Add immediately after the existing `@media (max-width: 860px) { ... }` block (after line ~2493):

```css
@media (max-width: 767px) {
  .gallery-detail__hero {
    padding: 2rem 0 1.2rem;
  }

  .gallery-spec__grid {
    grid-template-columns: 1fr;
  }

  .gallery-comments__form {
    flex-direction: column;
    align-items: stretch;
  }
}
```

> Note: if `.gallery-comments__form` is not already a flex row, the `flex-direction` override is a harmless no-op; this block is verified visually in V6-M4. Confirm the class exists with the grep in Step 2.

- [ ] **Step 2: Verify the rule landed and the class exists**

Run: `grep -c "gallery-spec__grid" src/styles.css && grep -c "gallery-comments__form" src/styles.css`
Expected: first count ≥ `2` (original + override); second count ≥ `1`.

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: exit 0 (known chunk warning acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat(v6): gallery detail mobile reflow"
```

---

### Task 4: Share viewer responsive CSS (`/s/:slug`, server-rendered)

**Files:**
- Modify: `server/src/share/viewer.ts` (append a media query to the `BASE_STYLE` template literal)
- Test: `server/test/` — add an assertion to the existing share viewer test (find it first; see Step 1)

**Interfaces:**
- Consumes: nothing new; `BASE_STYLE` is the shared style string used by both `renderViewerHtml` and `renderNotFoundHtml`.
- Produces: a server share page whose `.grid`, `.wrap`, and `.cta` reflow on phones. OG/Twitter meta and `poster.png` byte endpoint are unchanged. The emitted HTML still contains `@media (max-width: 767px)`.

**Why:** The share template already sets `<meta name="viewport" content="width=device-width, initial-scale=1">` and `.poster { width: 100% }`, so it scales, but `.grid` is `repeat(2, minmax(0, 1fr))` and `.cta` puts two `<a>` inline — both tighten on a 360px screen. Adding a media query to `BASE_STYLE` covers both `renderViewerHtml` and `renderNotFoundHtml` and keeps the crawler/OG behavior untouched.

- [ ] **Step 1: Locate the share viewer test**

Run: `ls server/test | grep -i "share\|viewer"` (and `grep -rln "renderViewerHtml" server/test`)
Expected: a test file such as `server/test/shareViewer.test.ts` (or similar). Open it; you will add one assertion in Step 2.

- [ ] **Step 2: Write the failing assertion**

Add to the located share-viewer test, inside its existing `describe` block (use the real import path the file already uses for `renderViewerHtml`):

```ts
  it('emits a mobile media query so the share page reflows on phones', () => {
    const html = renderViewerHtml({
      title: 'Test Chip',
      ownerDisplayName: 'Tester',
      slug: 'test-chip-1234',
      project: createDefaultProject('Test Chip'),
      baseUrl: 'https://example.com',
    })
    expect(html).toContain('@media (max-width: 767px)')
  })
```

> If the test file does not already import a project factory, reuse whatever fixture the existing `renderViewerHtml` tests in that file use to build the `project` argument (copy their setup verbatim). The assertion that matters is the `@media` substring.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test --workspace server -- <share-test-file>`
Expected: FAIL — the emitted HTML does not yet contain `@media (max-width: 767px)`.

- [ ] **Step 4: Append the media query to `BASE_STYLE`**

In `server/src/share/viewer.ts`, change the end of the `BASE_STYLE` template literal from:

```ts
  .cta a { color: #6fd3ff; text-decoration: none; border: 1px solid #25406b; border-radius: 8px; padding: 10px 18px; }
`
```

to:

```ts
  .cta a { color: #6fd3ff; text-decoration: none; border: 1px solid #25406b; border-radius: 8px; padding: 10px 18px; }
  @media (max-width: 767px) {
    .wrap { padding: 28px 16px 48px; }
    h1 { font-size: 26px; }
    .grid { grid-template-columns: 1fr; }
    .cta { display: flex; flex-direction: column; gap: 10px; }
    .cta a { text-align: center; }
  }
`
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace server -- <share-test-file>`
Expected: PASS — including the new media-query assertion and all pre-existing share-viewer tests.

- [ ] **Step 6: Commit**

```bash
git add server/src/share/viewer.ts server/test/<share-test-file>
git commit -m "feat(v6): responsive share viewer template"
```

---

### Task 5: Full-gate verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full gates**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: client + server suites PASS; build exits 0 (known chunk warning); server typecheck exits 0; lint exits 0.

- [ ] **Step 2: Record the milestone**

Append a `## V6-M1 Public Read Surfaces (2026-06-...)` entry to `implementation.md` summarizing the surfaces reflowed (landing/gallery-list/gallery-detail/profile/share), the breakpoint used (767px), and that mobile visual confirmation is deferred to V6-M4 QA. Commit:

```bash
git add implementation.md
git commit -m "docs(impl): record v6-m1 public read surfaces"
```

---

## Self-Review

**1. Spec coverage (V6-M1):**
- Landing one-column reflow → Task 1. ✅
- Gallery list single-column grid + tappable sort (sort already wraps via `flex-wrap`) → Task 2. ✅
- Gallery detail stacks poster/spec/reactions/comments/lineage → Task 3. ✅
- Public profile single column → Task 2 (profile reuses `gallery-grid`/`gallery-page__hero`). ✅
- Share viewer responsive CSS, OG/poster.png unchanged → Task 4. ✅

**2. Placeholder scan:** Every CSS step shows the exact block; the share-template change shows before/after; the one test step shows the assertion. The share-test filename is resolved by grep in Task 4 Step 1 (it is not hard-coded because the repo's exact filename must be confirmed at execution). ✅

**3. Type consistency:** No new TS types. The share test imports `renderViewerHtml` from the same module the existing tests use; the project fixture mirrors the file's existing `renderViewerHtml` tests. ✅

## Out of scope for M1 (handled in later milestones)

- Account/login, dashboard, onboarding reflow → V6-M2.
- Editor read-only mobile preview → V6-M3.
- Mobile browser QA matrix + visual gate sign-off → V6-M4.
