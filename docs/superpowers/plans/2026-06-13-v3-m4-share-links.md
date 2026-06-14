# V3-M4 Share Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login-free, server-rendered `/s/:slug` share viewer (public chips only) with OG/Twitter meta + a `poster.png` byte endpoint so link previews work, and surface a copy-able `shareUrl` in the editor PublishPanel.

**Architecture:** A new `server/src/share/` module renders the viewer HTML and serves decoded poster bytes through the existing Hono app (mounted outside `/api`). It reuses M3's `getPublicPublishedChipBySlug` (public-only gate) and never mutates the stored snapshot. The publish JSON API gains a server-authoritative `shareUrl` (absolute, `null` when private). The client PublishPanel shows the link with a copy button when the chip is public.

**Tech Stack:** Hono + better-sqlite3 (server), Vitest node env (server tests), React + Vitest + Testing Library (client). Shared domain via `@domain/*` alias.

---

## File Structure

**New (server):**
- `server/src/share/baseUrl.ts` — `resolvePublicBaseUrl(requestUrl, configuredBase?)`, `buildShareUrl(baseUrl, slug)`.
- `server/src/share/poster.ts` — `decodePngDataUrl(dataUrl)` → `Buffer | null`.
- `server/src/share/viewer.ts` — `escapeHtml`, `renderViewerHtml`, `renderNotFoundHtml`.
- `server/src/share/routes.ts` — Hono routes `GET /s/:slug`, `GET /s/:slug/poster.png`.
- `server/test/shareHelpers.test.ts` — unit tests for baseUrl/poster/viewer helpers.
- `server/test/shareRoutes.test.ts` — integration tests for the share routes.

**Modified (server):**
- `server/src/app.ts` — add `publicBaseUrl?: string` to `AppDeps`; mount `shareRoutes`.
- `server/src/publish/routes.ts` — add `shareUrl` to `serializePublishedChip` (uses base URL).
- `server/src/index.ts` — pass `publicBaseUrl: process.env.VSL_PUBLIC_BASE_URL`.
- `server/test/publishRoutes.test.ts` — assert `shareUrl` is public-only.

**Modified (client):**
- `src/features/publish/publishApi.ts` — add `shareUrl: string | null` to `PublishedChip`.
- `src/features/publish/publishApi.test.ts` — fixture/assertion for `shareUrl`.
- `src/features/publish/PublishPanel.tsx` — copy-link UI when public.
- `src/features/publish/PublishPanel.test.tsx` — copy button behavior.

**Docs:**
- `implementation.md`, `CLAUDE.md` — record M4.

---

## Task 1: Base URL + share URL helpers

**Files:**
- Create: `server/src/share/baseUrl.ts`
- Test: `server/test/shareHelpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/test/shareHelpers.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildShareUrl, resolvePublicBaseUrl } from '../src/share/baseUrl'

describe('resolvePublicBaseUrl', () => {
  it('prefers the configured base and strips trailing slashes', () => {
    expect(resolvePublicBaseUrl('http://localhost/s/abc', 'https://chips.example.com/')).toBe(
      'https://chips.example.com',
    )
  })

  it('falls back to the request origin when no base is configured', () => {
    expect(resolvePublicBaseUrl('http://127.0.0.1:8787/s/abc', undefined)).toBe('http://127.0.0.1:8787')
    expect(resolvePublicBaseUrl('http://127.0.0.1:8787/s/abc', '')).toBe('http://127.0.0.1:8787')
  })
})

describe('buildShareUrl', () => {
  it('joins the base and slug under /s/', () => {
    expect(buildShareUrl('https://chips.example.com', 'ada-chip-deadbeef')).toBe(
      'https://chips.example.com/s/ada-chip-deadbeef',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace server -- shareHelpers`
Expected: FAIL — cannot find module `../src/share/baseUrl`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/share/baseUrl.ts`:

```typescript
export function resolvePublicBaseUrl(requestUrl: string, configuredBase?: string): string {
  if (configuredBase !== undefined && configuredBase !== '') {
    return configuredBase.replace(/\/+$/, '')
  }
  return new URL(requestUrl).origin
}

export function buildShareUrl(baseUrl: string, slug: string): string {
  return `${baseUrl}/s/${slug}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace server -- shareHelpers`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/share/baseUrl.ts server/test/shareHelpers.test.ts
git commit -m "feat(server): add share base-url resolution helpers"
```

---

## Task 2: Poster data-URL decoder

**Files:**
- Create: `server/src/share/poster.ts`
- Test: `server/test/shareHelpers.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `server/test/shareHelpers.test.ts`:

```typescript
import { decodePngDataUrl } from '../src/share/poster'

describe('decodePngDataUrl', () => {
  it('decodes a base64 PNG data URL into bytes', () => {
    const bytes = decodePngDataUrl('data:image/png;base64,AAAA')
    expect(bytes).not.toBeNull()
    expect((bytes as Buffer).length).toBeGreaterThan(0)
  })

  it('returns null for non-PNG or empty data URLs', () => {
    expect(decodePngDataUrl('data:image/jpeg;base64,AAAA')).toBeNull()
    expect(decodePngDataUrl('data:image/png;base64,')).toBeNull()
    expect(decodePngDataUrl('not-a-data-url')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace server -- shareHelpers`
Expected: FAIL — cannot find module `../src/share/poster`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/share/poster.ts`:

```typescript
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'

export function decodePngDataUrl(dataUrl: string): Buffer | null {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) return null
  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length)
  if (base64 === '') return null
  const bytes = Buffer.from(base64, 'base64')
  return bytes.length > 0 ? bytes : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace server -- shareHelpers`
Expected: PASS (5 tests total).

- [ ] **Step 5: Commit**

```bash
git add server/src/share/poster.ts server/test/shareHelpers.test.ts
git commit -m "feat(server): decode stored poster data URLs to PNG bytes"
```

---

## Task 3: HTML escaping + viewer/not-found templates

**Files:**
- Create: `server/src/share/viewer.ts`
- Test: `server/test/shareHelpers.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `server/test/shareHelpers.test.ts`:

```typescript
import { createProject } from '@domain/projectFactory'
import { escapeHtml, renderNotFoundHtml, renderViewerHtml } from '../src/share/viewer'

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<script>"x" & \'y\'')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;')
  })
})

describe('renderViewerHtml', () => {
  const project = {
    ...createProject('Ada Chip', 'project-1', 1_000),
    spec: {
      brand: 'AURORA',
      series: 'C-1',
      generation: 'Gen 1',
      process: '2nm',
      cores: 64,
      bandwidth: '2.2 TB/s',
      features: ['Neon glow', 'Hex die'],
      description: 'A surreal consciousness processor.',
    },
  }

  it('renders absolute OG/Twitter meta pointing at the poster endpoint', () => {
    const html = renderViewerHtml({
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      slug: 'ada-chip-deadbeef',
      project,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).toContain('<meta property="og:title" content="Ada Chip">')
    expect(html).toContain(
      '<meta property="og:image" content="https://chips.example.com/s/ada-chip-deadbeef/poster.png">',
    )
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(html).toContain('<meta property="og:image:width" content="3200">')
    expect(html).toContain('src="https://chips.example.com/s/ada-chip-deadbeef/poster.png"')
    expect(html).toContain('AURORA')
  })

  it('escapes user-controlled title and spec content', () => {
    const html = renderViewerHtml({
      title: '<script>alert(1)</script>',
      ownerDisplayName: 'Ada',
      slug: 'x',
      project,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})

describe('renderNotFoundHtml', () => {
  it('renders a noindex 404 body', () => {
    const html = renderNotFoundHtml({ baseUrl: 'https://chips.example.com' })
    expect(html).toContain('noindex')
    expect(html.toLowerCase()).toContain('not found')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace server -- shareHelpers`
Expected: FAIL — cannot find module `../src/share/viewer`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/share/viewer.ts`:

```typescript
import type { Project } from '@domain/project'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type ViewerInput = {
  title: string
  ownerDisplayName: string
  slug: string
  project: Project
  baseUrl: string
}

const BASE_STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #06080f; color: #e6f0ff; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 48px 24px 72px; }
  .kicker { text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; color: #6fd3ff; margin: 0 0 8px; }
  h1 { font-size: 34px; margin: 0 0 6px; }
  .owner { color: #93a4c4; margin: 0 0 24px; }
  .poster { width: 100%; border-radius: 16px; border: 1px solid #1c2740; display: block; margin: 0 0 32px; }
  .spec { border: 1px solid #1c2740; border-radius: 16px; padding: 24px; background: #0a0f1c; }
  .spec h2 { margin: 0 0 16px; font-size: 20px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0 0 16px; }
  .grid dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #6fd3ff; }
  .grid dd { margin: 4px 0 0; font-size: 16px; }
  .features { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .features span { border: 1px solid #25406b; border-radius: 999px; padding: 4px 12px; font-size: 13px; color: #bcd2ff; }
  .cta { margin-top: 32px; }
  .cta a { color: #6fd3ff; text-decoration: none; border: 1px solid #25406b; border-radius: 8px; padding: 10px 18px; }
`

export function renderViewerHtml(input: ViewerInput): string {
  const { title, ownerDisplayName, slug, project, baseUrl } = input
  const spec = project.spec
  const shareUrl = `${baseUrl}/s/${slug}`
  const posterUrl = `${baseUrl}/s/${slug}/poster.png`
  const description = spec.description !== '' ? spec.description : `${spec.brand} ${spec.series}`
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const features = spec.features
    .map((feature) => `<span>${escapeHtml(feature)}</span>`)
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle} — Virtual Silicon Lab</title>
<meta property="og:site_name" content="Virtual Silicon Lab">
<meta property="og:type" content="website">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:image" content="${escapeHtml(posterUrl)}">
<meta property="og:image:width" content="3200">
<meta property="og:image:height" content="1800">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${escapeHtml(posterUrl)}">
<style>${BASE_STYLE}</style>
</head>
<body>
<main class="wrap">
  <p class="kicker">Shared from Virtual Silicon Lab</p>
  <h1>${safeTitle}</h1>
  <p class="owner">Published by ${escapeHtml(ownerDisplayName)}</p>
  <img class="poster" src="${escapeHtml(posterUrl)}" alt="${safeTitle} poster">
  <section class="spec">
    <h2>${escapeHtml(spec.brand)} ${escapeHtml(spec.series)}</h2>
    <dl class="grid">
      <div><dt>Generation</dt><dd>${escapeHtml(spec.generation)}</dd></div>
      <div><dt>Process</dt><dd>${escapeHtml(spec.process)}</dd></div>
      <div><dt>Cores</dt><dd>${escapeHtml(String(spec.cores))}</dd></div>
      <div><dt>Bandwidth</dt><dd>${escapeHtml(spec.bandwidth)}</dd></div>
    </dl>
    <p>${safeDescription}</p>
    <div class="features">${features}</div>
  </section>
  <p class="cta"><a href="${escapeHtml(baseUrl)}/">Open the Lab</a></p>
  <!-- Remix this chip: V3-M5 -->
</main>
</body>
</html>`
}

export function renderNotFoundHtml(input: { baseUrl: string }): string {
  const { baseUrl } = input
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Chip not found — Virtual Silicon Lab</title>
<style>${BASE_STYLE}</style>
</head>
<body>
<main class="wrap">
  <p class="kicker">Share Core</p>
  <h1>Chip not found</h1>
  <p class="owner">This chip may be private, unpublished, or deleted.</p>
  <p class="cta"><a href="${escapeHtml(baseUrl)}/">Open the Lab</a></p>
</main>
</body>
</html>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace server -- shareHelpers`
Expected: PASS (all helper tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/share/viewer.ts server/test/shareHelpers.test.ts
git commit -m "feat(server): render share viewer + 404 HTML with escaped OG meta"
```

---

## Task 4: Share routes + app mount

**Files:**
- Create: `server/src/share/routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/shareRoutes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/test/shareRoutes.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { createProject } from '@domain/projectFactory'
import { createTestApp } from './helpers'
import { upsertPublishedChip } from '../src/publish/service'

const png = 'data:image/png;base64,AAAA'

function insertUser(db: ReturnType<typeof createTestApp>['db'], id: string, email: string, displayName: string) {
  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, email, displayName, 'hash', 1, 1)
}

function fixture() {
  const { app, db } = createTestApp()
  insertUser(db, 'u1', 'ada@example.com', 'Ada')
  const publicChip = upsertPublishedChip(db, 'u1', {
    project: { ...createProject('Ada Public', 'project-public', 1_000) },
    title: 'Ada <Public>',
    dieImageDataUrl: png,
    posterImageDataUrl: png,
    isPublic: true,
  }, () => 2_000)
  const privateChip = upsertPublishedChip(db, 'u1', {
    project: createProject('Ada Private', 'project-private', 1_000),
    title: 'Ada Private',
    dieImageDataUrl: png,
    posterImageDataUrl: png,
    isPublic: false,
  }, () => 3_000)
  return { app, publicChip, privateChip }
}

describe('share viewer routes', () => {
  it('renders a public chip as HTML with escaped OG meta', async () => {
    const { app, publicChip } = fixture()

    const res = await app.request(`/s/${publicChip.slug}`)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('property="og:image"')
    expect(html).toContain(`/s/${publicChip.slug}/poster.png`)
    expect(html).toContain('Ada &lt;Public&gt;')
  })

  it('returns 404 HTML for private or missing slugs', async () => {
    const { app, privateChip } = fixture()

    expect((await app.request(`/s/${privateChip.slug}`)).status).toBe(404)
    expect((await app.request('/s/not-a-real-slug')).status).toBe(404)
  })

  it('serves decoded PNG bytes for a public chip poster', async () => {
    const { app, publicChip } = fixture()

    const res = await app.request(`/s/${publicChip.slug}/poster.png`)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  it('returns 404 for private or missing poster requests', async () => {
    const { app, privateChip } = fixture()

    expect((await app.request(`/s/${privateChip.slug}/poster.png`)).status).toBe(404)
    expect((await app.request('/s/not-a-real-slug/poster.png')).status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace server -- shareRoutes`
Expected: FAIL — `/s/...` returns 404 from Hono (routes not mounted) / cannot find `../src/share/routes`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/share/routes.ts`:

```typescript
import { Hono } from 'hono'
import type { Project } from '@domain/project'
import type { AppDeps } from '../app'
import { getPublicPublishedChipBySlug } from '../publish/service'
import { resolvePublicBaseUrl } from './baseUrl'
import { decodePngDataUrl } from './poster'
import { renderNotFoundHtml, renderViewerHtml } from './viewer'

export function shareRoutes({ db, publicBaseUrl }: AppDeps) {
  const routes = new Hono()

  routes.get('/s/:slug/poster.png', (c) => {
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    const bytes = chip === null ? null : decodePngDataUrl(chip.posterImageDataUrl)
    if (bytes === null) return c.body(null, 404)
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
    })
  })

  routes.get('/s/:slug', (c) => {
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    if (chip === null) return c.html(renderNotFoundHtml({ baseUrl }), 404)
    const project = JSON.parse(chip.projectJson) as Project
    return c.html(
      renderViewerHtml({
        title: chip.title,
        ownerDisplayName: chip.ownerDisplayName,
        slug: chip.slug,
        project,
        baseUrl,
      }),
    )
  })

  return routes
}
```

Modify `server/src/app.ts`. Add `publicBaseUrl` to `AppDeps` and the import + mount:

```typescript
import type Database from 'better-sqlite3'
import { Hono } from 'hono'
import { CURRENT_SCHEMA_VERSION } from '@domain/project'
import { accountRoutes } from './accounts/routes'
import { publishRoutes } from './publish/routes'
import { shareRoutes } from './share/routes'

export type AppDeps = {
  db: Database.Database
  sessionSecret: string
  now?: () => number
  publicBaseUrl?: string
}

export function createApp(deps: AppDeps) {
  const app = new Hono()

  app.get('/api/health', (c) =>
    c.json({ ok: true, projectSchemaVersion: CURRENT_SCHEMA_VERSION }),
  )
  app.route('/api', accountRoutes(deps))
  app.route('/api', publishRoutes(deps))
  app.route('/', shareRoutes(deps))

  return app
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace server -- shareRoutes`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/share/routes.ts server/src/app.ts server/test/shareRoutes.test.ts
git commit -m "feat(server): mount /s/:slug share viewer + poster routes"
```

---

## Task 5: Public-only `shareUrl` in publish API

**Files:**
- Modify: `server/src/publish/routes.ts`
- Modify: `server/src/index.ts`
- Test: `server/test/publishRoutes.test.ts`

- [ ] **Step 1: Write the failing test**

Open `server/test/publishRoutes.test.ts`. Add this test inside the top-level `describe` block (reuse the file's existing signup/cookie helpers; the snippet below assumes the file already has a helper that signs up and returns a session cookie — match the existing pattern in that file for obtaining `cookie` and publishing a chip). Add:

```typescript
  it('returns a public-only absolute shareUrl', async () => {
    const { app } = createTestApp()
    const signup = await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP))
    const cookie = sessionCookie(signup)
    const project = createProject('Ada Chip', 'project-share', 1_000)
    const publishBody = {
      project,
      title: 'Ada Chip',
      dieImageDataUrl: 'data:image/png;base64,AAAA',
      posterImageDataUrl: 'data:image/png;base64,BBBB',
      isPublic: true,
    }

    const publicRes = await app.request('/api/published-chips', jsonRequest('POST', publishBody, cookie))
    const publicChip = ((await publicRes.json()) as { chip: { slug: string; shareUrl: string | null } }).chip
    expect(publicChip.shareUrl).toBe(`http://localhost/s/${publicChip.slug}`)

    const privateRes = await app.request(
      `/api/published-chips/source/${project.id}`,
      jsonRequest('PATCH', { isPublic: false }, cookie),
    )
    const privateChip = ((await privateRes.json()) as { chip: { shareUrl: string | null } }).chip
    expect(privateChip.shareUrl).toBeNull()
  })
```

Confirm the file's imports include `createProject`, `createTestApp`, `jsonRequest`, `sessionCookie`, `VALID_SIGNUP`. If any are missing, add them from `@domain/projectFactory` and `./helpers` (the file's existing tests already use this harness — follow them exactly).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace server -- publishRoutes`
Expected: FAIL — `shareUrl` is `undefined`, not the expected URL.

- [ ] **Step 3: Write minimal implementation**

Modify `server/src/publish/routes.ts`. Add the helper import at the top:

```typescript
import { buildShareUrl, resolvePublicBaseUrl } from '../share/baseUrl'
```

Change `serializePublishedChip` to take a base URL and emit `shareUrl`:

```typescript
function serializePublishedChip(chip: PublishedChip, baseUrl: string) {
  return {
    id: chip.id,
    ownerUserId: chip.ownerUserId,
    sourceProjectId: chip.sourceProjectId,
    slug: chip.slug,
    title: chip.title,
    dieImageUrl: chip.dieImageDataUrl,
    posterImageUrl: chip.posterImageDataUrl,
    isPublic: chip.isPublic,
    shareUrl: chip.isPublic ? buildShareUrl(baseUrl, chip.slug) : null,
    version: chip.version,
    createdAt: chip.createdAt,
    updatedAt: chip.updatedAt,
    publishedAt: chip.publishedAt,
  }
}
```

Destructure `publicBaseUrl` from deps and pass a per-request base URL at each `serializePublishedChip` call. Update the function signature line and the four call sites:

```typescript
export function publishRoutes({ db, sessionSecret, now = Date.now, publicBaseUrl }: AppDeps) {
```

In the `POST /published-chips` handler:

```typescript
    const existing = getPublishedChipForOwnerProject(db, user.id, input.value.project.id)
    const chip = upsertPublishedChip(db, user.id, input.value, now)
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    return c.json({ chip: serializePublishedChip(chip, baseUrl) }, existing === null ? 201 : 200)
```

In the `GET /published-chips/source/:sourceProjectId` handler:

```typescript
    const chip = getPublishedChipForOwnerProject(db, user.id, c.req.param('sourceProjectId'))
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ chip: serializePublishedChip(chip, resolvePublicBaseUrl(c.req.url, publicBaseUrl)) })
```

In the `PATCH /published-chips/source/:sourceProjectId` handler:

```typescript
    const chip = setPublishedChipVisibility(db, user.id, c.req.param('sourceProjectId'), body.isPublic, now)
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ chip: serializePublishedChip(chip, resolvePublicBaseUrl(c.req.url, publicBaseUrl)) })
```

(The `DELETE` handler returns 204 with no body — leave it unchanged. The gallery serializers `serializeGallerySummary`/`serializeGalleryDetail` stay unchanged — gallery does not surface `shareUrl`.)

Modify `server/src/index.ts` to pass the configured base from the environment. Change the `createApp` call:

```typescript
serve(
  {
    fetch: createApp({
      db,
      sessionSecret: sessionSecret || 'dev-insecure-session-secret',
      publicBaseUrl: process.env.VSL_PUBLIC_BASE_URL,
    }).fetch,
    port,
  },
  (info) => {
    console.log(`vsl server listening on http://127.0.0.1:${info.port}`)
  },
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace server -- publishRoutes`
Expected: PASS (existing tests + new shareUrl test).

- [ ] **Step 5: Run full server suite + typecheck**

Run: `npm run test --workspace server && npm run typecheck --workspace server`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add server/src/publish/routes.ts server/src/index.ts server/test/publishRoutes.test.ts
git commit -m "feat(server): expose public-only shareUrl on publish API"
```

---

## Task 6: Client `shareUrl` on the publish API type

**Files:**
- Modify: `src/features/publish/publishApi.ts`
- Test: `src/features/publish/publishApi.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/features/publish/publishApi.test.ts`, add `shareUrl` to the `chip` fixture object (line ~5-18) so it reads:

```typescript
const chip = {
  id: 'pub1',
  ownerUserId: 'u1',
  sourceProjectId: 'project-1',
  slug: 'ada-chip-deadbeef',
  title: 'Ada Chip',
  dieImageUrl: 'data:image/png;base64,AAAA',
  posterImageUrl: 'data:image/png;base64,BBBB',
  isPublic: false,
  shareUrl: null,
  version: 1,
  createdAt: 1_000,
  updatedAt: 1_000,
  publishedAt: 0,
}
```

Then add a focused test inside the `describe('livePublishApi', ...)` block:

```typescript
  it('surfaces the server shareUrl for a public chip', async () => {
    const publicChip = { ...chip, isPublic: true, shareUrl: 'http://localhost/s/ada-chip-deadbeef' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { chip: publicChip })))

    const result = await livePublishApi.getForProject('project-1')
    expect(result?.shareUrl).toBe('http://localhost/s/ada-chip-deadbeef')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- publishApi`
Expected: FAIL — TypeScript error: `shareUrl` does not exist on type `PublishedChip` (fixture/assertion don't compile).

- [ ] **Step 3: Write minimal implementation**

In `src/features/publish/publishApi.ts`, add `shareUrl` to the `PublishedChip` type:

```typescript
export type PublishedChip = {
  id: string
  ownerUserId: string
  sourceProjectId: string
  slug: string
  title: string
  dieImageUrl: string
  posterImageUrl: string
  isPublic: boolean
  shareUrl: string | null
  version: number
  createdAt: number
  updatedAt: number
  publishedAt: number
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- publishApi`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/publish/publishApi.ts src/features/publish/publishApi.test.ts
git commit -m "feat(client): add shareUrl to the publish API chip type"
```

---

## Task 7: PublishPanel copy-link UI

**Files:**
- Modify: `src/features/publish/PublishPanel.tsx`
- Test: `src/features/publish/PublishPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/features/publish/PublishPanel.test.tsx`, add `shareUrl: null` to the existing `chip` fixture (so it stays valid with the new type). Then add a test inside the `describe('PublishPanel', ...)` block:

```typescript
  it('shows the share link with a copy button for a public chip', async () => {
    const publicChip: PublishedChip = {
      ...chip,
      isPublic: true,
      shareUrl: 'http://localhost/s/ada-chip-deadbeef',
    }
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    const api = fakePublishApi({ getForProject: vi.fn().mockResolvedValue(publicChip) })
    renderPanel(fakeAuthApi(), api)

    const copyButton = await screen.findByRole('button', { name: /copy link/i })
    expect(screen.getByText('http://localhost/s/ada-chip-deadbeef')).toBeInTheDocument()

    await userEvent.click(copyButton)
    expect(writeText).toHaveBeenCalledWith('http://localhost/s/ada-chip-deadbeef')
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('hides the share link for a private chip', async () => {
    const api = fakePublishApi({ getForProject: vi.fn().mockResolvedValue(chip) })
    renderPanel(fakeAuthApi(), api)

    await screen.findByText(/published v1/i)
    expect(screen.queryByRole('button', { name: /copy link/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- PublishPanel`
Expected: FAIL — no "Copy Link" button is rendered.

- [ ] **Step 3: Write minimal implementation**

In `src/features/publish/PublishPanel.tsx`, add a copy handler and render the share-link row when the chip is public. Add this handler alongside the other actions (after `unpublish`):

```typescript
  async function copyShareLink() {
    const shareUrl = published?.shareUrl
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('Share link copied.')
    } catch {
      setMessage('Copy failed. Select and copy the link manually.')
    }
  }
```

Then, in the authenticated return block, insert a share-link row after the existing published-info `<div className="grid gap-2 text-sm ...">` block and before the `<div className="grid gap-2">` action buttons:

```tsx
      {published?.isPublic && published.shareUrl ? (
        <div className="grid gap-1 text-sm text-[var(--v2-muted)]">
          <p className="break-all text-cyan-100">{published.shareUrl}</p>
          <button type="button" className={buttonClass} onClick={copyShareLink} disabled={loading}>
            Copy Link
          </button>
        </div>
      ) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- PublishPanel`
Expected: PASS (existing PublishPanel tests + 2 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/publish/PublishPanel.tsx src/features/publish/PublishPanel.test.tsx
git commit -m "feat(client): copy share link from the PublishPanel for public chips"
```

---

## Task 8: Docs + full verification

**Files:**
- Modify: `implementation.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full suite + build**

Run: `npm test && npm run build`
Expected: client + server suites green; build succeeds (known Vite chunk warning is acceptable).

- [ ] **Step 2: Record the milestone in `implementation.md`**

Append a `## V3-M4 공유 링크 (2026-06-13)` section (Korean, matching the file's style) covering: server-rendered `/s/:slug` viewer + `/s/:slug/poster.png` byte endpoint reusing M3's public-only `getPublicPublishedChipBySlug`; OG/Twitter meta with absolute URLs via `VSL_PUBLIC_BASE_URL`-or-request-origin; HTML escaping of all user input; public-only `shareUrl` on the publish API; PublishPanel copy-link UI; data-URL trade-off and file-backed storage still deferred to M6. Note the final suite counts from Step 1.

- [ ] **Step 3: Update `CLAUDE.md` Milestone Status**

In the v3 milestone list, change the combined planned line to mark M4 done and leave M5/M6 planned:

```markdown
- **V3-M4 Share Links**: ✅ done — server-rendered `/s/:slug` viewer (public chips only) with escaped OG/Twitter meta + a `/s/:slug/poster.png` byte endpoint for crawler previews, absolute URLs via `VSL_PUBLIC_BASE_URL` or request origin, public-only `shareUrl` on the publish API, and a PublishPanel copy-link control. Plan: `docs/superpowers/plans/2026-06-13-v3-m4-share-links.md`.
- **V3-M5 Remix Import** · **V3-M6 Deploy Packaging & QA**: ⏳ planned (M6 owns rate limiting, Secure cookie flag, production secret enforcement, upload size limits, file-backed PNG storage, and the production `VSL_PUBLIC_BASE_URL`).
```

- [ ] **Step 4: Commit**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record V3-M4 share links milestone"
```

- [ ] **Step 5: Browser QA (acceptance gate)**

Run the dev servers (`npm run dev:server` and `npm run dev -- --host 127.0.0.1`), sign in, publish a chip publicly, then verify in a browser:
1. PublishPanel shows the share URL + Copy Link; clicking copies it.
2. Opening `http://127.0.0.1:8787/s/<slug>` renders the poster + spec; page source contains `og:image`/`twitter:card` absolute meta.
3. `http://127.0.0.1:8787/s/<slug>/poster.png` opens as a PNG.
4. Toggling the chip private makes `/s/<slug>` return the 404 page.
5. Stopping the server leaves local editing/save/export unaffected.

Record results in `implementation.md` (browser QA note).

---

## Self-Review Notes

- **Spec coverage:** viewer route (Task 4), OG meta + poster byte endpoint (Tasks 3–4), public-only gate (Tasks 3–4 reuse `getPublicPublishedChipBySlug`), absolute base URL via env/origin (Tasks 1, 4, 5), HTML escaping (Task 3), PublishPanel shareUrl copy (Tasks 6–7), tests at every layer, docs + browser QA gate (Task 8). All spec sections map to a task.
- **Type consistency:** `resolvePublicBaseUrl`/`buildShareUrl`/`decodePngDataUrl`/`escapeHtml`/`renderViewerHtml`/`renderNotFoundHtml`/`shareRoutes` names are used identically across tasks; `AppDeps.publicBaseUrl` and `PublishedChip.shareUrl` introduced once and consumed consistently.
- **Out of scope (unchanged here):** remix import (M5); file-backed images, rate limiting, Secure cookie, production domain (M6); gallery-detail copy button.
