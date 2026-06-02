# Presets And Remixing (Milestone 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user start from one of six curated, visually distinct chips and remix it into an independent editable local project in one click.

**Architecture:** Add a pure `src/presets/` boundary with a small metadata catalog for dashboard cards and a blueprint factory that materializes ordinary serializable `Project` JSON. A remix receives fresh project, block, and decoration IDs, then enters the existing editor/autosave path; presets are immutable source data and are never persisted or mutated. Dashboard cards use lightweight HTML/CSS previews derived from metadata instead of mounting six extra Konva stages.

**Tech Stack:** React + TypeScript, Zustand (`zustand/vanilla`), Tailwind CSS, Vitest + React Testing Library. No new dependencies and no persisted-schema change.

---

## Context From Earlier Milestones

- `Project` is already a single serializable JSON object. Existing editor, autosave, and export paths accept an ordinary `Project`, so remixing should create that shape rather than introduce a second editor mode.
- `src/domain/heroChip.ts` already defines the first curated chip: AURORA C-1. Keep it as the canonical M3 visual-review artifact and reuse it as the `aurora-c1` preset.
- `docs/reference/hero-compositions.md` defines alternate composition B (`NEON DISTRICT N-9`) and C (`FIELD UNIT M-7`). They become presets in this milestone and remain candidates for the final hero set in M6.
- `project.die.background` is persisted but intentionally unused by the M3 canvas renderer. Presets set it now as a stable visual-intent key for the dedicated M5 poster stage.
- Existing dashboard cards are local saved projects only. M4 adds a separate preset section; clicking Remix creates a normal saved project and navigates to the same editor route.
- Baseline before this milestone: `npm test` = 20 files / 74 tests; `npm run build` passes with the known Vite chunk-size warning.

## Decisions Locked For M4

- Ship six presets: one per visual direction plus an additional neon landscape preset. Six stays inside the spec's 5–8 range while giving each theme at least one starting point.
- Keep preset metadata separate from blueprint payloads. Dashboard preview cards need a small stable shape; the full blocks, decorations, and fake specs stay in `presetFactory.ts`.
- Use CSS summary previews, not embedded `ChipStage` canvases or pre-rendered bitmap thumbnails. Cards must be fast, deterministic, and cheap to render. Full visual quality is shown immediately after Remix opens the editor.
- Treat "parametric" as materialization from curated blueprints into fresh editable JSON. User edits affect only the materialized project. Runtime random generation and parameter sliders are not required by the v1 spec.
- Keep `createHero()` for compatibility with the M3 tests, but remove its dashboard-only special button. AURORA C-1 becomes the first preset card.
- Do not add preset identity to persisted `Project`. It is not needed for editing or export, and avoiding it means no schema migration.

## File Structure

```text
src/
  presets/
    presetCatalog.ts             NEW small metadata catalog
    presetCatalog.test.ts
    presetFactory.ts             NEW curated blueprints + createPresetProject()
    presetFactory.test.ts
  stores/
    projectStore.ts              MODIFY add remixPreset()
    projectStore.test.ts         MODIFY
  features/
    projects/
      PresetCard.tsx             NEW lightweight CSS preview card
      PresetCard.test.tsx
      ProjectDashboard.tsx       MODIFY preset section; remove one-off hero loader
      ProjectDashboard.test.tsx  MODIFY
  app/
    App.tsx                      MODIFY pass catalog + remix command
implementation.md               MODIFY checkpoint notes
CLAUDE.md                       MODIFY milestone status and resume point
```

---

# Phase A - Pure Preset Engine (TDD)

### Task 1: Preset metadata catalog

**Files:**
- Create: `src/presets/presetCatalog.ts`
- Test: `src/presets/presetCatalog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/presets/presetCatalog.test.ts
import { describe, expect, it } from 'vitest'
import { PRESET_CATALOG } from './presetCatalog'

describe('preset catalog', () => {
  it('ships six presets covering every visual theme', () => {
    expect(PRESET_CATALOG).toHaveLength(6)
    expect(new Set(PRESET_CATALOG.map((preset) => preset.theme))).toEqual(
      new Set(['neon', 'retro', 'military', 'keynote', 'mono']),
    )
  })

  it('keeps ids unique and preview metadata populated', () => {
    expect(new Set(PRESET_CATALOG.map((preset) => preset.id)).size).toBe(PRESET_CATALOG.length)
    for (const preset of PRESET_CATALOG) {
      expect(preset.name.length).toBeGreaterThan(0)
      expect(preset.tagline.length).toBeGreaterThan(0)
      expect(preset.previewBlocks.length).toBeGreaterThanOrEqual(3)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/presets/presetCatalog.test.ts`

Expected: FAIL because `./presetCatalog` does not exist.

- [ ] **Step 3: Write the metadata catalog**

```ts
// src/presets/presetCatalog.ts
import type { BlockType, DieShape, StyleTheme } from '../domain/project'

export type PresetId =
  | 'aurora-c1'
  | 'neon-district-n9'
  | 'field-unit-m7'
  | 'lucid-88'
  | 'monolith-io'
  | 'solar-flare-x'

export type PresetMetadata = {
  id: PresetId
  name: string
  tagline: string
  theme: StyleTheme
  dieShape: DieShape
  accent: string
  featured: boolean
  previewBlocks: BlockType[]
}

export const PRESET_CATALOG: readonly PresetMetadata[] = [
  {
    id: 'aurora-c1',
    name: 'AURORA C-1',
    tagline: 'Consciousness Processor',
    theme: 'keynote',
    dieShape: 'square',
    accent: '#a06bff',
    featured: true,
    previewBlocks: ['CPU', 'GPU', 'ConsciousnessProcessor', 'QuantumMemory'],
  },
  {
    id: 'neon-district-n9',
    name: 'NEON DISTRICT N-9',
    tagline: 'Reality routing after dark',
    theme: 'neon',
    dieShape: 'hexagon',
    accent: '#22d3ee',
    featured: true,
    previewBlocks: ['IO', 'EmotionEngine', 'RealityDistortionUnit', 'GPU'],
  },
  {
    id: 'field-unit-m7',
    name: 'FIELD UNIT M-7',
    tagline: 'Temporal control for hostile environments',
    theme: 'military',
    dieShape: 'rect',
    accent: '#f4a000',
    featured: true,
    previewBlocks: ['IO', 'USB', 'TimeCore', 'SRAM'],
  },
  {
    id: 'lucid-88',
    name: 'LUCID-88',
    tagline: 'Warm phosphor dream synthesis',
    theme: 'retro',
    dieShape: 'circle',
    accent: '#ffb000',
    featured: false,
    previewBlocks: ['DSP', 'DreamSynth', 'SRAM', 'DAC'],
  },
  {
    id: 'monolith-io',
    name: 'MONOLITH I/O',
    tagline: 'Editorial-grade signal discipline',
    theme: 'mono',
    dieShape: 'square',
    accent: '#9db4cf',
    featured: false,
    previewBlocks: ['IO', 'USB', 'ADC', 'DAC'],
  },
  {
    id: 'solar-flare-x',
    name: 'SOLAR FLARE X',
    tagline: 'Overclocked emotion telemetry',
    theme: 'neon',
    dieShape: 'rect',
    accent: '#ff2bd6',
    featured: false,
    previewBlocks: ['GPU', 'EmotionEngine', 'DSP', 'Cache'],
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/presets/presetCatalog.test.ts`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/presets/presetCatalog.ts src/presets/presetCatalog.test.ts
git commit -m "feat: add curated preset metadata catalog"
```

---

### Task 2: Blueprint materialization into independent projects

**Files:**
- Create: `src/presets/presetFactory.ts`
- Test: `src/presets/presetFactory.test.ts`

- [ ] **Step 1: Write the failing factory tests**

```ts
// src/presets/presetFactory.test.ts
import { describe, expect, it } from 'vitest'
import { clampBlockToDie } from '../features/editor/canvas/geometry'
import { PRESET_CATALOG } from './presetCatalog'
import { createPresetProject } from './presetFactory'

describe('createPresetProject', () => {
  it('materializes every catalog entry as a bounded editable project', () => {
    for (const preset of PRESET_CATALOG) {
      const project = createPresetProject(preset.id, `project-${preset.id}`, 100)
      expect(project).toMatchObject({
        id: `project-${preset.id}`,
        theme: preset.theme,
        die: { shape: preset.dieShape },
        createdAt: 100,
        updatedAt: 100,
      })
      expect(project.blocks.length).toBeGreaterThanOrEqual(4)
      for (const block of project.blocks) {
        expect(clampBlockToDie(block, project.die)).toEqual(block)
      }
    }
  })

  it('creates fresh nested ids and arrays for each remix', () => {
    const first = createPresetProject('neon-district-n9', 'first', 100)
    const second = createPresetProject('neon-district-n9', 'second', 200)

    expect(first.blocks[0].id).not.toBe(second.blocks[0].id)
    expect(first.decorations[0].id).not.toBe(second.decorations[0].id)
    first.blocks[0].x = 999
    first.spec.features.push('Mutation')

    expect(second.blocks[0].x).not.toBe(999)
    expect(second.spec.features).not.toContain('Mutation')
  })

  it('reuses the reviewed AURORA composition as the keynote preset', () => {
    const project = createPresetProject('aurora-c1', 'aurora', 300)
    expect(project.name).toContain('AURORA C-1')
    expect(project.blocks.map((block) => block.type)).toContain('ConsciousnessProcessor')
    expect(project.spec.brand).toBe('AURORA')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/presets/presetFactory.test.ts`

Expected: FAIL because `./presetFactory` does not exist.

- [ ] **Step 3: Write the blueprint factory**

```ts
// src/presets/presetFactory.ts
import { createHeroChip } from '../domain/heroChip'
import { CURRENT_SCHEMA_VERSION, type Block, type Decoration, type Die, type FakeSpec, type Project, type StyleTheme } from '../domain/project'
import type { PresetId } from './presetCatalog'

type BlockBlueprint = Omit<Block, 'id' | 'zIndex'>
type DecorationBlueprint =
  | Omit<Extract<Decoration, { kind: 'neonLine' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'warningMark' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'label' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'sciFiObject' }>, 'id' | 'zIndex'>

type PresetBlueprint = {
  name: string
  die: Die
  theme: StyleTheme
  blocks: BlockBlueprint[]
  decorations: DecorationBlueprint[]
  spec: FakeSpec
}

const BLUEPRINTS: Record<Exclude<PresetId, 'aurora-c1'>, PresetBlueprint> = {
  'neon-district-n9': {
    name: 'NEON DISTRICT N-9 - Reality Routing Array',
    die: { shape: 'hexagon', width: 720, height: 720, background: 'neon-indigo-spotlight' },
    theme: 'neon',
    blocks: [
      { type: 'IO', category: 'real', x: 285, y: 112, w: 150, h: 72, rotation: 0, glow: true },
      { type: 'EmotionEngine', category: 'fantasy', x: 250, y: 240, w: 220, h: 108, rotation: 0, glow: true, colorOverride: '#22d3ee' },
      { type: 'RealityDistortionUnit', category: 'fantasy', x: 176, y: 382, w: 168, h: 92, rotation: 0, glow: true, colorOverride: '#ff2bd6' },
      { type: 'GPU', category: 'real', x: 376, y: 382, w: 168, h: 92, rotation: 0, glow: true },
      { type: 'QuantumMemory', category: 'fantasy', x: 250, y: 492, w: 220, h: 58, rotation: 0, glow: true },
    ],
    decorations: [
      { kind: 'label', x: 268, y: 202, text: 'NEON DISTRICT N-9' },
      { kind: 'neonLine', points: [250, 294, 176, 428], color: '#22d3ee' },
      { kind: 'neonLine', points: [470, 294, 544, 428], color: '#ff2bd6' },
      { kind: 'warningMark', x: 176, y: 382 },
    ],
    spec: {
      brand: 'NEXUS',
      series: 'N-9',
      generation: 'Night Shift',
      process: '1nm neon deposition',
      cores: 256,
      bandwidth: '12.8 PB/s',
      features: ['Overclock Halo', 'Magenta Bus', 'Glitch Shield'],
      description: 'Routes reality after dark. Warranty void in direct sunlight.',
    },
  },
  'field-unit-m7': {
    name: 'FIELD UNIT M-7 - Temporal Control Module',
    die: { shape: 'rect', width: 920, height: 600, background: 'military-gunmetal' },
    theme: 'military',
    blocks: [
      { type: 'IO', category: 'real', x: 72, y: 92, w: 150, h: 88, rotation: 0, glow: false },
      { type: 'USB', category: 'real', x: 72, y: 206, w: 150, h: 88, rotation: 0, glow: false },
      { type: 'TimeCore', category: 'fantasy', x: 310, y: 190, w: 300, h: 176, rotation: 0, glow: true },
      { type: 'SRAM', category: 'real', x: 682, y: 92, w: 160, h: 88, rotation: 0, glow: false },
      { type: 'Cache', category: 'real', x: 682, y: 206, w: 160, h: 88, rotation: 0, glow: false },
      { type: 'PLL', category: 'real', x: 682, y: 320, w: 160, h: 88, rotation: 0, glow: false },
    ],
    decorations: [
      { kind: 'label', x: 310, y: 146, text: 'AEGIS // FIELD UNIT M-7' },
      { kind: 'warningMark', x: 624, y: 190 },
      { kind: 'warningMark', x: 624, y: 332 },
    ],
    spec: {
      brand: 'AEGIS',
      series: 'M-7',
      generation: 'Field Revision',
      process: '3nm hardened deployment',
      cores: 32,
      bandwidth: '2.4 TB/s',
      features: ['Rad-Hardened', 'Faraday Seal', 'Failover Core'],
      description: 'Slows time by 1.5x in hostile environments. Warranty applies in peacetime only.',
    },
  },
  'lucid-88': {
    name: 'LUCID-88 - Dream Synthesis Disc',
    die: { shape: 'circle', width: 720, height: 720, background: 'retro-phosphor' },
    theme: 'retro',
    blocks: [
      { type: 'DSP', category: 'real', x: 278, y: 136, w: 164, h: 82, rotation: 0, glow: true },
      { type: 'DreamSynth', category: 'fantasy', x: 238, y: 278, w: 244, h: 132, rotation: 0, glow: true },
      { type: 'SRAM', category: 'real', x: 166, y: 444, w: 164, h: 82, rotation: 0, glow: false },
      { type: 'DAC', category: 'real', x: 390, y: 444, w: 164, h: 82, rotation: 0, glow: false },
    ],
    decorations: [
      { kind: 'label', x: 288, y: 238, text: 'LUCID-88' },
      { kind: 'neonLine', points: [330, 485, 390, 485], color: '#d4af37' },
    ],
    spec: {
      brand: 'ONEIRIC',
      series: 'LUCID-88',
      generation: 'Cassette Future',
      process: '8-bit ceramic reverie',
      cores: 8,
      bandwidth: '88 GB/s',
      features: ['Warm Boot', 'Phosphor Cache', 'REM Oscillator'],
      description: 'Synthesizes dreams with the warmth of an aging terminal.',
    },
  },
  'monolith-io': {
    name: 'MONOLITH I/O - Signal Discipline Array',
    die: { shape: 'square', width: 720, height: 720, background: 'mono-editorial' },
    theme: 'mono',
    blocks: [
      { type: 'IO', category: 'real', x: 96, y: 110, w: 220, h: 94, rotation: 0, glow: false },
      { type: 'USB', category: 'real', x: 404, y: 110, w: 220, h: 94, rotation: 0, glow: false },
      { type: 'ADC', category: 'real', x: 96, y: 300, w: 220, h: 120, rotation: 0, glow: false },
      { type: 'DAC', category: 'real', x: 404, y: 300, w: 220, h: 120, rotation: 0, glow: false },
      { type: 'Cache', category: 'real', x: 178, y: 510, w: 364, h: 82, rotation: 0, glow: true },
    ],
    decorations: [
      { kind: 'label', x: 256, y: 252, text: 'MONOLITH // SIGNAL DISCIPLINE' },
      { kind: 'neonLine', points: [316, 360, 404, 360], color: '#9db4cf' },
    ],
    spec: {
      brand: 'MONOLITH',
      series: 'I/O',
      generation: 'Edition 01',
      process: '14nm editorial lithography',
      cores: 4,
      bandwidth: '640 GB/s',
      features: ['Quiet Bus', 'Reference Clock', 'Single-Hue Compliance'],
      description: 'Refuses unnecessary color and most unnecessary meetings.',
    },
  },
  'solar-flare-x': {
    name: 'SOLAR FLARE X - Emotion Telemetry Engine',
    die: { shape: 'rect', width: 920, height: 600, background: 'neon-magenta-horizon' },
    theme: 'neon',
    blocks: [
      { type: 'GPU', category: 'real', x: 80, y: 100, w: 250, h: 126, rotation: 0, glow: true },
      { type: 'EmotionEngine', category: 'fantasy', x: 362, y: 198, w: 300, h: 166, rotation: 0, glow: true, colorOverride: '#ff2bd6' },
      { type: 'DSP', category: 'real', x: 704, y: 100, w: 140, h: 104, rotation: 0, glow: true },
      { type: 'Cache', category: 'real', x: 704, y: 244, w: 140, h: 104, rotation: 0, glow: false },
      { type: 'QuantumMemory', category: 'fantasy', x: 80, y: 438, w: 764, h: 72, rotation: 0, glow: true },
    ],
    decorations: [
      { kind: 'label', x: 362, y: 152, text: 'SOLAR FLARE X' },
      { kind: 'neonLine', points: [330, 163, 362, 281], color: '#22d3ee' },
      { kind: 'neonLine', points: [662, 281, 704, 296], color: '#ff2bd6' },
    ],
    spec: {
      brand: 'HELIOGRAPH',
      series: 'X',
      generation: 'Coronal',
      process: '0.8nm solar etch',
      cores: 144,
      bandwidth: '9.6 PB/s',
      features: ['Mood Telemetry', 'Coronal Cache', 'Cyan Failover'],
      description: 'Measures emotion at unsafe clock speeds.',
    },
  },
}

function materializeDecoration(blueprint: DecorationBlueprint, id: string, zIndex: number): Decoration {
  if (blueprint.kind === 'neonLine') return { ...blueprint, points: [...blueprint.points], id, zIndex }
  return { ...blueprint, id, zIndex }
}

export function createPresetProject(
  presetId: PresetId,
  id: string = crypto.randomUUID(),
  now = Date.now(),
): Project {
  if (presetId === 'aurora-c1') return createHeroChip(id, now)

  const blueprint = BLUEPRINTS[presetId]
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: blueprint.name,
    createdAt: now,
    updatedAt: now,
    die: { ...blueprint.die },
    blocks: blueprint.blocks.map((block, index) => ({ ...block, id: `${id}-block-${index}`, zIndex: index })),
    decorations: blueprint.decorations.map((decoration, index) =>
      materializeDecoration(decoration, `${id}-decoration-${index}`, index),
    ),
    theme: blueprint.theme,
    spec: { ...blueprint.spec, features: [...blueprint.spec.features] },
  }
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npx vitest run src/presets/presetFactory.test.ts`

Expected: PASS (3 tests). If a bounded-layout assertion fails, adjust only that preset's blueprint coordinates until every factory block equals `clampBlockToDie(block, project.die)`.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test && npm run build`

Expected: all tests pass; build succeeds with only the known chunk-size warning.

- [ ] **Step 6: Commit**

```bash
git add src/presets/presetFactory.ts src/presets/presetFactory.test.ts
git commit -m "feat: materialize independent projects from preset blueprints"
```

---

### Task 3: Project store remix command

**Files:**
- Modify: `src/stores/projectStore.ts`
- Modify: `src/stores/projectStore.test.ts`

- [ ] **Step 1: Add the failing store test**

Add this test inside `describe('project store', ...)`:

```ts
  it('persists an independent preset remix and lists it first', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(repository, () => 1000, () => `remix-${n++}`)

    const first = await store.getState().remixPreset('neon-district-n9')
    const second = await store.getState().remixPreset('neon-district-n9')

    expect(first).toMatchObject({ id: 'remix-0', theme: 'neon', die: { shape: 'hexagon' } })
    expect(second.id).toBe('remix-1')
    expect(second.blocks[0].id).not.toBe(first.blocks[0].id)
    expect(store.getState().projects.map((project) => project.id)).toEqual(['remix-1', 'remix-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/projectStore.test.ts`

Expected: FAIL because `remixPreset` is not a function.

- [ ] **Step 3: Add the store command**

Add imports:

```ts
import type { PresetId } from '../presets/presetCatalog'
import { createPresetProject } from '../presets/presetFactory'
```

Add the state signature:

```ts
  remixPreset: (presetId: PresetId) => Promise<Project>
```

Add this command after `createHero()`:

```ts
    async remixPreset(presetId) {
      const project = createPresetProject(presetId, createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/stores/projectStore.test.ts && npm test && npm run build`

Expected: focused tests and full suite pass; build succeeds with only the known chunk-size warning.

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/projectStore.test.ts
git commit -m "feat: persist editable preset remixes"
```

---

# Phase B - Dashboard Preview Cards And Browser Gate

### Task 4: Lightweight preset preview card

**Files:**
- Create: `src/features/projects/PresetCard.tsx`
- Test: `src/features/projects/PresetCard.test.tsx`

- [ ] **Step 1: Write the failing DOM test**

```tsx
// src/features/projects/PresetCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { PresetCard } from './PresetCard'

describe('PresetCard', () => {
  it('summarizes a preset and starts a remix', async () => {
    const remix = vi.fn()
    render(<PresetCard preset={PRESET_CATALOG[1]} onRemix={remix} />)

    expect(screen.getByText('NEON DISTRICT N-9')).toBeInTheDocument()
    expect(screen.getByText('hexagon / neon')).toBeInTheDocument()
    expect(screen.getByText('EmotionEngine')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remix NEON DISTRICT N-9' }))
    expect(remix).toHaveBeenCalledWith('neon-district-n9')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/projects/PresetCard.test.tsx`

Expected: FAIL because `./PresetCard` does not exist.

- [ ] **Step 3: Write the preview card**

```tsx
// src/features/projects/PresetCard.tsx
import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'

type Props = {
  preset: PresetMetadata
  onRemix: (id: PresetId) => void
}

const SHAPE_CLASSES: Record<PresetMetadata['dieShape'], string> = {
  rect: 'aspect-[3/2]',
  square: 'aspect-square',
  circle: 'aspect-square rounded-full',
  hexagon: 'aspect-square [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]',
}

export function PresetCard({ preset, onRemix }: Props) {
  return (
    <article className="border border-slate-700 bg-slate-950/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-slate-500">{preset.theme}</p>
          <h3 className="mt-2 text-sm font-semibold tracking-[0.18em] text-slate-100">{preset.name}</h3>
          <p className="mt-2 text-xs text-slate-400">{preset.tagline}</p>
        </div>
        {preset.featured && <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Hero</span>}
      </div>
      <div className="mx-auto mt-5 w-32 bg-slate-900 p-3" style={{ boxShadow: `0 0 24px ${preset.accent}55` }}>
        <div className={`grid grid-cols-2 gap-1 border border-slate-600 bg-slate-950/90 p-2 ${SHAPE_CLASSES[preset.dieShape]}`}>
          {preset.previewBlocks.slice(0, 4).map((block) => (
            <span className="truncate border border-slate-700 px-1 py-2 text-[8px] text-slate-300" key={block}>
              {block}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-slate-500">
        {preset.dieShape} / {preset.theme}
      </p>
      <button
        className="mt-4 border px-3 py-2 text-xs uppercase tracking-[0.2em]"
        onClick={() => onRemix(preset.id)}
        style={{ borderColor: preset.accent, color: preset.accent }}
      >
        Remix {preset.name}
      </button>
    </article>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/features/projects/PresetCard.test.tsx`

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/PresetCard.tsx src/features/projects/PresetCard.test.tsx
git commit -m "feat: add preset preview cards"
```

---

### Task 5: Dashboard preset gallery and remix navigation

**Files:**
- Modify: `src/features/projects/ProjectDashboard.tsx`
- Modify: `src/features/projects/ProjectDashboard.test.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Update dashboard tests to describe the gallery**

Replace `src/features/projects/ProjectDashboard.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { ProjectDashboard } from './ProjectDashboard'

describe('ProjectDashboard', () => {
  it('creates a blank project from the dashboard', async () => {
    const createProjectCommand = vi.fn().mockResolvedValue(createProject('Dream Chip', 'project-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={createProjectCommand}
          remixPreset={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New Project' }))
    expect(createProjectCommand).toHaveBeenCalledWith('Untitled Dream Chip')
  })

  it('shows all presets and remixes the selected one', async () => {
    const remixPreset = vi.fn().mockResolvedValue(createProject('Remix', 'remix-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          remixPreset={remixPreset}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('button', { name: /^Remix / })).toHaveLength(6)
    await userEvent.click(screen.getByRole('button', { name: 'Remix NEON DISTRICT N-9' }))
    expect(remixPreset).toHaveBeenCalledWith('neon-district-n9')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/projects/ProjectDashboard.test.tsx`

Expected: FAIL because `ProjectDashboard` does not accept `presets` or `remixPreset`.

- [ ] **Step 3: Replace the one-off hero loader with the preset gallery**

Update imports and props in `src/features/projects/ProjectDashboard.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../domain/project'
import type { PresetId, PresetMetadata } from '../../presets/presetCatalog'
import { PresetCard } from './PresetCard'

type Props = {
  projects: Project[]
  presets: readonly PresetMetadata[]
  createProject: (name: string) => Promise<Project>
  remixPreset: (id: PresetId) => Promise<Project>
  duplicateProject: (id: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
}
```

Update the function arguments:

```tsx
export function ProjectDashboard({
  projects,
  presets,
  createProject,
  remixPreset,
  duplicateProject,
  removeProject,
}: Props) {
```

Replace `startHero()` with:

```tsx
  async function startRemix(id: PresetId) {
    const project = await remixPreset(id)
    navigate(`/editor/${project.id}`)
  }
```

Remove the `Load Hero Chip` button. Keep the existing `New Project` button, then add this section before the saved-project `<section>`:

```tsx
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Curated Starting Points</p>
              <h2 className="mt-2 text-xl uppercase tracking-[0.18em]">Remix a preset</h2>
            </div>
            <p className="max-w-md text-right text-xs text-slate-400">
              Every remix becomes an independent local project. Change the theme, layout, and blocks freely.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {presets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onRemix={startRemix} />
            ))}
          </div>
        </section>
        <section className="mt-12">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Local Projects</p>
          <div className="mt-5 grid grid-cols-3 gap-4">
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
          </div>
        </section>
```

Delete the old saved-project `<section>` so projects render only once.

- [ ] **Step 4: Wire catalog and remix command in the app route**

Add the catalog import in `src/app/App.tsx`:

```tsx
import { PRESET_CATALOG } from '../presets/presetCatalog'
```

Replace the dashboard props:

```tsx
    <ProjectDashboard
      projects={store.projects}
      presets={PRESET_CATALOG}
      createProject={store.create}
      remixPreset={store.remixPreset}
      duplicateProject={store.duplicate}
      removeProject={store.remove}
    />
```

- [ ] **Step 5: Verify**

Run: `npx vitest run src/features/projects/ProjectDashboard.test.tsx src/features/projects/PresetCard.test.tsx && npm test && npm run build`

Expected: focused tests and full suite pass; build succeeds with only the known chunk-size warning.

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/ProjectDashboard.tsx src/features/projects/ProjectDashboard.test.tsx src/app/App.tsx
git commit -m "feat: start editable remixes from the dashboard"
```

---

### Task 6: Browser verification, project memory, and milestone checkpoint

**Files:**
- Modify: `implementation.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Start the development server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a localhost URL.

- [ ] **Step 2: Verify the preset gallery in the in-app Browser**

Open the shown localhost URL with the Browser plugin and verify:

1. Dashboard shows six preset cards in a separate "Remix a preset" section and the blank "New Project" path still works.
2. Cards visibly distinguish the six starting points by theme, die shape, accent, and block labels without console errors.
3. Click Remix on `AURORA C-1`; the reviewed keynote chip opens and remains editable.
4. Return to dashboard, click Remix on `NEON DISTRICT N-9`; the hex neon composition opens with cyan/magenta routing and fantasy anchors.
5. Return to dashboard, click Remix on `FIELD UNIT M-7`; the wide matte military composition opens and does not read as the neon chip recolored.
6. Edit the N-9 remix by changing its theme or moving a block, return to dashboard, remix N-9 again, and confirm the new remix has the original N-9 blueprint layout. This proves source immutability from the UI.
7. Refresh one edited remix and confirm IndexedDB restoration.
8. Confirm browser console errors remain empty.

- [ ] **Step 3: Record decisions and verification**

Append a dated M4 completion section to `implementation.md` covering:

- the new pure `src/presets/` boundary;
- six preset ids and which three are hero candidates;
- CSS summary previews instead of extra Konva stages or bitmap thumbnails;
- ordinary `Project` JSON materialization with fresh project/block/decoration IDs;
- no persisted-schema change and no source-preset mutation;
- browser verification results and the next resume point: M5, beginning with `docs/superpowers/plans/2026-06-02-specs-and-export.md`.

Update the Milestone Status section in `CLAUDE.md`: mark M4 complete and point the next code milestone at M5.

- [ ] **Step 4: Final verification**

Run:

```bash
npm test
npm run build
git status --short
```

Expected: all tests pass, build succeeds with only the known chunk-size warning, and status contains only the intended M4 files plus docs.

- [ ] **Step 5: Commit the milestone notes**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record presets and remixing milestone"
```

---

## Cross-Cutting Verification

Run after every code task:

```bash
npm test
npm run build
```

Browser verification is required after Task 5 because the gallery and navigation are user-facing. Record visual and architectural observations in `implementation.md`.

## Requirement Coverage (Milestone 4)

- 5–8 curated parametric presets -> Tasks 1–2 ship six curated blueprints.
- preset catalog metadata and preview cards -> Tasks 1 and 4.
- remix action creates an independent editable project -> Tasks 2–3.
- dashboard starts a remix and navigates into the existing editor -> Task 5.
- editing a remix never mutates its source preset -> Task 2 test + Task 6 browser check.
- user can start from a preset and produce a distinct chip under five minutes -> Task 6 browser flow.
- remaining hero chips selected from curated presets -> N-9 and M-7 come from the approved reference alternates and are manually checked in Task 6.

## Self-Review Notes

**Spec coverage:** The roadmap M4 outcomes are covered by Tasks 1–6. M5 fake specs/export and M6 landing-page hero presentation remain deferred.

**Schema consistency:** Presets materialize the existing `Project` shape with `CURRENT_SCHEMA_VERSION`; no field is added and no migration is needed. `PresetId` is shared by catalog, factory, store, and dashboard.

**Boundary consistency:** `src/presets/` imports only pure domain code. Store owns persistence. Dashboard owns preview UI and navigation. Editor and canvas need no M4 changes.

**Visual trade-off:** CSS preview cards are deliberate summary previews, not export-quality renders. They avoid six live Konva stages on the dashboard; Remix immediately opens the full Konva-rendered project.

**Deferred-but-named:** Spec form, die-only crop/high-DPI output, poster export stage, and sharing are M5. Landing hero presentation, README, and demo GIF are M6.
