# V4-M1 Reactions (Likes + Comments + Report Button) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let logged-in users react to public gallery chips with likes, flat comments, and a report button (wired to M0's existing `POST /api/reports`), adding the first community interaction on top of v4-M0's moderation infrastructure.

**Architecture:** A new `005_reactions` migration adds `likes` + `comments` tables (both CASCADE on chip and user delete). A new `server/src/reactions/` module holds the like/comment service + routes, mounted under `/api` and reusing M0's session/admin helpers. The public gallery queries gain `likeCount`/`commentCount`, and the gallery detail route adds an optional session read to compute `likedByMe`. The client gets a `reactionsApi` and like/comment/report UI on the gallery detail page plus a like count on grid cards. Reactions touch only server-side published data — local-first is untouched.

**Tech Stack:** Hono · better-sqlite3 (no ORM) · Vitest (node) for server; React + TypeScript · vanilla Zustand · Vitest + RTL for client.

**Spec:** `docs/superpowers/specs/2026-06-14-v4-m1-reactions-design.md`

**Conventions reminder:** TDD (failing test → minimal code → pass → commit), one concern per commit, Vitest with explicit `import { describe, expect, it } from 'vitest'` (no globals), server integration tests use the in-memory SQLite helper in `server/test/helpers.ts` (`createTestApp` returns `{ app, db }`), React pages are browser-verified not unit-tested. Error codes are UPPER_SNAKE; error body shape is `{ error: { code, message } }`. Run `npm test` (client then server) and `npm run build` after the implementation tasks. Branch: `v4-community` (already checked out — do NOT create a branch).

---

## File Structure

**Server — create:**
- `server/src/reactions/service.ts` — likes (`isChipReactable`, `likeChip`, `unlikeChip`, `countLikes`, `hasUserLiked`, `getLikeState`) + comments (`createComment`, `listComments`, `getCommentMeta`, `deleteComment`) with row types/mappers.
- `server/src/reactions/routes.ts` — like/comment endpoints, mounted at `/api`.
- Tests: `server/test/reactionsMigration.test.ts`, `server/test/reactionsService.test.ts`, `server/test/reactionsRoutes.test.ts`, `server/test/galleryReactionCounts.test.ts`.

**Server — modify:**
- `server/src/migrations.ts` — append `005_reactions`.
- `server/src/app.ts` — mount `reactionsRoutes(deps)`.
- `server/src/publish/service.ts` — gallery queries compute `like_count`/`comment_count`; `PublicGalleryChip` gains `likeCount`/`commentCount`.
- `server/src/publish/routes.ts` — gallery detail reads optional session → `likedByMe`; summary + detail serializers expose counts.

**Client — create:**
- `src/features/gallery/reactionsApi.ts` — like/unlike, comment list/create/delete, report-chip client.
- Test: `src/features/gallery/reactionsApi.test.ts`.

**Client — modify:**
- `src/features/gallery/galleryApi.ts` — `GalleryChipSummary` gains `likeCount`; `GalleryChipDetail` gains `likedByMe`/`commentCount`.
- `src/features/gallery/GalleryDetailPage.tsx` — like button, report button, comment thread; reads `useAuthStore`.
- `src/features/gallery/GalleryPage.tsx` — like count on grid cards.

---

## Task 1: `005_reactions` migration

**Files:**
- Modify: `server/src/migrations.ts`
- Test: `server/test/reactionsMigration.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `server/test/reactionsMigration.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'

describe('005_reactions migration', () => {
  function tableColumns(db: ReturnType<typeof openDatabase>, table: string): string[] {
    return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
  }

  it('creates likes and comments tables', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    expect(tableColumns(db, 'likes').sort()).toEqual(['created_at', 'published_chip_id', 'user_id'])
    expect(tableColumns(db, 'comments')).toContain('body')
  })

  it('enforces one like per user per chip via the composite primary key', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('u1', 'a@b.c', 'A', 'h', 0, 0)
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, created_at, updated_at)
       VALUES ('c1','u1','p1','s1','T','{}','','',1,0,0)`,
    ).run()
    db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run('c1', 'u1', 1)
    expect(() =>
      db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run('c1', 'u1', 2),
    ).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- reactionsMigration`
Expected: FAIL — `no such table: likes` / `no such table: comments`.

- [ ] **Step 3: Write minimal implementation**

Append to the `migrations` array in `server/src/migrations.ts`, AFTER the `004_moderation` entry:

```ts
  {
    id: '005_reactions',
    up: (db) => {
      db.exec(`
        CREATE TABLE likes (
          published_chip_id TEXT NOT NULL REFERENCES published_chips(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (published_chip_id, user_id)
        );
        CREATE INDEX idx_likes_user ON likes(user_id);
        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          published_chip_id TEXT NOT NULL REFERENCES published_chips(id) ON DELETE CASCADE,
          author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_comments_chip ON comments(published_chip_id, created_at);
      `)
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- reactionsMigration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/migrations.ts server/test/reactionsMigration.test.ts
git commit -m "feat(server): add 005_reactions migration (likes + comments tables)"
```

---

## Task 2: Reactions service — likes

**Files:**
- Create: `server/src/reactions/service.ts`
- Test: `server/test/reactionsService.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `server/test/reactionsService.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { getLikeState, isChipReactable, likeChip, unlikeChip } from '../src/reactions/service'

function seed(db: ReturnType<typeof openDatabase>, opts: { isPublic?: number; hidden?: boolean } = {}) {
  const isPublic = opts.isPublic ?? 1
  const status = opts.hidden ? 'hidden' : 'visible'
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run('u1', 'a@b.c', 'Ada', 'h', 0, 0)
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run('u2', 'b@b.c', 'Bea', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at)
     VALUES ('c1','u1','p1','s1','T','{}','','',?,?,0,0)`,
  ).run(isPublic, status)
}

describe('reactions service — likes', () => {
  it('reports a public visible chip as reactable, hidden/private as not', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    expect(isChipReactable(db, 'c1')).toBe(true)
    expect(isChipReactable(db, 'missing')).toBe(false)
  })

  it('hidden and private chips are not reactable', () => {
    const dbH = openDatabase(':memory:')
    runMigrations(dbH, migrations)
    seed(dbH, { hidden: true })
    expect(isChipReactable(dbH, 'c1')).toBe(false)
    const dbP = openDatabase(':memory:')
    runMigrations(dbP, migrations)
    seed(dbP, { isPublic: 0 })
    expect(isChipReactable(dbP, 'c1')).toBe(false)
  })

  it('likes are idempotent and counted; unlike removes', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    likeChip(db, 'c1', 'u1', () => 5)
    likeChip(db, 'c1', 'u1', () => 6) // idempotent — still one
    likeChip(db, 'c1', 'u2', () => 7)
    expect(getLikeState(db, 'c1', 'u1')).toEqual({ likeCount: 2, likedByMe: true })
    expect(getLikeState(db, 'c1', null)).toEqual({ likeCount: 2, likedByMe: false })
    unlikeChip(db, 'c1', 'u1')
    expect(getLikeState(db, 'c1', 'u1')).toEqual({ likeCount: 1, likedByMe: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- reactionsService`
Expected: FAIL — module `reactions/service` not found.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/reactions/service.ts`:

```ts
import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'

export type LikeState = { likeCount: number; likedByMe: boolean }

export type Comment = {
  id: string
  publishedChipId: string
  authorUserId: string
  authorDisplayName: string
  body: string
  createdAt: number
}

export function isChipReactable(db: Database.Database, chipId: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM published_chips WHERE id = ? AND is_public = 1 AND moderation_status = 'visible'")
    .get(chipId)
  return row !== undefined
}

export function likeChip(db: Database.Database, chipId: string, userId: string, now: () => number): void {
  db.prepare(
    'INSERT OR IGNORE INTO likes (published_chip_id, user_id, created_at) VALUES (?, ?, ?)',
  ).run(chipId, userId, now())
}

export function unlikeChip(db: Database.Database, chipId: string, userId: string): void {
  db.prepare('DELETE FROM likes WHERE published_chip_id = ? AND user_id = ?').run(chipId, userId)
}

export function countLikes(db: Database.Database, chipId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM likes WHERE published_chip_id = ?').get(chipId) as { n: number }).n
}

export function hasUserLiked(db: Database.Database, chipId: string, userId: string): boolean {
  return (
    db.prepare('SELECT 1 FROM likes WHERE published_chip_id = ? AND user_id = ?').get(chipId, userId) !== undefined
  )
}

export function getLikeState(db: Database.Database, chipId: string, userId: string | null): LikeState {
  return {
    likeCount: countLikes(db, chipId),
    likedByMe: userId === null ? false : hasUserLiked(db, chipId, userId),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- reactionsService`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/reactions/service.ts server/test/reactionsService.test.ts
git commit -m "feat(server): reactions service for likes (toggle, count, like state)"
```

---

## Task 3: Reactions service — comments

**Files:**
- Modify: `server/src/reactions/service.ts`
- Test: `server/test/reactionsService.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `server/test/reactionsService.test.ts` (and add the imports `createComment, deleteComment, getCommentMeta, listComments` to the existing import line from `../src/reactions/service`):

```ts
describe('reactions service — comments', () => {
  it('creates, lists (with author name, oldest first), and deletes comments', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const first = createComment(db, { publishedChipId: 'c1', authorUserId: 'u1', body: 'nice' }, () => 10)
    createComment(db, { publishedChipId: 'c1', authorUserId: 'u2', body: 'cool' }, () => 20)
    const list = listComments(db, 'c1')
    expect(list).toHaveLength(2)
    expect(list[0].body).toBe('nice')
    expect(list[0].authorDisplayName).toBe('Ada')
    expect(list[1].authorDisplayName).toBe('Bea')

    const meta = getCommentMeta(db, first.id)
    expect(meta).toEqual({ id: first.id, publishedChipId: 'c1', authorUserId: 'u1' })
    expect(getCommentMeta(db, 'nope')).toBeNull()

    expect(deleteComment(db, first.id)).toBe(true)
    expect(listComments(db, 'c1')).toHaveLength(1)
    expect(deleteComment(db, first.id)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- reactionsService`
Expected: FAIL — `createComment`/`listComments`/`getCommentMeta`/`deleteComment` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `server/src/reactions/service.ts`:

```ts
type CommentRow = {
  id: string
  published_chip_id: string
  author_user_id: string
  author_display_name: string
  body: string
  created_at: number
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    publishedChipId: row.published_chip_id,
    authorUserId: row.author_user_id,
    authorDisplayName: row.author_display_name,
    body: row.body,
    createdAt: row.created_at,
  }
}

export function createComment(
  db: Database.Database,
  input: { publishedChipId: string; authorUserId: string; body: string },
  now: () => number,
): Comment {
  const id = randomUUID()
  db.prepare(
    'INSERT INTO comments (id, published_chip_id, author_user_id, body, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, input.publishedChipId, input.authorUserId, input.body, now())
  return toComment(
    db
      .prepare(
        `SELECT c.*, u.display_name AS author_display_name
         FROM comments c JOIN users u ON u.id = c.author_user_id WHERE c.id = ?`,
      )
      .get(id) as CommentRow,
  )
}

export function listComments(db: Database.Database, chipId: string, limit = 200): Comment[] {
  const rows = db
    .prepare(
      `SELECT c.*, u.display_name AS author_display_name
       FROM comments c JOIN users u ON u.id = c.author_user_id
       WHERE c.published_chip_id = ?
       ORDER BY c.created_at ASC
       LIMIT ?`,
    )
    .all(chipId, limit) as CommentRow[]
  return rows.map(toComment)
}

export function getCommentMeta(
  db: Database.Database,
  commentId: string,
): { id: string; publishedChipId: string; authorUserId: string } | null {
  const row = db
    .prepare('SELECT id, published_chip_id, author_user_id FROM comments WHERE id = ?')
    .get(commentId) as { id: string; published_chip_id: string; author_user_id: string } | undefined
  return row === undefined
    ? null
    : { id: row.id, publishedChipId: row.published_chip_id, authorUserId: row.author_user_id }
}

export function deleteComment(db: Database.Database, commentId: string): boolean {
  return db.prepare('DELETE FROM comments WHERE id = ?').run(commentId).changes > 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- reactionsService`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/reactions/service.ts server/test/reactionsService.test.ts
git commit -m "feat(server): reactions service for flat comments (create, list, delete)"
```

---

## Task 4: Reactions routes — likes

**Files:**
- Create: `server/src/reactions/routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/reactionsRoutes.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `server/test/reactionsRoutes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

const OPTS = { signupsOpen: true, adminEmails: ['ada@example.com'] }

function seedChip(db: Database.Database, id: string, slug: string, hidden = false) {
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(`owner-${id}`, `${id}@owner.c`, 'Owner', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,0,0)`,
  ).run(id, `owner-${id}`, `proj-${id}`, slug, 'Seed', '{}', '', '', hidden ? 'hidden' : 'visible')
}

async function signIn(app: ReturnType<typeof createTestApp>['app'], creds: object): Promise<string> {
  return sessionCookie(await app.request('/api/auth/signup', jsonRequest('POST', creds)))
}

describe('reactions routes — likes', () => {
  it('requires auth to like', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const res = await app.request('/api/published-chips/c1/like', { method: 'POST' })
    expect(res.status).toBe(401)
  })

  it('likes and unlikes a visible chip, returning the count', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const cookie = await signIn(app, VALID_SIGNUP)
    const liked = await app.request('/api/published-chips/c1/like', { method: 'POST', headers: { cookie } })
    expect(liked.status).toBe(200)
    expect(await liked.json()).toEqual({ likeCount: 1, likedByMe: true })
    const unliked = await app.request('/api/published-chips/c1/like', { method: 'DELETE', headers: { cookie } })
    expect(await unliked.json()).toEqual({ likeCount: 0, likedByMe: false })
  })

  it('returns 404 when liking a hidden or missing chip', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'hidden1', 'sh', true)
    const cookie = await signIn(app, VALID_SIGNUP)
    expect((await app.request('/api/published-chips/hidden1/like', { method: 'POST', headers: { cookie } })).status).toBe(404)
    expect((await app.request('/api/published-chips/nope/like', { method: 'POST', headers: { cookie } })).status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- reactionsRoutes`
Expected: FAIL — routes not mounted; 404 for everything (including the like path itself).

- [ ] **Step 3: Write minimal implementation**

Create `server/src/reactions/routes.ts`:

```ts
import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AppDeps } from '../app'
import { getSessionUser, type AccountUser } from '../accounts/service'
import { isAdminEmail } from '../moderation/adminAuth'
import {
  createComment,
  deleteComment,
  getCommentMeta,
  getLikeState,
  isChipReactable,
  likeChip,
  listComments,
  unlikeChip,
} from './service'

const SESSION_COOKIE = 'vsl_session'
type ErrorStatus = 400 | 401 | 403 | 404
const MAX_COMMENT_LENGTH = 1000

export function reactionsRoutes({ db, sessionSecret, now = Date.now, adminEmails = [] }: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: ErrorStatus, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  async function readUser(c: Context): Promise<AccountUser | null> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') return null
    return getSessionUser(db, token, now)
  }

  routes.post('/published-chips/:id/like', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    likeChip(db, chipId, user.id, now)
    return c.json(getLikeState(db, chipId, user.id))
  })

  routes.delete('/published-chips/:id/like', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    unlikeChip(db, chipId, user.id)
    return c.json(getLikeState(db, chipId, user.id))
  })

  return routes
}
```

In `server/src/app.ts`:
- Import: `import { reactionsRoutes } from './reactions/routes'`.
- After `app.route('/api', moderationRoutes(deps))` add: `app.route('/api', reactionsRoutes(deps))`.

> Note: `isAdminEmail`, `createComment`, `deleteComment`, `getCommentMeta`, `listComments`, and `MAX_COMMENT_LENGTH` are imported now but used by the comment endpoints added in Task 5. If your linter fails the build on unused imports, add the comment routes (Task 5) in the same session before running the full build; the per-task server test run (`vitest`) does not fail on unused imports. To keep Task 4 self-contained, you may instead import only what likes need here and add the comment imports in Task 5 — either is fine.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- reactionsRoutes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/reactions/routes.ts server/src/app.ts server/test/reactionsRoutes.test.ts
git commit -m "feat(server): reactions routes for like/unlike"
```

---

## Task 5: Reactions routes — comments

**Files:**
- Modify: `server/src/reactions/routes.ts`
- Test: `server/test/reactionsRoutes.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `server/test/reactionsRoutes.test.ts`:

```ts
describe('reactions routes — comments', () => {
  it('lists comments publicly and requires auth to post', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const list = await app.request('/api/published-chips/c1/comments')
    expect(list.status).toBe(200)
    expect(await list.json()).toEqual({ comments: [] })
    const anon = await app.request('/api/published-chips/c1/comments', jsonRequest('POST', { body: 'hi' }))
    expect(anon.status).toBe(401)
  })

  it('rejects empty and over-long comment bodies', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const cookie = await signIn(app, VALID_SIGNUP)
    expect((await app.request('/api/published-chips/c1/comments', jsonRequest('POST', { body: '' }, cookie))).status).toBe(400)
    const long = 'x'.repeat(1001)
    expect((await app.request('/api/published-chips/c1/comments', jsonRequest('POST', { body: long }, cookie))).status).toBe(400)
  })

  it('creates a comment that appears in the list', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const cookie = await signIn(app, VALID_SIGNUP)
    const created = await app.request('/api/published-chips/c1/comments', jsonRequest('POST', { body: 'great chip' }, cookie))
    expect(created.status).toBe(201)
    const list = (await (await app.request('/api/published-chips/c1/comments')).json()) as { comments: { body: string }[] }
    expect(list.comments).toHaveLength(1)
    expect(list.comments[0].body).toBe('great chip')
  })

  it('lets the author delete, blocks other non-admins (403), allows admin', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'c1', 's1')
    const adminCookie = await signIn(app, VALID_SIGNUP) // ada@example.com is admin
    const eveCookie = await signIn(app, { email: 'eve@example.com', displayName: 'Eve', password: 'hunter22hunter22' })

    // Eve posts a comment
    const created = await app.request('/api/published-chips/c1/comments', jsonRequest('POST', { body: 'mine' }, eveCookie))
    const { comment } = (await created.json()) as { comment: { id: string } }

    // A third non-admin user cannot delete it
    const malCookie = await signIn(app, { email: 'mal@example.com', displayName: 'Mal', password: 'hunter22hunter22' })
    expect((await app.request(`/api/published-chips/c1/comments/${comment.id}`, { method: 'DELETE', headers: { cookie: malCookie } })).status).toBe(403)

    // Admin can delete it
    expect((await app.request(`/api/published-chips/c1/comments/${comment.id}`, { method: 'DELETE', headers: { cookie: adminCookie } })).status).toBe(204)
  })

  it('returns 404 commenting on a hidden chip', async () => {
    const { app, db } = createTestApp(Date.now, OPTS)
    seedChip(db, 'h1', 'sh', true)
    const cookie = await signIn(app, VALID_SIGNUP)
    expect((await app.request('/api/published-chips/h1/comments', jsonRequest('POST', { body: 'hi' }, cookie))).status).toBe(404)
    expect((await app.request('/api/published-chips/h1/comments')).status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- reactionsRoutes`
Expected: FAIL — comment endpoints return 404 (not defined).

- [ ] **Step 3: Write minimal implementation**

In `server/src/reactions/routes.ts`, add these route handlers before `return routes` (the imports from Task 4 already include everything needed):

```ts
  routes.get('/published-chips/:id/comments', (c) => {
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    return c.json({ comments: listComments(db, chipId) })
  })

  routes.post('/published-chips/:id/comments', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const chipId = c.req.param('id')
    if (!isChipReactable(db, chipId)) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
    const text = typeof body?.body === 'string' ? body.body.trim() : ''
    if (text === '' || text.length > MAX_COMMENT_LENGTH) {
      return fail(c, 400, 'INVALID_INPUT', `body must be 1 to ${MAX_COMMENT_LENGTH} characters.`)
    }
    const comment = createComment(db, { publishedChipId: chipId, authorUserId: user.id, body: text }, now)
    return c.json({ comment }, 201)
  })

  routes.delete('/published-chips/:id/comments/:commentId', async (c) => {
    const user = await readUser(c)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    const meta = getCommentMeta(db, c.req.param('commentId'))
    if (meta === null || meta.publishedChipId !== c.req.param('id')) {
      return fail(c, 404, 'NOT_FOUND', 'Comment not found.')
    }
    const isAuthor = meta.authorUserId === user.id
    if (!isAuthor && !isAdminEmail(user.email, adminEmails)) {
      return fail(c, 403, 'FORBIDDEN', 'You can only delete your own comments.')
    }
    deleteComment(db, meta.id)
    return c.body(null, 204)
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- reactionsRoutes`
Then: `npm run typecheck --workspace server` (confirms no unused-import errors from Task 4).
Expected: all PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add server/src/reactions/routes.ts server/test/reactionsRoutes.test.ts
git commit -m "feat(server): reactions routes for comment list/create/delete"
```

---

## Task 6: Gallery queries expose like/comment counts

**Files:**
- Modify: `server/src/publish/service.ts`
- Test: `server/test/galleryReactionCounts.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `server/test/galleryReactionCounts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { openDatabase, runMigrations } from '../src/db'
import { migrations } from '../src/migrations'
import { getPublicPublishedChipBySlug, listPublicPublishedChips } from '../src/publish/service'

function seed(db: ReturnType<typeof openDatabase>) {
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run('u1', 'a@b.c', 'Ada', 'h', 0, 0)
  db.prepare(
    `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
     VALUES ('c1','u1','p1','s1','T','{}','','',1,'visible',1,1,1)`,
  ).run()
  db.prepare('INSERT INTO likes (published_chip_id, user_id, created_at) VALUES (?,?,?)').run('c1', 'u1', 1)
  db.prepare('INSERT INTO comments (id, published_chip_id, author_user_id, body, created_at) VALUES (?,?,?,?,?)')
    .run('cm1', 'c1', 'u1', 'hi', 1)
}

describe('gallery reaction counts', () => {
  it('includes likeCount on summaries and likeCount + commentCount on detail', () => {
    const db = openDatabase(':memory:')
    runMigrations(db, migrations)
    seed(db)
    const summary = listPublicPublishedChips(db)[0]
    expect(summary.likeCount).toBe(1)
    const detail = getPublicPublishedChipBySlug(db, 's1')
    expect(detail?.likeCount).toBe(1)
    expect(detail?.commentCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- galleryReactionCounts`
Expected: FAIL — `likeCount`/`commentCount` undefined on the results.

- [ ] **Step 3: Write minimal implementation**

In `server/src/publish/service.ts`:

1. Add to the `PublicGalleryChip` type (after `ownerDisplayName`): `likeCount: number` and `commentCount: number`.
2. Add to `PublicGalleryChipRow`: `like_count: number` and `comment_count: number`.
3. In `toPublicGalleryChip`, add `likeCount: row.like_count,` and `commentCount: row.comment_count,` to the returned object.
4. Change `listPublicPublishedChips`'s SELECT to include the counts:

```ts
      `SELECT p.*, u.display_name AS owner_display_name,
              (SELECT COUNT(*) FROM likes l WHERE l.published_chip_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.published_chip_id = p.id) AS comment_count
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.is_public = 1 AND p.moderation_status = 'visible'
       ORDER BY p.updated_at DESC
       LIMIT ?`,
```

5. Change `getPublicPublishedChipBySlug`'s SELECT the same way:

```ts
      `SELECT p.*, u.display_name AS owner_display_name,
              (SELECT COUNT(*) FROM likes l WHERE l.published_chip_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.published_chip_id = p.id) AS comment_count
       FROM published_chips p
       JOIN users u ON u.id = p.owner_user_id
       WHERE p.slug = ? AND p.is_public = 1 AND p.moderation_status = 'visible'`,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- galleryReactionCounts galleryModeration galleryRoutes`
Expected: all PASS (existing gallery tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add server/src/publish/service.ts server/test/galleryReactionCounts.test.ts
git commit -m "feat(server): expose like/comment counts on public gallery queries"
```

---

## Task 7: Gallery routes serialize counts + likedByMe

**Files:**
- Modify: `server/src/publish/routes.ts`
- Test: `server/test/galleryRoutes.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `server/test/galleryRoutes.test.ts` (reuse its existing imports/helpers; if it doesn't already seed a public chip + a logged-in user, add a local seed like the one below). Add:

```ts
describe('gallery reaction fields', () => {
  it('summary carries likeCount; detail carries likeCount, commentCount, and likedByMe', async () => {
    const { app, db } = createTestApp(Date.now, { signupsOpen: true, adminEmails: [] })
    db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('owner', 'o@o.c', 'Owner', 'h', 0, 0)
    db.prepare(
      `INSERT INTO published_chips (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
       VALUES ('c1','owner','p1','s1','T','{}','','',1,'visible',1,1,1)`,
    ).run()

    const cookie = sessionCookie(await app.request('/api/auth/signup', jsonRequest('POST', VALID_SIGNUP)))
    await app.request('/api/published-chips/c1/like', { method: 'POST', headers: { cookie } })

    const summary = (await (await app.request('/api/gallery')).json()) as { chips: { likeCount: number }[] }
    expect(summary.chips[0].likeCount).toBe(1)

    const anonDetail = (await (await app.request('/api/gallery/s1')).json()) as { chip: { likeCount: number; commentCount: number; likedByMe: boolean } }
    expect(anonDetail.chip.likeCount).toBe(1)
    expect(anonDetail.chip.commentCount).toBe(0)
    expect(anonDetail.chip.likedByMe).toBe(false)

    const authedDetail = (await (await app.request('/api/gallery/s1', { headers: { cookie } })).json()) as { chip: { likedByMe: boolean } }
    expect(authedDetail.chip.likedByMe).toBe(true)
  })
})
```

> If `galleryRoutes.test.ts` does not already import `sessionCookie`/`VALID_SIGNUP`/`jsonRequest`, add them to its import from `./helpers`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- galleryRoutes`
Expected: FAIL — `likeCount`/`commentCount`/`likedByMe` missing from serialized gallery JSON.

- [ ] **Step 3: Write minimal implementation**

In `server/src/publish/routes.ts`:

1. Add imports at the top: `import { getSignedCookie } from 'hono/cookie'` (if not already imported — it is used by `readUser` already, so reuse it), and `import { getLikeState } from '../reactions/service'`.
2. In `serializeGallerySummary`, add `likeCount: chip.likeCount,` to the returned object.
3. Change `serializeGalleryDetail` to accept the extra fields and add them. Replace it with:

```ts
function serializeGalleryDetail(chip: PublicGalleryChip, baseUrl: string, likedByMe: boolean) {
  return {
    ...serializeGallerySummary(chip, baseUrl),
    commentCount: chip.commentCount,
    likedByMe,
    project: JSON.parse(chip.projectJson) as unknown,
  }
}
```

4. The `publishRoutes` factory already destructures `db`, `sessionSecret`, `now`. It also already has a `readUser(c)` helper. In the `GET /gallery/:slug` handler, compute `likedByMe`:

```ts
  routes.get('/gallery/:slug', async (c) => {
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    if (chip === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    const user = await readUser(c)
    const likedByMe = user === null ? false : getLikeState(db, chip.id, user.id).likedByMe
    return c.json({ chip: serializeGalleryDetail(chip, resolvePublicBaseUrl(c.req.url, publicBaseUrl), likedByMe) })
  })
```

> Note: the existing `/gallery/:slug` handler is currently a synchronous `(c) => {...}`; make it `async (c) => {...}` as shown. `readUser` already exists in this file (used by the publish endpoints) and returns `AccountUser | null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- galleryRoutes`
Then full server suite: `npm test --workspace server`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/publish/routes.ts server/test/galleryRoutes.test.ts
git commit -m "feat(server): serialize like/comment counts and likedByMe on gallery API"
```

---

## Task 8: Client galleryApi types + reactionsApi client

**Files:**
- Modify: `src/features/gallery/galleryApi.ts`
- Create: `src/features/gallery/reactionsApi.ts`
- Test: `src/features/gallery/reactionsApi.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/features/gallery/reactionsApi.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from 'vitest'
import { liveReactionsApi } from './reactionsApi'

afterEach(() => vi.restoreAllMocks())

describe('reactionsApi', () => {
  it('likes a chip and returns the like state', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ likeCount: 3, likedByMe: true }), { status: 200 }))
    const state = await liveReactionsApi.like('chip1')
    expect(state).toEqual({ likeCount: 3, likedByMe: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/published-chips/chip1/like', expect.objectContaining({ method: 'POST' }))
  })

  it('lists comments', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ comments: [{ id: 'c1' }] }), { status: 200 }),
    )
    expect(await liveReactionsApi.listComments('chip1')).toEqual([{ id: 'c1' }])
  })

  it('throws on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'no' } }), { status: 401 }),
    )
    await expect(liveReactionsApi.createComment('chip1', 'hi')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- reactionsApi`
Expected: FAIL — module `reactionsApi` not found.

- [ ] **Step 3: Write minimal implementation**

First, in `src/features/gallery/galleryApi.ts`, extend the types:
- Add `likeCount: number` to `GalleryChipSummary` (after `publishedAt`).
- `GalleryChipDetail` currently is `GalleryChipSummary & { project: Project }`. Change it to:

```ts
export type GalleryChipDetail = GalleryChipSummary & {
  commentCount: number
  likedByMe: boolean
  project: Project
}
```

Then create `src/features/gallery/reactionsApi.ts`:

```ts
export type LikeState = { likeCount: number; likedByMe: boolean }

export type GalleryComment = {
  id: string
  publishedChipId: string
  authorUserId: string
  authorDisplayName: string
  body: string
  createdAt: number
}

export type ReactionsApi = {
  like: (chipId: string) => Promise<LikeState>
  unlike: (chipId: string) => Promise<LikeState>
  listComments: (chipId: string) => Promise<GalleryComment[]>
  createComment: (chipId: string, body: string) => Promise<GalleryComment>
  deleteComment: (chipId: string, commentId: string) => Promise<void>
  reportChip: (chipId: string, reason: string) => Promise<void>
}

async function ok(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `Request failed (${res.status}).`)
  }
  return res
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export const liveReactionsApi: ReactionsApi = {
  async like(chipId) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/like`, { method: 'POST' }))
    return (await res.json()) as LikeState
  },
  async unlike(chipId) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/like`, { method: 'DELETE' }))
    return (await res.json()) as LikeState
  },
  async listComments(chipId) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/comments`, { method: 'GET' }))
    return ((await res.json()) as { comments: GalleryComment[] }).comments
  },
  async createComment(chipId, body) {
    const res = await ok(await fetch(`/api/published-chips/${chipId}/comments`, jsonInit('POST', { body })))
    return ((await res.json()) as { comment: GalleryComment }).comment
  },
  async deleteComment(chipId, commentId) {
    await ok(await fetch(`/api/published-chips/${chipId}/comments/${commentId}`, { method: 'DELETE' }))
  },
  async reportChip(chipId, reason) {
    await ok(await fetch('/api/reports', jsonInit('POST', { publishedChipId: chipId, reason })))
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- reactionsApi`
Then: `npm run build` (confirms the `GalleryChipDetail` type change typechecks against existing consumers).
Expected: PASS / build green (known chunk warning only). If the build flags that `GalleryDetailPage`'s mock/fixtures in `GalleryDetailPage.test.tsx` now miss `likeCount`/`commentCount`/`likedByMe`, that is handled in Task 9 — but if the build (tsc) fails now, add the three fields to those fixtures minimally as part of this task.

- [ ] **Step 5: Commit**

```bash
git add src/features/gallery/galleryApi.ts src/features/gallery/reactionsApi.ts src/features/gallery/reactionsApi.test.ts
git commit -m "feat(client): reactions API client and gallery reaction-count types"
```

---

## Task 9: Gallery detail — like button + report button

**Files:**
- Modify: `src/features/gallery/GalleryDetailPage.tsx`
- Test: existing `src/features/gallery/GalleryDetailPage.test.tsx` (update fixtures only)

- [ ] **Step 1: Inspect + update test fixtures**

READ `src/features/gallery/GalleryDetailPage.test.tsx`. Every fake `GalleryChipDetail` it constructs now needs `likeCount`, `commentCount`, and `likedByMe`. Add those three fields (e.g. `likeCount: 0, commentCount: 0, likedByMe: false`) to each fixture so the file typechecks. Do not change the existing assertions.

- [ ] **Step 2: Run the existing test to confirm it still passes with updated fixtures**

Run: `npm run test:client -- GalleryDetailPage`
Expected: PASS (fixtures compile; behavior unchanged).

- [ ] **Step 3: Implement like + report UI**

In `src/features/gallery/GalleryDetailPage.tsx`:
- Add imports:

```tsx
import { useAuthStore } from '../../stores/authStoreContext'
import { liveReactionsApi, type ReactionsApi } from './reactionsApi'
```

- Add `reactions` to `Props` (injectable, defaults to live):

```tsx
type Props = {
  api?: GalleryApi
  reactions?: ReactionsApi
  onProjectLoaded?: (project: Project) => void
  onRemix?: (project: Project) => void
}
```

and destructure `reactions = liveReactionsApi` in the function signature.

- Inside the component (top, with the other hooks), read auth and hold like/report state:

```tsx
  const auth = useAuthStore()
  const isLoggedIn = auth.status === 'authenticated'
  const [likeState, setLikeState] = useState<{ likeCount: number; likedByMe: boolean } | null>(null)
  const [reported, setReported] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
```

- When the chip loads (in the existing `.then` where `setChip(nextChip)` runs), also seed like state:

```tsx
          setChip(nextChip)
          setLikeState({ likeCount: nextChip.likeCount, likedByMe: nextChip.likedByMe })
          onProjectLoaded?.(nextChip.project)
```

- In the success render (the final `return` with the hero section), after the "Remix into my projects" button add a like + report cluster. Use the loaded `chip.id`:

```tsx
          {likeState !== null && (
            <div className="gallery-detail__reactions">
              <button
                type="button"
                className="v2-inline-action"
                disabled={!isLoggedIn}
                onClick={() => {
                  const op = likeState.likedByMe ? reactions.unlike(chip.id) : reactions.like(chip.id)
                  op.then(setLikeState).catch((e) => setActionError(e instanceof Error ? e.message : 'Action failed.'))
                }}
              >
                {likeState.likedByMe ? '♥' : '♡'} {likeState.likeCount}
              </button>
              <button
                type="button"
                className="v2-inline-action"
                disabled={!isLoggedIn || reported}
                onClick={() => {
                  reactions
                    .reportChip(chip.id, 'Reported from gallery')
                    .then(() => setReported(true))
                    .catch((e) => setActionError(e instanceof Error ? e.message : 'Action failed.'))
                }}
              >
                {reported ? 'Reported' : 'Report'}
              </button>
              {!isLoggedIn && <span className="gallery-detail__hint">Sign in to react.</span>}
              {actionError !== null && <span role="alert">{actionError}</span>}
            </div>
          )}
```

> `chip` in this scope is the loaded `GalleryChipDetail` (the early returns above handle the non-loaded states), so `chip.id` is valid. `useState` is already imported in this file.

- [ ] **Step 4: Verify**

Run: `npm run test:client -- GalleryDetailPage`
Run: `npm run build`
Expected: PASS / build green.

- [ ] **Step 5: Commit**

```bash
git add src/features/gallery/GalleryDetailPage.tsx src/features/gallery/GalleryDetailPage.test.tsx
git commit -m "feat(client): like and report controls on the gallery detail page"
```

---

## Task 10: Gallery detail — comment thread

**Files:**
- Modify: `src/features/gallery/GalleryDetailPage.tsx`

- [ ] **Step 1: Implement the comment thread**

This task is browser-verified (no new RTL test required; the comment list is a straightforward fetch+render). In `src/features/gallery/GalleryDetailPage.tsx`:

- Add comment state near the other hooks:

```tsx
  const [comments, setComments] = useState<GalleryComment[]>([])
  const [draft, setDraft] = useState('')
```

and import the type: change the reactionsApi import to `import { liveReactionsApi, type GalleryComment, type ReactionsApi } from './reactionsApi'`.

- Load comments once the chip is known. Add a second `useEffect` after the existing one:

```tsx
  const chipId = typeof chip === 'object' ? chip.id : null
  useEffect(() => {
    if (chipId === null) return
    let active = true
    reactions
      .listComments(chipId)
      .then((list) => {
        if (active) setComments(list)
      })
      .catch(() => {
        // comments are non-critical; leave the list empty on failure
      })
    return () => {
      active = false
    }
  }, [chipId, reactions])
```

- Add a refresh helper and submit/delete handlers inside the component body (above the final `return`), guarded so they only run when a chip is loaded:

```tsx
  function refreshComments(id: string) {
    reactions.listComments(id).then(setComments).catch(() => undefined)
  }
```

- In the success render, after the `gallery-spec` section, add a comments section. `chip` here is the loaded detail:

```tsx
      <section className="gallery-comments" aria-label="Comments">
        <p className="v2-kicker">Comments ({comments.length})</p>
        <ul className="gallery-comments__list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.authorDisplayName}</strong> {comment.body}
              {(auth.user?.id === comment.authorUserId || auth.isAdmin) && (
                <button
                  type="button"
                  className="v2-inline-action"
                  onClick={() => {
                    reactions.deleteComment(chip.id, comment.id).then(() => refreshComments(chip.id)).catch((e) =>
                      setActionError(e instanceof Error ? e.message : 'Action failed.'),
                    )
                  }}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
          {comments.length === 0 && <li className="gallery-comments__empty">No comments yet.</li>}
        </ul>
        {isLoggedIn ? (
          <form
            className="gallery-comments__form"
            onSubmit={(e) => {
              e.preventDefault()
              const body = draft.trim()
              if (body === '') return
              reactions
                .createComment(chip.id, body)
                .then(() => {
                  setDraft('')
                  refreshComments(chip.id)
                })
                .catch((err) => setActionError(err instanceof Error ? err.message : 'Action failed.'))
            }}
          >
            <textarea
              aria-label="Add a comment"
              value={draft}
              maxLength={1000}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="v2-inline-action">Post comment</button>
          </form>
        ) : (
          <p className="gallery-detail__hint">Sign in to comment.</p>
        )}
      </section>
```

> `auth`, `isLoggedIn`, `setActionError`, and `reactions` are all already in scope from Task 9. `useEffect`/`useState` are already imported.

- [ ] **Step 2: Verify**

Run: `npm run test:client -- GalleryDetailPage`
Run: `npm run build`
Expected: PASS / build green.

- [ ] **Step 3: Commit**

```bash
git add src/features/gallery/GalleryDetailPage.tsx
git commit -m "feat(client): comment thread on the gallery detail page"
```

---

## Task 11: Gallery grid — like count on cards

**Files:**
- Modify: `src/features/gallery/GalleryPage.tsx`
- Test: existing `src/features/gallery/GalleryPage.test.tsx` (update fixtures if needed)

- [ ] **Step 1: Inspect**

READ `src/features/gallery/GalleryPage.tsx` and `src/features/gallery/GalleryPage.test.tsx`. The page maps `GalleryChipSummary[]` into cards. Fixtures in the test now need `likeCount` (added to `GalleryChipSummary` in Task 8) to typecheck — add `likeCount: 0` (or a small number) to each fixture chip.

- [ ] **Step 2: Implement**

In the card markup of `GalleryPage.tsx`, render the like count alongside the existing title/owner metadata. Add, inside each card (adapt to the actual JSX structure you find):

```tsx
              <span className="gallery-card__likes" aria-label={`${chip.likeCount} likes`}>♥ {chip.likeCount}</span>
```

- [ ] **Step 3: Verify**

Run: `npm run test:client -- GalleryPage`
Run: `npm run build`
Expected: PASS / build green.

- [ ] **Step 4: Commit**

```bash
git add src/features/gallery/GalleryPage.tsx src/features/gallery/GalleryPage.test.tsx
git commit -m "feat(client): show like count on gallery grid cards"
```

---

## Task 12: Docs + full regression + browser QA

**Files:**
- Modify: `implementation.md`, `CLAUDE.md`

- [ ] **Step 1: Full regression**

Run: `npm test`
Expected: client suite then server suite both green (server gains reactions migration/service/routes/gallery-count tests; client gains reactionsApi + updated gallery fixtures).
Run: `npm run build`
Expected: PASS with the known chunk warning.

- [ ] **Step 2: Browser QA (Chrome)**

Start a clean QA backend + client (mirroring the V4-M0 QA approach):

```bash
rm -rf /tmp/vsl-qa-m1 && mkdir -p /tmp/vsl-qa-m1
VSL_DATA_DIR=/tmp/vsl-qa-m1 VSL_UPLOAD_DIR=/tmp/vsl-qa-m1/uploads VSL_SIGNUPS_OPEN=true VSL_ADMIN_EMAILS=admin@test.com PORT=8787 npm run dev:server > /tmp/vsl-qa-m1/server.log 2>&1 &
npm run dev -- --host 127.0.0.1 --port 5173 > /tmp/vsl-qa-m1/client.log 2>&1 &
```

Seed a public chip via sqlite3 against `/tmp/vsl-qa-m1/vsl.sqlite` (as in V4-M0 QA), then in the browser verify:
1. Logged-out: gallery detail shows like count + "Sign in to react"; like/comment controls disabled; comment list visible.
2. Log in (non-admin): like toggles the count up/down; posting a comment shows it in the list; the author sees a Delete button on their own comment and it removes the comment; the Report button posts and shows "Reported".
3. Log in as `admin@test.com`: can delete another user's comment; the report appears in `/admin`'s open queue.
4. Gallery grid card shows the like count.
5. Stop the server: gallery shows offline, local editor still works (local-first regression).

Tear down: `lsof -ti tcp:8787 | xargs kill; lsof -ti tcp:5173 | xargs kill; rm -rf /tmp/vsl-qa-m1`.

- [ ] **Step 3: Record the milestone**

- Append a V4-M1 entry to `implementation.md` (Korean, matching the existing per-milestone log style): decisions (likes one-per-user toggle, flat comments author/admin-delete, report button reuses M0 `POST /api/reports`, `005_reactions` migration, gallery counts + likedByMe via optional session, comment reporting/threading deferred) and outcome (test counts, build status, QA result).
- Update `CLAUDE.md`'s v4 Community section: add **V4-M1 Reactions ✅ done** with the spec/plan paths, and refresh test counts.

- [ ] **Step 4: Commit**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record V4-M1 reactions milestone"
```

---

## Self-Review

**Spec coverage:**
- Likes (one-per-user toggle, count) → Tasks 1, 2, 4. ✓
- Flat comments (create/list/delete, author or admin) → Tasks 1, 3, 5. ✓
- Report button (reuse `POST /api/reports`) → Task 8 (`reportChip`) + Task 9 (button). ✓
- `005_reactions` migration (likes + comments, CASCADE) → Task 1. ✓
- public+visible gating (404 otherwise) → `isChipReactable` in Tasks 2/4/5. ✓
- Gallery counts (`likeCount` summary; `likeCount`/`commentCount`/`likedByMe` detail) → Tasks 6, 7. ✓
- Client API + gallery detail UI (like/report/comments) + grid like count → Tasks 8, 9, 10, 11. ✓
- Auth-required reactions, logged-out disabled controls → Tasks 4/5 (server 401) + Task 9 (`disabled={!isLoggedIn}`). ✓
- Local-first untouched (server-side only) → no client storage/domain changes; verified in Task 12 QA. ✓
- Tests per spec (toggle/count, idempotent, auth, hidden 404, comment authz, gallery counts) → Tasks 2,3,5,6,7. ✓
- Docs + completion criteria → Task 12. ✓
- Deferred (comment reporting, threading, edit, comment hide, admin comment queue) → not built. ✓

**Placeholder scan:** No "TBD"/"add validation"-style gaps; every code step is concrete. The Task 9/10/11 fixture/JSX adaptations reference reading the actual file first because the exact surrounding JSX must be matched, but the inserted markup is fully specified.

**Type consistency:** `LikeState { likeCount, likedByMe }` identical across server service, server routes JSON, and client `reactionsApi`/`galleryApi`. `Comment`/`GalleryComment` fields match (`id`, `publishedChipId`, `authorUserId`, `authorDisplayName`, `body`, `createdAt`). `isChipReactable`/`likeChip`/`unlikeChip`/`getLikeState`/`createComment`/`listComments`/`getCommentMeta`/`deleteComment` names match between service (Tasks 2/3) and routes (Tasks 4/5). `PublicGalleryChip.likeCount`/`commentCount` added in Task 6 and consumed by serializers in Task 7. `GalleryChipSummary.likeCount` + `GalleryChipDetail.likedByMe`/`commentCount` added in Task 8 and consumed by Tasks 9/11.
