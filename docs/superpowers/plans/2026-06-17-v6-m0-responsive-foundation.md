# V6-M0 Responsive Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the desktop-only viewport floor and give the app shell a working mobile navigation, establishing the breakpoint primitives the rest of v6 builds on.

**Architecture:** Responsive reflow of the existing single component tree (no separate mobile route tree). A shared 768px breakpoint lives in one pure module; a `useIsMobile()` hook reads it via `matchMedia`; the header nav becomes a CSS-driven drawer toggled by a hamburger button, auto-closing when the viewport returns to desktop.

**Tech Stack:** Vite · React + TypeScript · hand-written CSS in `src/styles.css` (+ Tailwind v4) · Vitest + React Testing Library (`renderHook`, jsdom).

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- **No database schema change, no migration, no new API** in v6 (per spec).
- `src/lib/` is framework-agnostic, zero-dependency (no React imports). React hooks do **not** belong in `src/lib/`.
- Vitest tests use explicit imports: `import { describe, expect, it } from 'vitest'` (no globals).
- Konva rendering is **not** unit-tested; CSS is verified by build + browser QA (browser QA for M0 layout is folded into V6-M4).
- Breakpoint is **768px**: mobile is `< 768px` (`max-width: 767px`), desktop is `≥ 768px`. Tablets use the desktop tier.
- One concern per commit; commit at the end of each task.

---

### Task 1: Shared breakpoint constant

**Files:**
- Create: `src/lib/breakpoints.ts`
- Test: `src/lib/breakpoints.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const MOBILE_MAX_WIDTH: number` (= `767`)
  - `export const MOBILE_MEDIA_QUERY: string` (= `'(max-width: 767px)'`)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/breakpoints.test.ts
import { describe, expect, it } from 'vitest'
import { MOBILE_MAX_WIDTH, MOBILE_MEDIA_QUERY } from './breakpoints'

describe('breakpoints', () => {
  it('exposes the mobile max width and a matching media query', () => {
    expect(MOBILE_MAX_WIDTH).toBe(767)
    expect(MOBILE_MEDIA_QUERY).toBe(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/lib/breakpoints.test.ts`
Expected: FAIL — cannot resolve `./breakpoints`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/breakpoints.ts
// Single source of truth for the v6 mobile/desktop split. CSS media queries and
// the useIsMobile() hook must both reference this so layout and JS agree.
export const MOBILE_MAX_WIDTH = 767
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/lib/breakpoints.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/breakpoints.ts src/lib/breakpoints.test.ts
git commit -m "feat(v6): add shared mobile breakpoint constant"
```

---

### Task 2: `useIsMobile()` hook + test-env matchMedia stub

**Files:**
- Modify: `src/test/setup.ts` (add a jsdom `matchMedia` stub)
- Create: `src/app/useIsMobile.ts`
- Test: `src/app/useIsMobile.test.ts`

**Interfaces:**
- Consumes: `MOBILE_MEDIA_QUERY` from `src/lib/breakpoints`.
- Produces: `export function useIsMobile(): boolean` — `true` when the viewport matches the mobile media query, updating on viewport change.

**Why the setup change:** jsdom does not implement `window.matchMedia`. Once `useIsMobile()` is used in the header (Task 4), every test that renders `<App />` would throw without a stub. The stub defaults to **desktop** (`matches: false`) so existing tests keep their current behavior; the hook's own test overrides it per-case.

- [ ] **Step 1: Add the matchMedia stub to the shared test setup**

Append to `src/test/setup.ts`:

```ts
// jsdom does not implement matchMedia; provide a desktop-default stub so
// components that read the viewport (e.g. useIsMobile) can render in tests.
// Individual tests override window.matchMedia when they need mobile behavior.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/app/useIsMobile.test.ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsMobile } from './useIsMobile'

function stubMatchMedia(matches: boolean, listeners: ((e: MediaQueryListEvent) => void)[] = []) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

describe('useIsMobile', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns true when the mobile media query matches', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when the mobile media query does not match', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when the media query change event fires', () => {
    const listeners: ((e: MediaQueryListEvent) => void)[] = []
    stubMatchMedia(false, listeners)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent)))
    expect(result.current).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:client -- src/app/useIsMobile.test.ts`
Expected: FAIL — cannot resolve `./useIsMobile`.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/app/useIsMobile.ts
import { useEffect, useState } from 'react'
import { MOBILE_MEDIA_QUERY } from '../lib/breakpoints'

// Reactive viewport check for the few places that must branch structurally on
// mobile (the nav drawer's auto-close here; the editor read-only preview in M3).
// Pure CSS handles styling; this hook is only for JS-side structural decisions.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(MOBILE_MEDIA_QUERY).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:client -- src/app/useIsMobile.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Verify the setup stub didn't break the existing suite**

Run: `npm run test:client`
Expected: PASS — full client suite green (no regression from the setup.ts change).

- [ ] **Step 7: Commit**

```bash
git add src/test/setup.ts src/app/useIsMobile.ts src/app/useIsMobile.test.ts
git commit -m "feat(v6): add useIsMobile hook and test-env matchMedia stub"
```

---

### Task 3: Remove the desktop viewport floor

**Files:**
- Modify: `src/styles.css:20-24` (the `body` rule)

**Interfaces:**
- Consumes: nothing.
- Produces: a body that no longer forces a 1024px minimum width. (No JS interface.)

**Note:** This is a CSS-only change; it is verified by build + a grep assertion, not a unit test. Visual confirmation on a phone viewport is part of V6-M4 QA.

- [ ] **Step 1: Remove the `min-width` floor**

In `src/styles.css`, change:

```css
body {
  min-width: 1024px;
  min-height: 100vh;
  margin: 0;
}
```

to:

```css
body {
  min-height: 100vh;
  margin: 0;
}
```

- [ ] **Step 2: Verify the floor is gone**

Run: `grep -n "min-width: 1024px" src/styles.css`
Expected: no output (exit code 1) — the floor no longer exists.

- [ ] **Step 3: Verify the build still passes**

Run: `npm run build`
Expected: exit 0 (the known Vite >500 kB chunk warning is acceptable).

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat(v6): drop the 1024px desktop viewport floor"
```

---

### Task 4: Mobile navigation drawer

**Files:**
- Modify: `src/app/App.tsx` (the `SiteHeader`, `AccountNavLink`, `AdminNavLink` functions; add `useIsMobile` import)
- Modify: `src/styles.css` (append header drawer rules after the existing `.site-header__nav a:hover` block)
- Test: `src/app/App.test.tsx` (add drawer tests)

**Interfaces:**
- Consumes: `useIsMobile` from `./useIsMobile`; existing `useState`/`useEffect` (already imported in `App.tsx`).
- Produces: a header that renders a hamburger toggle (`aria-label` "Open menu"/"Close menu", `aria-controls="primary-nav"`, `aria-expanded`) controlling a `nav#primary-nav` whose `data-open` reflects the drawer state. No exported symbols change.

- [ ] **Step 1: Write the failing tests**

Add to `src/app/App.test.tsx` inside the existing `describe('App', ...)` block:

```ts
  it('toggles the primary navigation drawer from the menu button', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    const toggle = screen.getByRole('button', { name: 'Open menu' })
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(nav).toHaveAttribute('data-open', 'false')

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(nav).toHaveAttribute('data-open', 'true')
  })

  it('closes the drawer when a navigation link is chosen', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(nav).toHaveAttribute('data-open', 'true')

    await userEvent.click(screen.getByRole('link', { name: 'Gallery' }))
    expect(nav).toHaveAttribute('data-open', 'false')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:client -- src/app/App.test.tsx`
Expected: FAIL — no "Open menu" button / no `data-open` attribute yet.

- [ ] **Step 3: Update the header components in `src/app/App.tsx`**

Add the import near the other local imports (after the `usePageTheme` import):

```ts
import { useIsMobile } from './useIsMobile'
```

Replace the `SiteHeader` function with:

```tsx
function SiteHeader({
  themeName,
  onThemeChange,
}: {
  themeName: PageThemeName
  onThemeChange: (theme: PageThemeName) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close the drawer when the viewport grows back to desktop, so a drawer opened
  // on a phone does not stay stuck open after rotating/resizing.
  useEffect(() => {
    if (!isMobile) setMenuOpen(false)
  }, [isMobile])

  // Escape closes the drawer for keyboard users.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className="site-header">
      <Link className="site-header__brand" to="/" onClick={closeMenu}>
        Virtual Silicon Lab
      </Link>
      <div className="site-header__right">
        <button
          type="button"
          className="site-header__menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>
        {menuOpen && (
          <button
            type="button"
            className="site-header__nav-backdrop"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={closeMenu}
          />
        )}
        <nav
          id="primary-nav"
          aria-label="Primary navigation"
          className="site-header__nav"
          data-open={menuOpen}
        >
          <Link to="/" onClick={closeMenu}>
            Lab
          </Link>
          <Link to="/dashboard" onClick={closeMenu}>
            Projects
          </Link>
          <Link to="/gallery" onClick={closeMenu}>
            Gallery
          </Link>
          <Link to="/contests" onClick={closeMenu}>
            Contests
          </Link>
          <AccountNavLink onNavigate={closeMenu} />
          <AdminNavLink onNavigate={closeMenu} />
        </nav>
        <ThemeSwitcher current={themeName} onChange={onThemeChange} />
      </div>
    </header>
  )
}
```

Replace `AccountNavLink` and `AdminNavLink` with:

```tsx
function AccountNavLink({ onNavigate }: { onNavigate?: () => void }) {
  const auth = useAuthStore()
  const label =
    auth.status === 'authenticated' && auth.user !== null ? auth.user.displayName : 'Account'
  return (
    <Link to="/account" onClick={onNavigate}>
      {label}
    </Link>
  )
}

function AdminNavLink({ onNavigate }: { onNavigate?: () => void }) {
  const auth = useAuthStore()
  if (!auth.isAdmin) return null
  return (
    <Link to="/admin" onClick={onNavigate}>
      Admin
    </Link>
  )
}
```

- [ ] **Step 4: Append the drawer CSS to `src/styles.css`**

After the `.site-header__nav a:hover { ... }` block, add:

```css
.site-header__menu-toggle {
  display: none; /* desktop: the horizontal nav is shown instead */
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--v2-border);
  border-radius: 8px;
  background: transparent;
  color: var(--v2-text);
  font-size: 1.1rem;
}

.site-header__nav-backdrop {
  display: none;
}

@media (max-width: 767px) {
  .site-header__menu-toggle {
    display: inline-flex;
  }

  .site-header__nav {
    position: fixed;
    inset: 58px 0 auto 0; /* directly below the 58px header */
    z-index: 50;
    flex-direction: column;
    gap: 0;
    padding: 0.5rem 1rem 1rem;
    background: var(--v2-panel-strong);
    border-bottom: 1px solid var(--v2-border);
  }

  .site-header__nav[data-open='false'] {
    display: none;
  }

  .site-header__nav a {
    width: 100%;
    min-height: 44px;
    justify-content: flex-start;
  }

  .site-header__nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    background: rgba(0, 0, 0, 0.4);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:client -- src/app/App.test.tsx`
Expected: PASS — including the two new drawer tests and all pre-existing App tests.

- [ ] **Step 6: Run the full gates**

Run: `npm test && npm run build && npm run lint`
Expected: client + server suites PASS; build exits 0 (known chunk warning); lint exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/App.tsx src/styles.css src/app/App.test.tsx
git commit -m "feat(v6): mobile navigation drawer in the app header"
```

---

## Self-Review

**1. Spec coverage (V6-M0 acceptance):**
- "remove the `min-width: 1024px` floor" → Task 3. ✅
- "establish the 768px two-tier breakpoint (CSS + shared constant)" → Task 1 (constant) + Task 4 CSS media query at 767px. ✅
- "add `useIsMobile()`" → Task 2. ✅
- "convert the header nav to a mobile drawer" → Task 4. ✅
- "app no longer forces desktop width; nav works on a phone viewport; gates green" → Task 3 + Task 4 (Step 6 runs full gates). ✅

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has expected output. ✅

**3. Type consistency:** `MOBILE_MAX_WIDTH`/`MOBILE_MEDIA_QUERY` (Task 1) are consumed verbatim in Task 2. `useIsMobile(): boolean` (Task 2) is consumed in Task 4. The `onNavigate?: () => void` prop added to `AccountNavLink`/`AdminNavLink` matches the `closeMenu` callback passed in `SiteHeader`. The nav exposes `data-open` + `aria-controls="primary-nav"`/`id="primary-nav"`, matching the tests in Task 4 Step 1. ✅

## Out of scope for M0 (handled in later milestones)

- Per-surface reflow of landing/gallery/profile/share (V6-M1) and account/dashboard/onboarding (V6-M2).
- Editor read-only mobile preview (V6-M3).
- Mobile browser QA matrix + visual gate (V6-M4).
