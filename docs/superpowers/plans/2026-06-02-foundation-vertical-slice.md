# Virtual Silicon Lab Foundation Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first usable vertical slice: create a local project, enter the editor, add bounded real and fantasy blocks to a rectangular die, and restore the project after refresh.

**Architecture:** Establish versioned JSON in `src/domain`, persistence adapters in `src/storage`, Zustand orchestration in `src/stores`, and focused UI routes in `src/features`. Use React Konva only at the rendering boundary; keep geometry and persistence logic unit-testable without canvas.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS v4, React Router, Zustand, Konva, React Konva, idb, Vitest, React Testing Library, fake-indexeddb

---

## Context

- The workspace currently contains documentation only.
- The workspace is not a Git repository yet.
- Use npm for the first implementation pass.
- Current Vite documentation requires Node.js `20.19+` or `22.12+`. Prefer Node.js `22.12+` because the current Vitest guide also requires Node.js `20+`.
- Preserve `virtual_silicon_lab_v1.md` and `implementation.md`.

## Target File Map

```text
index.html
package.json
tsconfig.json
tsconfig.app.json
tsconfig.node.json
vite.config.ts
src/
  main.tsx
  styles.css
  app/App.tsx
  domain/project.ts
  domain/projectFactory.ts
  domain/projectMigration.ts
  storage/projectRepository.ts
  storage/indexedDbProjectRepository.ts
  storage/localStorageProjectRepository.ts
  storage/resilientProjectRepository.ts
  stores/projectStore.ts
  features/projects/ProjectDashboard.tsx
  features/editor/EditorPage.tsx
  features/editor/BlockPalette.tsx
  features/editor/canvas/geometry.ts
  features/editor/canvas/ChipStage.tsx
  test/setup.ts
```

Tests live next to their implementation files as `*.test.ts` or `*.test.tsx`.

### Task 1: Initialize Repository And Tooling

**Files:**
- Create: `.gitignore`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/styles.css`
- Create: `src/app/App.tsx`
- Create: `src/app/App.test.tsx`
- Create: `src/test/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Check Node.js and initialize Git**

Run:

```bash
node --version
git init
```

Expected: Node.js is `v20.19.0+` or `v22.12.0+`, and Git reports an initialized repository.

- [ ] **Step 2: Initialize npm and install runtime dependencies**

Run:

```bash
npm init -y
npm install react react-dom react-router-dom zustand konva react-konva idb
npm install -D typescript vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event fake-indexeddb @types/react @types/react-dom
npm pkg set type=module
npm pkg set scripts.dev=vite
npm pkg set scripts.build="tsc -b && vite build"
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch=vitest
npm pkg set scripts.preview="vite preview"
```

Expected: `package.json` includes all dependencies and the five scripts.

- [ ] **Step 3: Create the Vite, TypeScript, Tailwind, and test setup**

Create `.gitignore`:

```gitignore
node_modules
dist
.DS_Store
coverage
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Virtual Silicon Lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:

```ts
// fake-indexeddb provides IndexedDB inside jsdom so tests that exercise the
// default project repository do not throw.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
```

Create `src/styles.css`:

```css
@import "tailwindcss";

:root {
  color: #d8f7ff;
  background: #071015;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

body {
  min-width: 1024px;
  min-height: 100vh;
  margin: 0;
}

button {
  cursor: pointer;
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 4: Write the failing application shell test**

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the product title', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Virtual Silicon Lab' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run the test to verify it fails**

Run:

```bash
npm test -- src/app/App.test.tsx
```

Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 6: Create the minimal application shell**

Create `src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main className="min-h-screen bg-[#071015] p-8 text-[#d8f7ff]">
      <h1 className="text-3xl font-semibold tracking-[0.2em] uppercase">
        Virtual Silicon Lab
      </h1>
    </main>
  )
}
```

- [ ] **Step 7: Verify tests and build**

Run:

```bash
npm test
npm run build
```

Expected: one passing test and a successful Vite production build.

- [ ] **Step 8: Commit tooling**

Run:

```bash
git add .gitignore index.html package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts src
git commit -m "chore: initialize virtual silicon lab frontend"
```

### Task 2: Add Versioned Project Domain

**Files:**
- Create: `src/domain/project.ts`
- Create: `src/domain/projectFactory.ts`
- Create: `src/domain/projectFactory.test.ts`
- Create: `src/domain/projectMigration.ts`
- Create: `src/domain/projectMigration.test.ts`

- [ ] **Step 1: Write failing factory and migration tests**

Create `src/domain/projectFactory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createProject } from './projectFactory'

describe('createProject', () => {
  it('creates a schema version 1 project with an empty rectangular die', () => {
    const project = createProject('Dream Chip', 'project-1', 100)

    expect(project).toMatchObject({
      schemaVersion: 1,
      id: 'project-1',
      name: 'Dream Chip',
      createdAt: 100,
      updatedAt: 100,
      die: { shape: 'rect', width: 960, height: 640 },
      blocks: [],
      decorations: [],
      theme: 'neon',
    })
  })
})
```

Create `src/domain/projectMigration.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { migrateProject } from './projectMigration'

describe('migrateProject', () => {
  it('accepts a schema version 1 project', () => {
    const project = migrateProject({
      schemaVersion: 1,
      id: 'project-1',
      name: 'Dream Chip',
      createdAt: 100,
      updatedAt: 100,
      die: { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' },
      blocks: [],
      decorations: [],
      theme: 'neon',
      spec: {
        brand: 'NOCTURNE',
        series: 'ONEIRIC',
        generation: 'I',
        process: '0.5nm soul engraving',
        cores: 8,
        bandwidth: '4.2 TB/s',
        features: ['Lucid cache'],
        description: 'A processor for synthetic dreams.',
      },
    })

    expect(project.schemaVersion).toBe(1)
  })

  it('rejects data without a supported schema version', () => {
    expect(() => migrateProject({ id: 'broken' })).toThrow('Unsupported project schema')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/domain/projectFactory.test.ts src/domain/projectMigration.test.ts
```

Expected: FAIL because domain modules do not exist.

- [ ] **Step 3: Implement the domain model**

Create `src/domain/project.ts`:

```ts
export const CURRENT_SCHEMA_VERSION = 1 as const

export type DieShape = 'rect' | 'square' | 'circle' | 'hexagon'
export type StyleTheme = 'neon' | 'retro' | 'military' | 'keynote' | 'mono'
export type BlockCategory = 'real' | 'fantasy'

export type BlockType =
  | 'CPU'
  | 'GPU'
  | 'DSP'
  | 'SRAM'
  | 'Cache'
  | 'DAC'
  | 'ADC'
  | 'PLL'
  | 'IO'
  | 'USB'
  | 'EmotionEngine'
  | 'DreamSynth'
  | 'QuantumMemory'
  | 'ConsciousnessProcessor'
  | 'RealityDistortionUnit'
  | 'TimeCore'

export type Die = {
  shape: DieShape
  width: number
  height: number
  background: string
}

export type Block = {
  id: string
  type: BlockType
  category: BlockCategory
  x: number
  y: number
  w: number
  h: number
  rotation: number
  label?: string
  glow?: boolean
  colorOverride?: string
  zIndex: number
}

export type Decoration =
  | { id: string; kind: 'neonLine'; points: number[]; color: string; zIndex: number }
  | { id: string; kind: 'warningMark'; x: number; y: number; zIndex: number }
  | { id: string; kind: 'label'; x: number; y: number; text: string; zIndex: number }
  | { id: string; kind: 'sciFiObject'; assetKey: string; x: number; y: number; zIndex: number }

export type FakeSpec = {
  brand: string
  series: string
  generation: string
  process: string
  cores: number
  bandwidth: string
  features: string[]
  description: string
}

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
}
```

Create `src/domain/projectFactory.ts`:

```ts
import { CURRENT_SCHEMA_VERSION, type Project } from './project'

export function createProject(
  name: string,
  id = crypto.randomUUID(),
  now = Date.now(),
): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    die: { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' },
    blocks: [],
    decorations: [],
    theme: 'neon',
    spec: {
      brand: 'NOCTURNE',
      series: 'ONEIRIC',
      generation: 'I',
      process: '0.5nm soul engraving',
      cores: 8,
      bandwidth: '4.2 TB/s',
      features: ['Lucid cache'],
      description: 'A processor for synthetic dreams.',
    },
  }
}
```

Create `src/domain/projectMigration.ts`:

```ts
import { CURRENT_SCHEMA_VERSION, type Project } from './project'

export function migrateProject(value: unknown): Project {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== CURRENT_SCHEMA_VERSION
  ) {
    throw new Error('Unsupported project schema')
  }

  return value as Project
}
```

- [ ] **Step 4: Verify tests**

Run:

```bash
npm test -- src/domain/projectFactory.test.ts src/domain/projectMigration.test.ts
npm run build
```

Expected: domain tests pass and the build succeeds.

- [ ] **Step 5: Commit domain model**

Run:

```bash
git add src/domain
git commit -m "feat: add versioned project domain"
```

### Task 3: Add Local Project Repositories

**Files:**
- Create: `src/storage/projectRepository.ts`
- Create: `src/storage/indexedDbProjectRepository.ts`
- Create: `src/storage/localStorageProjectRepository.ts`
- Create: `src/storage/resilientProjectRepository.ts`
- Create: `src/storage/projectRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Create `src/storage/projectRepository.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { createIndexedDbProjectRepository } from './indexedDbProjectRepository'
import { createLocalStorageProjectRepository } from './localStorageProjectRepository'
import { createResilientProjectRepository } from './resilientProjectRepository'

describe('project repositories', () => {
  beforeEach(() => localStorage.clear())

  it('saves, lists, reads, and removes projects in IndexedDB', async () => {
    const repository = createIndexedDbProjectRepository(`test-${crypto.randomUUID()}`)
    const project = createProject('Dream Chip', 'project-1', 100)

    await repository.save(project)
    expect(await repository.list()).toEqual([project])
    expect(await repository.get('project-1')).toEqual(project)

    await repository.remove('project-1')
    expect(await repository.list()).toEqual([])
  })

  it('uses localStorage when the primary repository fails', async () => {
    const fallback = createLocalStorageProjectRepository('test-projects')
    const repository = createResilientProjectRepository(
      {
        list: async () => Promise.reject(new Error('IndexedDB unavailable')),
        get: async () => Promise.reject(new Error('IndexedDB unavailable')),
        save: async () => Promise.reject(new Error('IndexedDB unavailable')),
        remove: async () => Promise.reject(new Error('IndexedDB unavailable')),
      },
      fallback,
    )
    const project = createProject('Fallback Chip', 'project-2', 200)

    await repository.save(project)

    expect(await repository.get('project-2')).toEqual(project)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/storage/projectRepository.test.ts
```

Expected: FAIL because storage modules do not exist.

- [ ] **Step 3: Implement repository adapters**

Create `src/storage/projectRepository.ts`:

```ts
import type { Project } from '../domain/project'

export type ProjectRepository = {
  list: () => Promise<Project[]>
  get: (id: string) => Promise<Project | undefined>
  save: (project: Project) => Promise<void>
  remove: (id: string) => Promise<void>
}
```

Create `src/storage/indexedDbProjectRepository.ts`:

```ts
import { openDB, type DBSchema } from 'idb'
import { migrateProject } from '../domain/projectMigration'
import type { ProjectRepository } from './projectRepository'

interface ProjectDatabase extends DBSchema {
  projects: {
    key: string
    value: unknown
  }
}

export function createIndexedDbProjectRepository(
  databaseName = 'virtual-silicon-lab',
): ProjectRepository {
  const database = openDB<ProjectDatabase>(databaseName, 1, {
    upgrade(db) {
      db.createObjectStore('projects')
    },
  })

  return {
    async list() {
      return (await (await database).getAll('projects'))
        .map(migrateProject)
        .sort((left, right) => right.updatedAt - left.updatedAt)
    },
    async get(id) {
      const value = await (await database).get('projects', id)
      return value === undefined ? undefined : migrateProject(value)
    },
    async save(project) {
      await (await database).put('projects', project, project.id)
    },
    async remove(id) {
      await (await database).delete('projects', id)
    },
  }
}
```

Create `src/storage/localStorageProjectRepository.ts`:

```ts
import { migrateProject } from '../domain/projectMigration'
import type { Project } from '../domain/project'
import type { ProjectRepository } from './projectRepository'

export function createLocalStorageProjectRepository(
  storageKey = 'virtual-silicon-lab-projects',
): ProjectRepository {
  function readAll(): Project[] {
    const raw = localStorage.getItem(storageKey)
    return raw === null ? [] : (JSON.parse(raw) as unknown[]).map(migrateProject)
  }

  function writeAll(projects: Project[]) {
    localStorage.setItem(storageKey, JSON.stringify(projects))
  }

  return {
    async list() {
      return readAll().sort((left, right) => right.updatedAt - left.updatedAt)
    },
    async get(id) {
      return readAll().find((project) => project.id === id)
    },
    async save(project) {
      writeAll([...readAll().filter((candidate) => candidate.id !== project.id), project])
    },
    async remove(id) {
      writeAll(readAll().filter((project) => project.id !== id))
    },
  }
}
```

Create `src/storage/resilientProjectRepository.ts`:

```ts
import type { ProjectRepository } from './projectRepository'

export function createResilientProjectRepository(
  primary: ProjectRepository,
  fallback: ProjectRepository,
): ProjectRepository {
  return {
    async list() {
      return primary.list().catch(() => fallback.list())
    },
    async get(id) {
      return primary.get(id).catch(() => fallback.get(id))
    },
    async save(project) {
      return primary.save(project).catch(() => fallback.save(project))
    },
    async remove(id) {
      return primary.remove(id).catch(() => fallback.remove(id))
    },
  }
}
```

- [ ] **Step 4: Verify repository behavior**

Run:

```bash
npm test -- src/storage/projectRepository.test.ts
npm run build
```

Expected: repository tests pass and the build succeeds.

- [ ] **Step 5: Commit storage adapters**

Run:

```bash
git add src/storage
git commit -m "feat: persist projects locally"
```

### Task 4: Add Geometry Constraints

**Files:**
- Create: `src/features/editor/canvas/geometry.ts`
- Create: `src/features/editor/canvas/geometry.test.ts`

- [ ] **Step 1: Write failing geometry tests**

Create `src/features/editor/canvas/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { clampBlockToRect, snapToGrid } from './geometry'

describe('snapToGrid', () => {
  it('rounds coordinates to the nearest grid interval', () => {
    expect(snapToGrid(33, 16)).toBe(32)
    expect(snapToGrid(42, 16)).toBe(48)
  })
})

describe('clampBlockToRect', () => {
  it('keeps a block inside the die bounds', () => {
    expect(
      clampBlockToRect(
        { x: 940, y: -10, w: 120, h: 80 },
        { width: 960, height: 640 },
      ),
    ).toEqual({ x: 840, y: 0, w: 120, h: 80 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/features/editor/canvas/geometry.test.ts
```

Expected: FAIL because `geometry.ts` does not exist.

- [ ] **Step 3: Implement rectangular grid and bounds helpers**

Create `src/features/editor/canvas/geometry.ts`:

```ts
type BlockRect = { x: number; y: number; w: number; h: number }
type DieRect = { width: number; height: number }

export function snapToGrid(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize
}

export function clampBlockToRect(block: BlockRect, die: DieRect): BlockRect {
  const w = Math.min(block.w, die.width)
  const h = Math.min(block.h, die.height)

  return {
    x: Math.min(Math.max(block.x, 0), die.width - w),
    y: Math.min(Math.max(block.y, 0), die.height - h),
    w,
    h,
  }
}
```

- [ ] **Step 4: Verify geometry behavior**

Run:

```bash
npm test -- src/features/editor/canvas/geometry.test.ts
npm run build
```

Expected: geometry tests pass and the build succeeds.

- [ ] **Step 5: Commit geometry helpers**

Run:

```bash
git add src/features/editor/canvas
git commit -m "feat: constrain blocks to rectangular die"
```

### Task 5: Add Project Store And CRUD Commands

**Files:**
- Create: `src/stores/projectStore.ts`
- Create: `src/stores/projectStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/stores/projectStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Project } from '../domain/project'
import type { ProjectRepository } from '../storage/projectRepository'
import { createProjectStore } from './projectStore'

function createMemoryRepository(): ProjectRepository {
  const projects = new Map<string, Project>()
  return {
    list: async () => [...projects.values()],
    get: async (id) => projects.get(id),
    save: async (project) => void projects.set(project.id, project),
    remove: async (id) => void projects.delete(id),
  }
}

describe('project store', () => {
  it('creates, duplicates, and removes local projects', async () => {
    const ids = ['project-1', 'project-2']
    const store = createProjectStore(createMemoryRepository(), () => 100, () => ids.shift()!)

    const created = await store.getState().create('Dream Chip')
    expect(created).toMatchObject({ id: 'project-1', name: 'Dream Chip' })

    const duplicated = await store.getState().duplicate(created.id)
    expect(duplicated).toMatchObject({ id: 'project-2', name: 'Dream Chip Copy' })

    await store.getState().remove(created.id)
    expect(store.getState().projects).toEqual([duplicated])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/stores/projectStore.test.ts
```

Expected: FAIL because `projectStore.ts` does not exist.

- [ ] **Step 3: Implement CRUD state**

Create `src/stores/projectStore.ts`:

```ts
import { createStore } from 'zustand/vanilla'
import type { Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import type { ProjectRepository } from '../storage/projectRepository'

type ProjectState = {
  projects: Project[]
  load: () => Promise<void>
  create: (name: string) => Promise<Project>
  duplicate: (id: string) => Promise<Project>
  remove: (id: string) => Promise<void>
}

export function createProjectStore(
  repository: ProjectRepository,
  now = Date.now,
  createId = () => crypto.randomUUID(),
) {
  return createStore<ProjectState>((set, get) => ({
    projects: [],
    async load() {
      set({ projects: await repository.list() })
    },
    async create(name) {
      const project = createProject(name, createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
    async duplicate(id) {
      const source = get().projects.find((project) => project.id === id)
      if (source === undefined) throw new Error(`Project not found: ${id}`)

      const duplicated: Project = structuredClone({
        ...source,
        id: createId(),
        name: `${source.name} Copy`,
        createdAt: now(),
        updatedAt: now(),
      })
      await repository.save(duplicated)
      set({ projects: [duplicated, ...get().projects] })
      return duplicated
    },
    async remove(id) {
      await repository.remove(id)
      set({ projects: get().projects.filter((project) => project.id !== id) })
    },
  }))
}
```

- [ ] **Step 4: Verify CRUD state**

Run:

```bash
npm test -- src/stores/projectStore.test.ts
npm run build
```

Expected: project store tests pass and the build succeeds.

- [ ] **Step 5: Commit CRUD state**

Run:

```bash
git add src/stores
git commit -m "feat: add local project commands"
```

### Task 6: Add Dashboard Routing

**Files:**
- Modify: `src/app/App.tsx`
- Create: `src/features/projects/ProjectDashboard.tsx`
- Create: `src/features/projects/ProjectDashboard.test.tsx`

- [ ] **Step 1: Write a failing dashboard test**

Create `src/features/projects/ProjectDashboard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { ProjectDashboard } from './ProjectDashboard'

describe('ProjectDashboard', () => {
  it('creates a project from the dashboard', async () => {
    const createProjectCommand = vi.fn().mockResolvedValue(createProject('Dream Chip', 'project-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          createProject={createProjectCommand}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New Project' }))

    expect(createProjectCommand).toHaveBeenCalledWith('Untitled Dream Chip')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/projects/ProjectDashboard.test.tsx
```

Expected: FAIL because `ProjectDashboard.tsx` does not exist.

- [ ] **Step 3: Implement the dashboard component**

Create `src/features/projects/ProjectDashboard.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../domain/project'

type Props = {
  projects: Project[]
  createProject: (name: string) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
}

export function ProjectDashboard({
  projects,
  createProject,
  duplicateProject,
  removeProject,
}: Props) {
  const navigate = useNavigate()

  async function startProject() {
    const project = await createProject('Untitled Dream Chip')
    navigate(`/editor/${project.id}`)
  }

  return (
    <main className="min-h-screen bg-[#071015] p-8 text-[#d8f7ff]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.45em] text-cyan-300">CONCEPT FABRICATION TERMINAL</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[0.2em] uppercase">Virtual Silicon Lab</h1>
          </div>
          <button className="border border-cyan-300 px-4 py-2 text-sm uppercase" onClick={startProject}>
            New Project
          </button>
        </header>
        <section className="mt-12 grid grid-cols-3 gap-4">
          {projects.map((project) => (
            <article className="border border-cyan-900 bg-cyan-950/30 p-4" key={project.id}>
              <h2>{project.name}</h2>
              <div className="mt-4 flex gap-3 text-xs uppercase">
                <button onClick={() => navigate(`/editor/${project.id}`)}>Open</button>
                <button onClick={() => duplicateProject(project.id)}>Duplicate</button>
                <button onClick={() => removeProject(project.id)}>Delete</button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Wire dashboard route with a temporary in-memory adapter**

Replace `src/app/App.tsx` with:

```tsx
import { Route, Routes } from 'react-router-dom'
import { ProjectDashboard } from '../features/projects/ProjectDashboard'

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProjectDashboard
            projects={[]}
            createProject={async () => {
              throw new Error('Project store adapter is wired in Task 8')
            }}
            duplicateProject={async () => {
              throw new Error('Project store adapter is wired in Task 8')
            }}
            removeProject={async () => {
              throw new Error('Project store adapter is wired in Task 8')
            }}
          />
        }
      />
    </Routes>
  )
}
```

- [ ] **Step 5: Verify dashboard rendering**

Run:

```bash
npm test -- src/features/projects/ProjectDashboard.test.tsx src/app/App.test.tsx
npm run build
```

Expected: tests pass and the build succeeds.

- [ ] **Step 6: Commit dashboard route**

Run:

```bash
git add src/app src/features/projects
git commit -m "feat: add project dashboard"
```

### Task 7: Add Minimal Rectangular Chip Editor

**Files:**
- Create: `src/features/editor/BlockPalette.tsx`
- Create: `src/features/editor/EditorPage.tsx`
- Create: `src/features/editor/canvas/ChipStage.tsx`
- Create: `src/features/editor/canvas/ChipStage.test.tsx`

- [ ] **Step 1: Write a failing canvas test**

Create `src/features/editor/canvas/ChipStage.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { createProject } from '../../../domain/projectFactory'
import { buildBlock } from './ChipStage'

describe('buildBlock', () => {
  it('creates a bounded fantasy block at the next z-index', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    const block = buildBlock(project, 'DreamSynth', 'block-1')

    expect(block).toMatchObject({
      id: 'block-1',
      type: 'DreamSynth',
      category: 'fantasy',
      x: 32,
      y: 32,
      w: 192,
      h: 112,
      zIndex: 0,
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/features/editor/canvas/ChipStage.test.tsx
```

Expected: FAIL because `ChipStage.tsx` does not exist.

- [ ] **Step 3: Implement the palette, stage, and editor page**

Create `src/features/editor/BlockPalette.tsx`:

```tsx
import type { BlockType } from '../../domain/project'

const BLOCK_TYPES: BlockType[] = ['CPU', 'GPU', 'SRAM', 'DreamSynth', 'QuantumMemory', 'TimeCore']

export function BlockPalette({ addBlock }: { addBlock: (type: BlockType) => void }) {
  return (
    <aside className="w-56 border-r border-cyan-900 bg-[#071015] p-4">
      <h2 className="text-xs tracking-[0.3em] text-cyan-300">BLOCK LIBRARY</h2>
      <div className="mt-4 grid gap-2">
        {BLOCK_TYPES.map((type) => (
          <button
            className="border border-cyan-950 bg-cyan-950/30 px-3 py-2 text-left text-xs"
            key={type}
            onClick={() => addBlock(type)}
          >
            {type}
          </button>
        ))}
      </div>
    </aside>
  )
}
```

Create `src/features/editor/canvas/ChipStage.tsx`:

```tsx
import { Layer, Rect, Stage, Text } from 'react-konva'
import type { Block, BlockType, Project } from '../../../domain/project'
import { clampBlockToRect, snapToGrid } from './geometry'

const FANTASY_TYPES = new Set<BlockType>([
  'EmotionEngine',
  'DreamSynth',
  'QuantumMemory',
  'ConsciousnessProcessor',
  'RealityDistortionUnit',
  'TimeCore',
])

export function buildBlock(project: Project, type: BlockType, id = crypto.randomUUID()): Block {
  return {
    id,
    type,
    category: FANTASY_TYPES.has(type) ? 'fantasy' : 'real',
    x: 32,
    y: 32,
    w: 192,
    h: 112,
    rotation: 0,
    glow: true,
    zIndex: project.blocks.length,
  }
}

type Props = {
  project: Project
  updateBlock: (block: Block) => void
}

export function ChipStage({ project, updateBlock }: Props) {
  return (
    <Stage width={960} height={640}>
      <Layer>
        <Rect width={project.die.width} height={project.die.height} fill="#0b1d24" stroke="#22d3ee" />
        {project.blocks
          .slice()
          .sort((left, right) => left.zIndex - right.zIndex)
          .map((block) => (
            <Rect
              key={block.id}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              fill={block.category === 'fantasy' ? '#312e81' : '#164e63'}
              stroke={block.category === 'fantasy' ? '#a78bfa' : '#67e8f9'}
              draggable
              onDragEnd={(event) => {
                const position = clampBlockToRect(
                  {
                    x: snapToGrid(event.target.x(), 16),
                    y: snapToGrid(event.target.y(), 16),
                    w: block.w,
                    h: block.h,
                  },
                  project.die,
                )
                updateBlock({ ...block, ...position })
              }}
            />
          ))}
        {project.blocks.map((block) => (
          <Text key={`${block.id}-label`} x={block.x + 12} y={block.y + 12} text={block.type} fill="#ecfeff" />
        ))}
      </Layer>
    </Stage>
  )
}
```

Create `src/features/editor/EditorPage.tsx`:

```tsx
import type { Block, BlockType, Project } from '../../domain/project'
import { BlockPalette } from './BlockPalette'
import { buildBlock, ChipStage } from './canvas/ChipStage'

type Props = {
  project: Project
  saveProject: (project: Project) => Promise<void>
}

export function EditorPage({ project, saveProject }: Props) {
  function addBlock(type: BlockType) {
    void saveProject({ ...project, blocks: [...project.blocks, buildBlock(project, type)] })
  }

  function updateBlock(block: Block) {
    void saveProject({
      ...project,
      blocks: project.blocks.map((candidate) => (candidate.id === block.id ? block : candidate)),
    })
  }

  return (
    <main className="flex min-h-screen bg-[#03080b] text-[#d8f7ff]">
      <BlockPalette addBlock={addBlock} />
      <section className="p-8">
        <h1 className="mb-4 text-lg tracking-[0.25em] uppercase">{project.name}</h1>
        <ChipStage project={project} updateBlock={updateBlock} />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Verify block construction and build**

Run:

```bash
npm test -- src/features/editor/canvas/ChipStage.test.tsx
npm run build
```

Expected: block construction test passes and the build succeeds.

- [ ] **Step 5: Commit minimal editor**

Run:

```bash
git add src/features/editor
git commit -m "feat: add rectangular chip editor"
```

### Task 8: Wire Runtime Persistence And Routes

**Files:**
- Modify: `src/app/App.tsx`
- Create: `src/stores/projectStoreContext.tsx`
- Create: `src/stores/projectStoreContext.test.tsx`

- [ ] **Step 1: Write a failing runtime adapter test**

Create `src/stores/projectStoreContext.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import type { ProjectRepository } from '../storage/projectRepository'
import { ProjectStoreProvider, useProjectStore } from './projectStoreContext'

describe('ProjectStoreProvider', () => {
  it('loads stored projects and creates new projects', async () => {
    const stored = createProject('Stored Chip', 'stored-project', 100)
    const projects = new Map<string, Project>([[stored.id, stored]])
    const repository: ProjectRepository = {
      list: async () => [...projects.values()],
      get: async (id) => projects.get(id),
      save: async (project) => void projects.set(project.id, project),
      remove: async (id) => void projects.delete(id),
    }

    const { result } = renderHook(() => useProjectStore(), {
      wrapper: ({ children }) => <ProjectStoreProvider repository={repository}>{children}</ProjectStoreProvider>,
    })

    await waitFor(() => expect(result.current.projects).toEqual([stored]))
    await act(async () => void (await result.current.create('Dream Chip')))

    expect(result.current.projects).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/stores/projectStoreContext.test.tsx
```

Expected: FAIL because `projectStoreContext.tsx` does not exist.

- [ ] **Step 3: Extend project store with read and save commands**

In `src/stores/projectStore.ts`, add `get` and `save` to `ProjectState`:

```ts
  get: (id: string) => Promise<Project | undefined>
  save: (project: Project) => Promise<Project>
```

Add these actions inside the Zustand state initializer:

```ts
    async get(id) {
      return get().projects.find((project) => project.id === id) ?? repository.get(id)
    },
    async save(project) {
      const saved = { ...project, updatedAt: now() }
      await repository.save(saved)
      set({
        projects: [
          saved,
          ...get().projects.filter((candidate) => candidate.id !== saved.id),
        ],
      })
      return saved
    },
```

- [ ] **Step 4: Implement the React store adapter**

Create `src/stores/projectStoreContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createIndexedDbProjectRepository } from '../storage/indexedDbProjectRepository'
import { createLocalStorageProjectRepository } from '../storage/localStorageProjectRepository'
import type { ProjectRepository } from '../storage/projectRepository'
import { createResilientProjectRepository } from '../storage/resilientProjectRepository'
import { createProjectStore } from './projectStore'

function createDefaultRepository(): ProjectRepository {
  return createResilientProjectRepository(
    createIndexedDbProjectRepository(),
    createLocalStorageProjectRepository(),
  )
}

type Store = ReturnType<typeof createProjectStore>
const ProjectStoreContext = createContext<Store | undefined>(undefined)

export function ProjectStoreProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: ProjectRepository
}) {
  const store = useRef<Store | undefined>(undefined)
  store.current ??= createProjectStore(repository ?? createDefaultRepository())

  useEffect(() => {
    void store.current?.getState().load()
  }, [])

  return <ProjectStoreContext.Provider value={store.current}>{children}</ProjectStoreContext.Provider>
}

export function useProjectStore() {
  const store = useContext(ProjectStoreContext)
  if (store === undefined) throw new Error('ProjectStoreProvider is missing')

  return useStore(store)
}
```

The default repository is created lazily, so importing this module performs no IndexedDB work. Tests that inject a `repository` never construct it, and `App.test.tsx` relies on the global `fake-indexeddb` setup from Task 1.

- [ ] **Step 5: Wire dashboard and editor routes**

Replace `src/app/App.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import type { Project } from '../domain/project'
import { EditorPage } from '../features/editor/EditorPage'
import { ProjectDashboard } from '../features/projects/ProjectDashboard'
import { ProjectStoreProvider, useProjectStore } from '../stores/projectStoreContext'

function DashboardRoute() {
  const store = useProjectStore()
  return (
    <ProjectDashboard
      projects={store.projects}
      createProject={store.create}
      duplicateProject={store.duplicate}
      removeProject={store.remove}
    />
  )
}

function EditorRoute() {
  const { projectId = '' } = useParams()
  const store = useProjectStore()
  const [project, setProject] = useState<Project>()

  useEffect(() => {
    void store.get(projectId).then(setProject)
  }, [projectId])

  if (project === undefined) return <p className="p-8">Loading project...</p>

  return (
    <EditorPage
      project={project}
      saveProject={async (nextProject) => {
        setProject(await store.save(nextProject))
      }}
    />
  )
}

export function App() {
  return (
    <ProjectStoreProvider>
      <Routes>
        <Route path="/" element={<DashboardRoute />} />
        <Route path="/editor/:projectId" element={<EditorRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProjectStoreProvider>
  )
}
```

- [ ] **Step 6: Verify runtime adapter tests and build**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass and the production build succeeds.

- [ ] **Step 7: Commit runtime wiring**

Run:

```bash
git add src/app src/stores
git commit -m "feat: wire local project runtime"
```

### Task 9: Browser Verify The Vertical Slice

**Files:**
- Modify: `implementation.md`

- [ ] **Step 1: Start the development server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a localhost URL.

- [ ] **Step 2: Exercise the slice in the in-app Browser**

Use the Browser plugin to:

1. Open the localhost URL.
2. Click `New Project`.
3. Click `CPU`.
4. Click `DreamSynth`.
5. Drag `CPU` past the top-left die boundary.
6. Drag `DreamSynth` past the bottom-right die boundary.
7. Refresh the page.
8. Navigate back to `/`, reopen the project, and confirm both blocks remain.

Expected:

- Editor opens without login.
- Blocks appear on the rectangular die.
- Dragging clamps both blocks inside the die.
- Refresh and reopen preserve both blocks.

- [ ] **Step 3: Record implementation notes**

Append a dated section to `implementation.md` that records:

```markdown
## 2026-06-02 - Foundation vertical slice

### Implemented

- Added the local project dashboard and rectangular-die editor slice.
- Added IndexedDB persistence with localStorage fallback.
- Verified create, add-block, bounded drag, refresh, and reopen behavior in the in-app browser.

### Decisions

- Kept the first slice rectangular so circle and hexagon constraints can be added after the basic drag pipeline is verified.
- Kept serializable project JSON as the only persisted representation.
```

Append additional bullets when implementation reveals a deviation or trade-off.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected: tests and build pass. Git status only lists the intended `implementation.md` change.

- [ ] **Step 5: Commit verification notes**

Run:

```bash
git add implementation.md
git commit -m "docs: record foundation slice decisions"
```
