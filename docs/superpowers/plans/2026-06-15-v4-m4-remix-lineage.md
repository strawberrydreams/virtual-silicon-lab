# V4-M4 Remix Lineage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track each published chip's remix parent (who it was remixed from) and render its lineage — full ancestor chain + direct children — as a v4 signature visual on the gallery detail page, without breaking the local-first contract.

**Architecture:** Provenance is carried local-first as an optional `Project.remixedFrom` (schema v4→v5), set at import time and preserved through `migrateProject` so it reaches the server at publish time. The server stores a nullable self-referencing `published_chips.remixed_from_chip_id` (FK `ON DELETE SET NULL`). Lineage is derived read-side (ancestor walk + child query, public+visible only) and exposed via a new `GET /api/gallery/:slug/lineage` endpoint that the gallery detail page lazy-loads.

**Tech Stack:** Vite · React + TypeScript · Zustand · Hono + better-sqlite3 · Vitest. Spec: `docs/superpowers/specs/2026-06-15-v4-m4-remix-lineage-design.md`.

**Status update (2026-06-15):** M4 implementation and verification are complete. Task 1-2 were previously implemented and verified; Task 3-11 plus Task 13 documentation were implemented in a later implementation-only pass; this final verification pass ran `npm test`, `npm run build`, `npm run typecheck --workspace server`, and browser QA for A→B→C lineage, child count, hidden ancestor placeholder, parent delete/`SET NULL`, share viewer parent link, and server-down local editor entry. Commit is handled as the final step of this verification pass.

---

## File Structure

**Domain (pure, `src/domain/`)**
- Modify `src/domain/project.ts` — `CURRENT_SCHEMA_VERSION` 4→5, add `RemixOrigin` type + `Project.remixedFrom?`.
- Modify `src/domain/projectMigration.ts` — accept v5, preserve `remixedFrom`.
- Modify `src/domain/remixImport.ts` — optional `origin` param sets `remixedFrom`.

**Client**
- Modify `src/stores/projectStore.ts` — `remixImport(snapshot, origin?)`.
- Modify `src/features/gallery/galleryApi.ts` — lineage types + `getLineage(slug)`.
- Modify `src/features/gallery/GalleryDetailPage.tsx` — lineage section + pass origin to `onRemix`.
- Modify `src/app/App.tsx` — `onRemix` forwards origin.

**Server (`server/src/`)**
- Modify `server/src/migrations.ts` — `007_remix_lineage`.
- Modify `server/src/publish/service.ts` — store `remixed_from_chip_id` on publish; `getChipLineage`.
- Modify `server/src/publish/routes.ts` — `GET /api/gallery/:slug/lineage`.
- Modify `server/src/share/viewer.ts` — "Remixed from {title}" line.

**Docs**
- Modify `implementation.md`, `CLAUDE.md` — record v4→v5 bump + M4 status.

---

## Task 1: Domain schema v5 — `RemixOrigin` + `Project.remixedFrom`

**Files:**
- Modify: `src/domain/project.ts:1`, `src/domain/project.ts:122-134`
- Test: `src/domain/projectFactory.test.ts` (version assertion already pins schema; new test file optional — use existing)

- [x] **Step 1: Write the failing test**

Add to `src/domain/project.test.ts` (create if absent):

```ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, type RemixOrigin } from './project'

describe('schema version', () => {
  it('is 5 for v4-m4 remix lineage', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5)
  })

  it('RemixOrigin carries chip id, slug, and title', () => {
    const origin: RemixOrigin = { chipId: 'c1', slug: 's1', title: 'T1' }
    expect(origin).toEqual({ chipId: 'c1', slug: 's1', title: 'T1' })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/project.test.ts`
Expected: FAIL (`CURRENT_SCHEMA_VERSION` is 4; `RemixOrigin` not exported).

- [x] **Step 3: Implement the schema change**

In `src/domain/project.ts` line 1:

```ts
export const CURRENT_SCHEMA_VERSION = 5 as const
```

Add the `RemixOrigin` type (near other exported types) and the field on `Project`:

```ts
export type RemixOrigin = {
  chipId: string // source published chip's server id (server FK)
  slug: string // for linking / display
  title: string // for display
}
```

```ts
export type Project = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  id: string
  name: string
  createdAt: number
  updatedAt: number
  die: Die
  blocks: Block[]
  decorations: Decoration[]
  theme: StyleTheme
  spec: FakeSpec
  studio: StudioState
  remixedFrom?: RemixOrigin
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/domain/project.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Status note: Steps 1-4 were completed on 2026-06-15; commit was intentionally not run in this session because the user asked to start implementation, not to commit partial M4 work.

```bash
git add src/domain/project.ts src/domain/project.test.ts
git commit -m "feat(domain): schema v5 adds optional Project.remixedFrom origin"
```

---

## Task 2: Domain migration — accept v5, preserve `remixedFrom`

**Files:**
- Modify: `src/domain/projectMigration.ts:4`
- Test: `src/domain/projectMigration.test.ts`

- [x] **Step 1: Write the failing tests**

Add to `src/domain/projectMigration.test.ts`:

```ts
import { CURRENT_SCHEMA_VERSION } from './project'

it('migrates a v4 project to current version without a remix origin', () => {
  const v4 = {
    schemaVersion: 4,
    id: 'p1',
    name: 'Chip',
    createdAt: 1,
    updatedAt: 1,
    die: { shape: 'rect', width: 10, height: 10 },
    blocks: [],
    decorations: [],
    theme: 'laboratory',
    spec: {},
    studio: undefined,
  }
  const migrated = migrateProject(v4)
  expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  expect(migrated.remixedFrom).toBeUndefined()
})

it('preserves remixedFrom when migrating a current-version project', () => {
  const withOrigin = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'p2',
    name: 'Remix',
    createdAt: 1,
    updatedAt: 1,
    die: { shape: 'rect', width: 10, height: 10 },
    blocks: [],
    decorations: [],
    theme: 'laboratory',
    spec: {},
    studio: undefined,
    remixedFrom: { chipId: 'c1', slug: 's1', title: 'Parent' },
  }
  expect(migrateProject(withOrigin).remixedFrom).toEqual({ chipId: 'c1', slug: 's1', title: 'Parent' })
})
```

(If the existing test file builds a shared valid-project fixture, reuse it and only override `schemaVersion` / add `remixedFrom`.)

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/projectMigration.test.ts`
Expected: FAIL — `migrateProject` throws "Unsupported project schema" for `schemaVersion: 5` (5 not in `SUPPORTED_SCHEMA_VERSIONS`).

- [x] **Step 3: Implement**

In `src/domain/projectMigration.ts` line 4 — `CURRENT_SCHEMA_VERSION` is now 5, so the set already includes it via the constant, but explicitly include all supported source versions:

```ts
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2, 3, 4, CURRENT_SCHEMA_VERSION])
```

No other change is needed: the final `return { ...project, schemaVersion: CURRENT_SCHEMA_VERSION, studio }` spreads `project`, which preserves an incoming `remixedFrom`. The schema-1 branch produces no `remixedFrom` (correct).

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/domain/projectMigration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Status note: Steps 1-4 were completed on 2026-06-15; commit was intentionally not run in this session because this is an in-progress M4 start slice.

```bash
git add src/domain/projectMigration.ts src/domain/projectMigration.test.ts
git commit -m "feat(domain): migrate v4 projects to v5 and preserve remixedFrom"
```

---

## Task 3: Domain `importRemixedProject` — optional `origin`

**Files:**
- Modify: `src/domain/remixImport.ts`
- Test: `src/domain/remixImport.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/domain/remixImport.test.ts`:

```ts
import type { RemixOrigin } from './project'

it('sets remixedFrom when an origin is provided', () => {
  const snapshot = makeSnapshot() // existing helper / inline a valid current-schema project
  const origin: RemixOrigin = { chipId: 'c1', slug: 's1', title: 'Parent' }
  const result = importRemixedProject(snapshot, 'new-id', 1000, origin)
  expect(result.remixedFrom).toEqual(origin)
})

it('leaves remixedFrom undefined when no origin is provided', () => {
  const snapshot = makeSnapshot()
  const result = importRemixedProject(snapshot, 'new-id', 1000)
  expect(result.remixedFrom).toBeUndefined()
})
```

(Reuse whatever valid-snapshot fixture the existing test uses; do not invent a `makeSnapshot` if one already exists — call it by its real name.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/domain/remixImport.test.ts`
Expected: FAIL — `importRemixedProject` takes 3 args; passing `origin` is ignored, `remixedFrom` is undefined in the first test.

- [ ] **Step 3: Implement**

Replace `src/domain/remixImport.ts`:

```ts
import type { Project, RemixOrigin } from './project'
import { migrateProject } from './projectMigration'

/**
 * Materializes a published-chip snapshot into a fresh, independent local
 * project. The snapshot is migrated to the current schema, then deep-cloned with
 * a new identity so editing or republishing the remix never touches the source.
 * When `origin` is supplied (a gallery/share remix of a published chip), it is
 * recorded as `remixedFrom` so a later publish can establish server-side remix
 * lineage. Preset/random remixes pass no origin.
 */
export function importRemixedProject(
  snapshot: unknown,
  id: string,
  now: number,
  origin?: RemixOrigin,
): Project {
  const migrated = migrateProject(snapshot)
  return {
    ...structuredClone(migrated),
    id,
    name: `${migrated.name} Remix`,
    createdAt: now,
    updatedAt: now,
    ...(origin ? { remixedFrom: origin } : {}),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/domain/remixImport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/remixImport.ts src/domain/remixImport.test.ts
git commit -m "feat(domain): importRemixedProject records optional remix origin"
```

---

## Task 4: Store + App — thread origin through `remixImport`

**Files:**
- Modify: `src/stores/projectStore.ts:16`, `src/stores/projectStore.ts:52-57`
- Modify: `src/app/App.tsx:117-124`
- Test: `src/stores/projectStore.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/stores/projectStore.test.ts`:

```ts
it('remixImport persists the provided origin as remixedFrom', async () => {
  const store = makeStore() // use the existing store-construction helper
  const snapshot = makeSnapshot() // existing valid-project helper
  const project = await store.getState().remixImport(snapshot, {
    chipId: 'c1',
    slug: 's1',
    title: 'Parent',
  })
  expect(project.remixedFrom).toEqual({ chipId: 'c1', slug: 's1', title: 'Parent' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/stores/projectStore.test.ts`
Expected: FAIL — `remixImport` takes one arg; origin is dropped.

- [ ] **Step 3: Implement**

In `src/stores/projectStore.ts` line 16, update the type:

```ts
remixImport: (snapshot: unknown, origin?: RemixOrigin) => Promise<Project>
```

Add the import at top (alongside the existing `Project` import):

```ts
import type { Project, RemixOrigin } from '../domain/project'
```

Update the action body (line 52):

```ts
async remixImport(snapshot, origin) {
  const project = importRemixedProject(snapshot, createId(), now(), origin)
  await repository.save(project)
  set({ projects: [project, ...get().projects] })
  return project
},
```

In `src/app/App.tsx`, update `GalleryDetailRoute`'s `onRemix` (line 117) to accept and forward origin:

```ts
const onRemix = useCallback(
  async (project: Project, origin: RemixOrigin) => {
    const remix = await store.remixImport(project, origin)
    navigate(`/editor/${remix.id}`)
  },
  [store, navigate],
)
```

Add `RemixOrigin` to the existing `Project` import in `App.tsx`:

```ts
import type { Project, RemixOrigin } from '../domain/project'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/stores/projectStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/projectStore.test.ts src/app/App.tsx
git commit -m "feat(client): remixImport carries remix origin from gallery to publish"
```

---

## Task 5: Server migration `007_remix_lineage`

**Files:**
- Modify: `server/src/migrations.ts:139` (after `006_contests`)
- Test: `server/test/migrations.test.ts` (or the existing migration test file — match its name)

- [ ] **Step 1: Write the failing test**

Add to the server migration test (match the existing pattern that opens a temp/in-memory DB and runs migrations):

```ts
it('007_remix_lineage adds a nullable self-referencing parent column with SET NULL', () => {
  const db = openMigratedTestDb() // existing helper that runs all migrations
  const cols = db.prepare(`PRAGMA table_info(published_chips)`).all() as Array<{ name: string }>
  expect(cols.map((c) => c.name)).toContain('remixed_from_chip_id')

  const idx = db.prepare(`PRAGMA index_list(published_chips)`).all() as Array<{ name: string }>
  expect(idx.map((i) => i.name)).toContain('idx_published_chips_remixed_from')

  // SET NULL on parent delete: seed a user + parent + child, delete parent.
  const now = Date.now()
  db.prepare(`INSERT INTO users (id,email,display_name,password_hash,created_at,updated_at) VALUES ('u1','a@b.c','A','h',?,?)`).run(now, now)
  const insertChip = db.prepare(
    `INSERT INTO published_chips (id,owner_user_id,source_project_id,slug,title,project_json,die_image_data_url,poster_image_data_url,is_public,created_at,updated_at,published_at,remixed_from_chip_id)
     VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?)`,
  )
  insertChip.run('parent', 'u1', 'sp-parent', 'parent', 'Parent', '{}', '', '', now, now, now, null)
  insertChip.run('child', 'u1', 'sp-child', 'child', 'Child', '{}', '', '', now, now, now, 'parent')

  db.prepare(`DELETE FROM published_chips WHERE id = 'parent'`).run()
  const child = db.prepare(`SELECT remixed_from_chip_id FROM published_chips WHERE id = 'child'`).get() as { remixed_from_chip_id: string | null }
  expect(child.remixed_from_chip_id).toBeNull()
})
```

(Use the real helper names from the existing migration test; the snippet above shows the exact SQL columns the production table has today.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- migrations`
Expected: FAIL — column/index missing.

- [ ] **Step 3: Implement**

Append to the `migrations` array in `server/src/migrations.ts` (after the `006_contests` object, keeping the closing `]`):

```ts
  {
    id: '007_remix_lineage',
    up: (db) => {
      db.exec(`
        ALTER TABLE published_chips
          ADD COLUMN remixed_from_chip_id TEXT REFERENCES published_chips(id) ON DELETE SET NULL;
        CREATE INDEX idx_published_chips_remixed_from ON published_chips(remixed_from_chip_id);
      `)
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- migrations`
Expected: PASS. (Foreign keys are enforced because the production DB opens with `PRAGMA foreign_keys = ON`; ensure the test helper does the same — it already does for the existing CASCADE tests.)

- [ ] **Step 5: Commit**

```bash
git add server/src/migrations.ts server/test/migrations.test.ts
git commit -m "feat(server): 007_remix_lineage adds published_chips.remixed_from_chip_id"
```

---

## Task 6: Server publish — persist `remixed_from_chip_id`

**Files:**
- Modify: `server/src/publish/service.ts` (type, row, mapper, INSERT/UPDATE, new resolver helper)
- Test: `server/test/publish.test.ts` (match the existing publish service/route test file)

- [ ] **Step 1: Write the failing tests**

Add to the publish test file (using the existing publish helper that calls the service/route with a valid `PublishInput`):

```ts
it('records remixed_from_chip_id when the project.remixedFrom.chipId exists', () => {
  // publish a parent first; capture its id
  const parent = publishChip(ownerA, { project: makeProject('parent'), title: 'Parent' })
  const child = publishChip(ownerB, {
    project: { ...makeProject('child'), remixedFrom: { chipId: parent.id, slug: parent.slug, title: 'Parent' } },
    title: 'Child',
  })
  expect(child.remixedFromChipId).toBe(parent.id)
})

it('stores NULL when remixedFrom.chipId does not exist', () => {
  const child = publishChip(ownerB, {
    project: { ...makeProject('orphan'), remixedFrom: { chipId: 'does-not-exist', slug: 'x', title: 'X' } },
    title: 'Orphan',
  })
  expect(child.remixedFromChipId).toBeNull()
})

it('stores NULL when there is no remixedFrom', () => {
  const chip = publishChip(ownerA, { project: makeProject('plain'), title: 'Plain' })
  expect(chip.remixedFromChipId).toBeNull()
})
```

(Adapt `publishChip`/`makeProject`/`ownerA` to the file's real helpers; `makeProject` must return a current-schema project.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- publish`
Expected: FAIL — `PublishedChip` has no `remixedFromChipId`.

- [ ] **Step 3: Implement**

In `server/src/publish/service.ts`:

Add to `PublishedChip` (after `sourceProjectId`):

```ts
  remixedFromChipId: string | null
```

Add to `PublishedChipRow` (after `source_project_id`):

```ts
  remixed_from_chip_id: string | null
```

In `toPublishedChip` (after `sourceProjectId: row.source_project_id,`):

```ts
    remixedFromChipId: row.remixed_from_chip_id,
```

Add a resolver helper near `getByOwnerProject`:

```ts
function resolveRemixParentId(db: Database.Database, chipId: string | undefined): string | null {
  if (chipId === undefined) return null
  const row = db.prepare('SELECT id FROM published_chips WHERE id = ?').get(chipId) as { id: string } | undefined
  return row?.id ?? null
}
```

In the INSERT (line ~169), add the column + value. New column list and a `?` plus the bound value — the parent id is computed once before the branch:

```ts
    const remixedFromChipId = resolveRemixParentId(db, input.project.remixedFrom?.chipId)
```

INSERT becomes:

```ts
      db.prepare(
        `INSERT INTO published_chips
         (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, die_image_path, poster_image_path, is_public, created_at, updated_at, published_at, remixed_from_chip_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        ownerUserId,
        input.project.id,
        slugify(input.title),
        input.title,
        projectJson,
        images.dieImageDataUrl,
        images.posterImageDataUrl,
        images.dieImagePath,
        images.posterImagePath,
        input.isPublic ? 1 : 0,
        timestamp,
        timestamp,
        publishedAt,
        remixedFromChipId,
      )
```

UPDATE becomes (add `remixed_from_chip_id = ?` to the SET list and the bound value before `existing.id`):

```ts
      db.prepare(
        `UPDATE published_chips
         SET title = ?,
             project_json = ?,
             die_image_data_url = ?,
             poster_image_data_url = ?,
             die_image_path = ?,
             poster_image_path = ?,
             is_public = ?,
             remixed_from_chip_id = ?,
             version = version + 1,
             updated_at = ?,
             published_at = ?
         WHERE id = ?`,
      ).run(
        input.title,
        projectJson,
        images.dieImageDataUrl,
        images.posterImageDataUrl,
        images.dieImagePath,
        images.posterImagePath,
        input.isPublic ? 1 : 0,
        remixedFromChipId,
        timestamp,
        publishedAt,
        existing.id,
      )
```

No change is needed in `validation.ts`: `validatePublishInput` returns `project` via `migrateProject`, which now preserves `remixedFrom`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- publish`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/publish/service.ts server/test/publish.test.ts
git commit -m "feat(server): publish persists remix parent as remixed_from_chip_id"
```

---

## Task 7: Server lineage derivation — `getChipLineage`

**Files:**
- Modify: `server/src/publish/service.ts` (new types + function)
- Test: `server/test/lineage.test.ts` (new file)

- [ ] **Step 1: Write the failing tests**

Create `server/test/lineage.test.ts` (mirror the setup of the publish test — temp DB, seed users + chips with `remixed_from_chip_id`):

```ts
import { describe, expect, it } from 'vitest'
import { getChipLineage } from '../src/publish/service'
// reuse the test DB helpers used by publish.test.ts

describe('getChipLineage', () => {
  it('returns root-first ancestors and direct children with count', () => {
    const db = seedDb() // A <- B <- C chain; A also has child D (public)
    const cLineage = getChipLineage(db, 'c-slug')
    expect(cLineage?.ancestors.map((a) => ('hidden' in a ? 'hidden' : a.slug))).toEqual(['a-slug', 'b-slug'])
    const aLineage = getChipLineage(db, 'a-slug')
    expect(aLineage?.children.map((ch) => ch.slug).sort()).toEqual(['b-slug', 'd-slug'])
    expect(aLineage?.childCount).toBe(2)
  })

  it('renders a non-visible ancestor as a hidden placeholder and stops climbing', () => {
    const db = seedDbWithPrivateParent() // B's parent A is is_public = 0
    const lineage = getChipLineage(db, 'b-slug')
    expect(lineage?.ancestors).toEqual([{ hidden: true }])
  })

  it('excludes non-visible children from the list and count', () => {
    const db = seedDbWithHiddenChild() // A has children B (visible) + E (hidden)
    const lineage = getChipLineage(db, 'a-slug')
    expect(lineage?.children.map((c) => c.slug)).toEqual(['b-slug'])
    expect(lineage?.childCount).toBe(1)
  })

  it('returns null for a missing or non-public slug', () => {
    const db = seedDb()
    expect(getChipLineage(db, 'nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- lineage`
Expected: FAIL — `getChipLineage` is not exported.

- [ ] **Step 3: Implement**

Add to `server/src/publish/service.ts`:

```ts
export type LineageChip = {
  slug: string
  title: string
  ownerDisplayName: string
  posterImagePath: string | null
  posterImageDataUrl: string
}

export type LineageNode = LineageChip | { hidden: true }

export type ChipLineage = {
  ancestors: LineageNode[]
  children: LineageChip[]
  childCount: number
}

const MAX_LINEAGE_DEPTH = 20

type LineageRow = {
  slug: string
  title: string
  poster_image_path: string | null
  poster_image_data_url: string
  owner_display_name: string
  remixed_from_chip_id: string | null
  is_public: 0 | 1
  moderation_status: 'visible' | 'hidden'
}

function toLineageChip(row: LineageRow): LineageChip {
  return {
    slug: row.slug,
    title: row.title,
    ownerDisplayName: row.owner_display_name,
    posterImagePath: row.poster_image_path,
    posterImageDataUrl: row.poster_image_data_url,
  }
}

export function getChipLineage(db: Database.Database, slug: string): ChipLineage | null {
  const target = db
    .prepare(
      `SELECT id, remixed_from_chip_id FROM published_chips
       WHERE slug = ? AND is_public = 1 AND moderation_status = 'visible'`,
    )
    .get(slug) as { id: string; remixed_from_chip_id: string | null } | undefined
  if (target === undefined) return null

  const byId = db.prepare(
    `SELECT p.slug, p.title, p.poster_image_path, p.poster_image_data_url,
            p.remixed_from_chip_id, p.is_public, p.moderation_status,
            u.display_name AS owner_display_name
     FROM published_chips p JOIN users u ON u.id = p.owner_user_id
     WHERE p.id = ?`,
  )

  const ancestors: LineageNode[] = []
  let parentId = target.remixed_from_chip_id
  let depth = 0
  while (parentId !== null && depth < MAX_LINEAGE_DEPTH) {
    const row = byId.get(parentId) as LineageRow | undefined
    if (row === undefined) break
    if (row.is_public !== 1 || row.moderation_status !== 'visible') {
      ancestors.unshift({ hidden: true })
      break
    }
    ancestors.unshift(toLineageChip(row))
    parentId = row.remixed_from_chip_id
    depth += 1
  }

  const childRows = db
    .prepare(
      `SELECT p.slug, p.title, p.poster_image_path, p.poster_image_data_url,
              p.remixed_from_chip_id, p.is_public, p.moderation_status,
              u.display_name AS owner_display_name
       FROM published_chips p JOIN users u ON u.id = p.owner_user_id
       WHERE p.remixed_from_chip_id = ? AND p.is_public = 1 AND p.moderation_status = 'visible'
       ORDER BY p.updated_at DESC LIMIT 12`,
    )
    .all(target.id) as LineageRow[]

  const childCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM published_chips
         WHERE remixed_from_chip_id = ? AND is_public = 1 AND moderation_status = 'visible'`,
      )
      .get(target.id) as { c: number }
  ).c

  return { ancestors, children: childRows.map(toLineageChip), childCount }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- lineage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/publish/service.ts server/test/lineage.test.ts
git commit -m "feat(server): derive remix lineage (ancestors + children) read-side"
```

---

## Task 8: Server route — `GET /api/gallery/:slug/lineage`

**Files:**
- Modify: `server/src/publish/routes.ts` (import `getChipLineage`, add route, serialize)
- Test: `server/test/publish.test.ts` or `server/test/lineage.test.ts` (route-level, via the app fetch helper)

- [ ] **Step 1: Write the failing test**

Add a route-level test (use the existing helper that builds the Hono app and issues requests):

```ts
it('GET /api/gallery/:slug/lineage serializes ancestors and children with poster URLs', async () => {
  const { app } = buildApp() // existing helper; seed A <- B
  const res = await app.request('/api/gallery/b-slug/lineage')
  expect(res.status).toBe(200)
  const body = (await res.json()) as {
    ancestors: Array<{ slug?: string; posterImageUrl?: string; hidden?: boolean }>
    children: unknown[]
    childCount: number
  }
  expect(body.ancestors[0]?.slug).toBe('a-slug')
  expect(typeof body.ancestors[0]?.posterImageUrl).toBe('string')
})

it('GET /api/gallery/:slug/lineage 404s for a missing/non-public chip', async () => {
  const { app } = buildApp()
  const res = await app.request('/api/gallery/nope/lineage')
  expect(res.status).toBe(404)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- publish`
Expected: FAIL — route returns 404 for everything (not registered) / no `posterImageUrl`.

- [ ] **Step 3: Implement**

In `server/src/publish/routes.ts`, add `getChipLineage` (and the `LineageNode` type) to the import from `./service`. Register the route alongside the other gallery routes (after `/gallery/:slug`):

```ts
  routes.get('/gallery/:slug/lineage', (c) => {
    const lineage = getChipLineage(db, c.req.param('slug'))
    if (lineage === null) return fail(c, 404, 'NOT_FOUND', 'Published chip not found.')
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    const serializeNode = (node: LineageNode) =>
      'hidden' in node
        ? { hidden: true as const }
        : {
            slug: node.slug,
            title: node.title,
            ownerDisplayName: node.ownerDisplayName,
            posterImageUrl: resolveImageUrl(baseUrl, node.posterImagePath, node.posterImageDataUrl),
          }
    return c.json({
      ancestors: lineage.ancestors.map(serializeNode),
      children: lineage.children.map(serializeNode),
      childCount: lineage.childCount,
    })
  })
```

(Note: Hono matches `/gallery/:slug` and `/gallery/:slug/lineage` distinctly by path depth, so ordering relative to `/gallery/:slug` does not matter.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- publish`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/publish/routes.ts server/test/publish.test.ts
git commit -m "feat(server): GET /api/gallery/:slug/lineage endpoint"
```

---

## Task 9: Server share viewer — "Remixed from {title}" line

**Files:**
- Modify: `server/src/share/viewer.ts`
- Test: `server/test/share.test.ts` (match the existing viewer/shareHelpers test)

- [ ] **Step 1: Write the failing test**

Add to the share viewer test (the existing test renders viewer HTML for a public chip):

```ts
it('renders a Remixed from link when the chip has a visible parent', () => {
  // build viewer input where lineage.ancestors ends with a visible parent { slug, title }
  const html = renderViewerHtml(viewerInputWithParent)
  expect(html).toContain('Remixed from')
  expect(html).toContain('/gallery/parent-slug')
  expect(html).toContain('Parent Title')
})

it('omits the Remixed from line when there is no visible parent', () => {
  const html = renderViewerHtml(viewerInputNoParent)
  expect(html).not.toContain('Remixed from')
})
```

(Adapt to how `renderViewerHtml` receives its data. The simplest wiring: the share route fetches the immediate parent via `getChipLineage(db, slug)` and passes `ancestors[ancestors.length - 1]` — the direct parent — into the viewer input as an optional `remixedFrom?: { slug; title }`, skipping `{ hidden: true }`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace server -- share`
Expected: FAIL — no "Remixed from" output.

- [ ] **Step 3: Implement**

- Extend the viewer input type with an optional `remixedFrom?: { slug: string; title: string }`.
- In `renderViewerHtml`, where the existing "Remix this chip" / "Open the Lab" CTAs are rendered, conditionally emit:

```ts
${
  input.remixedFrom
    ? `<p class="viewer-lineage">Remixed from <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(
        input.remixedFrom.slug,
      )}">${escapeHtml(input.remixedFrom.title)}</a></p>`
    : ''
}
```

- In the share route (`server/src/share/` route that builds the viewer input), compute the direct parent:

```ts
const lineage = getChipLineage(db, slug)
const parent = lineage?.ancestors.at(-1)
const remixedFrom = parent && !('hidden' in parent) ? { slug: parent.slug, title: parent.title } : undefined
```

and pass `remixedFrom` into the viewer input.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace server -- share`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/share/ server/test/share.test.ts
git commit -m "feat(server): share viewer links to the remix parent chip"
```

---

## Task 10: Client galleryApi — `getLineage`

**Files:**
- Modify: `src/features/gallery/galleryApi.ts`
- Test: `src/features/gallery/galleryApi.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/features/gallery/galleryApi.test.ts` (mirror the existing `get`/`list` fetch-mock tests):

```ts
it('getLineage requests the lineage endpoint and returns the parsed body', async () => {
  const body = { ancestors: [{ slug: 'a', title: 'A', ownerDisplayName: 'U', posterImageUrl: '/p.png' }], children: [], childCount: 0 }
  mockFetchOnce(200, body) // use the test file's existing fetch-mock helper
  const result = await liveGalleryApi.getLineage('b-slug')
  expect(result).toEqual(body)
  expect(lastFetchUrl()).toBe('/api/gallery/b-slug/lineage')
})

it('getLineage returns null on 404', async () => {
  mockFetchOnce(404, { error: { code: 'NOT_FOUND', message: 'x' } })
  expect(await liveGalleryApi.getLineage('nope')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/gallery/galleryApi.test.ts`
Expected: FAIL — `getLineage` does not exist on `GalleryApi`.

- [ ] **Step 3: Implement**

In `src/features/gallery/galleryApi.ts`, add types and the method:

```ts
export type LineageChipNode = {
  slug: string
  title: string
  ownerDisplayName: string
  posterImageUrl: string
}

export type LineageNode = LineageChipNode | { hidden: true }

export type ChipLineage = {
  ancestors: LineageNode[]
  children: LineageChipNode[]
  childCount: number
}
```

Extend the `GalleryApi` type:

```ts
export type GalleryApi = {
  list: (sort?: GallerySort) => Promise<GalleryChipSummary[]>
  get: (slug: string) => Promise<GalleryChipDetail | null>
  getLineage: (slug: string) => Promise<ChipLineage | null>
}
```

Add to `liveGalleryApi`:

```ts
  async getLineage(slug) {
    const res = await request(`/api/gallery/${encodeURIComponent(slug)}/lineage`)
    if (res.status === 404) return null
    if (!res.ok) throw await toApiError(res)
    return (await res.json()) as ChipLineage
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/gallery/galleryApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/gallery/galleryApi.ts src/features/gallery/galleryApi.test.ts
git commit -m "feat(client): galleryApi.getLineage for /api/gallery/:slug/lineage"
```

---

## Task 11: Client GalleryDetailPage — lineage section + origin on remix

**Files:**
- Modify: `src/features/gallery/GalleryDetailPage.tsx`
- Test: `src/features/gallery/GalleryDetailPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/features/gallery/GalleryDetailPage.test.tsx` (the file already provides a fake `GalleryApi`; extend it with `getLineage`):

```ts
it('passes the chip origin to onRemix', async () => {
  const onRemix = vi.fn()
  renderDetail({ api: fakeApiReturning(chipDetail), onRemix }) // chipDetail.id/slug/title known
  await screen.findByText(chipDetail.title)
  fireEvent.click(screen.getByRole('button', { name: /remix into my projects/i }))
  expect(onRemix).toHaveBeenCalledWith(chipDetail.project, {
    chipId: chipDetail.id,
    slug: chipDetail.slug,
    title: chipDetail.title,
  })
})

it('renders ancestor and child lineage nodes when present', async () => {
  const api = fakeApiReturning(chipDetail, {
    ancestors: [{ slug: 'parent', title: 'Parent Chip', ownerDisplayName: 'U', posterImageUrl: '/p.png' }],
    children: [{ slug: 'kid', title: 'Kid Chip', ownerDisplayName: 'U', posterImageUrl: '/k.png' }],
    childCount: 1,
  })
  renderDetail({ api })
  expect(await screen.findByText('Parent Chip')).toBeInTheDocument()
  expect(screen.getByText('Kid Chip')).toBeInTheDocument()
})

it('shows a private-ancestor placeholder for hidden lineage nodes', async () => {
  const api = fakeApiReturning(chipDetail, { ancestors: [{ hidden: true }], children: [], childCount: 0 })
  renderDetail({ api })
  expect(await screen.findByText(/private chip/i)).toBeInTheDocument()
})
```

Update the test file's fake `GalleryApi` to include `getLineage` (default returning `{ ancestors: [], children: [], childCount: 0 }`), so existing tests keep compiling.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:client -- src/features/gallery/GalleryDetailPage.test.tsx`
Expected: FAIL — `onRemix` called with one arg; no lineage rendered.

- [ ] **Step 3: Implement**

In `src/features/gallery/GalleryDetailPage.tsx`:

- Update the `onRemix` prop type:

```ts
  onRemix?: (project: Project, origin: { chipId: string; slug: string; title: string }) => void
```

- Update the remix button (line 133):

```tsx
<button
  type="button"
  className="v2-inline-action"
  onClick={() => onRemix?.(chip.project, { chipId: chip.id, slug: chip.slug, title: chip.title })}
>
  Remix into my projects
</button>
```

- Import `ChipLineage` from `./galleryApi`, add state, and a lazy-load effect keyed on `chipId`:

```ts
const [lineage, setLineage] = useState<ChipLineage | null>(null)
useEffect(() => {
  if (chipId === null) return
  let active = true
  api
    .getLineage(slug)
    .then((next) => {
      if (active) setLineage(next)
    })
    .catch(() => {
      // lineage is non-critical; leave it null on failure
    })
  return () => {
    active = false
  }
}, [api, chipId, slug])
```

- Render a "Lineage" section after the comment thread (only when `chip` is an object and `lineage` has any nodes). Use v2 theme classes consistent with the rest of the page:

```tsx
{lineage && (lineage.ancestors.length > 0 || lineage.childCount > 0) && (
  <section className="gallery-lineage v2-card">
    <h2 className="v2-kicker">Lineage</h2>
    {lineage.ancestors.length > 0 && (
      <ol className="gallery-lineage__spine">
        {lineage.ancestors.map((node, i) =>
          'hidden' in node ? (
            <li key={`hidden-${i}`} className="gallery-lineage__node gallery-lineage__node--hidden">
              a private chip
            </li>
          ) : (
            <li key={node.slug} className="gallery-lineage__node">
              <Link to={`/gallery/${node.slug}`}>
                <img src={node.posterImageUrl} alt={node.title} loading="lazy" />
                <span>{node.title}</span>
              </Link>
            </li>
          ),
        )}
      </ol>
    )}
    {lineage.childCount > 0 && (
      <>
        <p className="v2-muted">{lineage.childCount} remix{lineage.childCount === 1 ? '' : 'es'} of this chip</p>
        <ul className="gallery-lineage__children">
          {lineage.children.map((node) => (
            <li key={node.slug} className="gallery-lineage__node">
              <Link to={`/gallery/${node.slug}`}>
                <img src={node.posterImageUrl} alt={node.title} loading="lazy" />
                <span>{node.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </>
    )}
  </section>
)}
```

(Class names: reuse existing v2 card/kicker/muted utility classes already used elsewhere in this page; `gallery-lineage*` classes get styled in the page's CSS in Step 3b. Keep styling DOM/CSS — this is a web page, not an export stage.)

- [ ] **Step 3b: Add lineage styles**

Add `.gallery-lineage*` rules to the gallery page stylesheet (the same CSS file that styles `gallery-page__*`), themed with `--v2-*` tokens: a horizontal/vertical spine with poster thumbnails, subtle glow on hover, a muted placeholder for `--hidden`. (Visual quality is the gate — match the keynote/poster aesthetic; verified in browser, not unit-tested.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:client -- src/features/gallery/GalleryDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/gallery/GalleryDetailPage.tsx src/features/gallery/GalleryDetailPage.test.tsx
git commit -m "feat(client): lineage section on gallery detail + origin-aware remix"
```

---

## Task 12: Full suite, build, and browser QA

**Files:** none (verification).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — client and server suites green (client grows by the new domain/store/galleryApi/detail tests; server grows by migration/publish/lineage/share tests).

- [ ] **Step 2: Type + production build**

Run: `npm run build` and `npm run typecheck --workspace server`
Expected: both green (known Vite chunk warning only).

- [ ] **Step 3: Browser QA (acceptance gates from the spec)**

Start client + server (`npm run dev -- --host 127.0.0.1`, `npm run dev:server`) and verify:
1. Publish chip A → remix-import A as user B → edit → publish B → `/gallery/<B>` shows "Remixed from A" ancestor (clickable).
2. `/gallery/<A>` shows B as a child; child count = 1.
3. Multi-level A←B←C: C's ancestor spine shows A → B.
4. Set A private → B's lineage shows A as a non-clickable "a private chip" placeholder.
5. Delete A → B's `remixed_from_chip_id` becomes NULL → B shows no ancestors.
6. Lineage section is styled to match the chip aesthetic (visual quality gate passes).
7. Server down → local edit/save/export unaffected.

- [ ] **Step 4: No commit** (verification only). If QA reveals issues, fix in a follow-up commit referencing the failing gate.

---

## Task 13: Documentation — implementation log + project memory

**Files:**
- Modify: `implementation.md`
- Modify: `CLAUDE.md` (Milestone Status → v4 Community)

- [ ] **Step 1: Record the milestone in `implementation.md`** (Korean, matching the running log style): the **first v4 schema bump v4→v5** (`Project.remixedFrom`), the server `007_remix_lineage` self-referencing FK (`ON DELETE SET NULL`), read-side `getChipLineage`, the `GET /api/gallery/:slug/lineage` endpoint, the share-viewer parent link, and the gallery detail lineage section. Note final suite counts from Task 12.

- [ ] **Step 2: Update `CLAUDE.md`** — add a **V4-M4 Remix Lineage: ✅ done** entry under "v4 Community (in progress)" with the spec/plan paths and the decisions (parent-pointer column, v5 carrier, read-side lineage, ancestor-chain + direct-children visualization), and note that M4 was the last planned v4 milestone on `v4-community` (public launch remains a separate gate).

- [ ] **Step 3: Commit**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record V4-M4 remix lineage milestone"
```

---

## Self-Review Notes

- **Spec coverage:** D1 parent-pointer column → Task 5/7; D2 v5 carrier → Task 1/2; D3 id-FK + slug/title display → Task 1/6/7; D4 ancestor chain + direct children + count → Task 7; D5 visibility filtering / hidden placeholder → Task 7/11; D6 gallery-detail lineage section → Task 11; D7 separate `/lineage` endpoint → Task 8/10; D8 `importRemixedProject` origin → Task 3/4; D9 schema bump + migration tests + docs → Task 1/2/5/13; D10 share viewer line → Task 9.
- **Type consistency:** `RemixOrigin` (domain) ↔ `remixedFrom` (Project) ↔ `remixed_from_chip_id` (DB) ↔ `remixedFromChipId` (PublishedChip) ↔ `{ chipId, slug, title }` origin (client). `ChipLineage`/`LineageNode`/`LineageChip(Node)` consistent across server service, server route serialization, and client api.
- **Local-first invariant:** all lineage state is server-side published data + an optional local `remixedFrom`; no editor/storage behavior changes; server-down path unaffected (Task 12 gate 7).
