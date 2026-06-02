# Visual System (Milestone 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every die a coherent, reference-quality look — five one-click themes, Konva-rendered glow/gradients/decorations, and the first hero chip — so the editor stops looking like an EDA tool and starts looking like an Apple-keynote / Sci-Fi product shot.

**Architecture:** A new pure `src/themes/` boundary holds the theme catalog (concrete tokens sourced from `docs/reference/visual-direction.md`) and pure style/gradient resolvers — all unit-tested. The Konva canvas (`ChipStage`) and toolbar consume those tokens; canvas rendering is browser-verified, not unit-tested (jsdom lacks canvas), exactly as in Milestone 2. The serializable Project JSON stays the single source of truth: `project.theme` drives all visual tokens at render time, so a theme switch recolors the whole die with no data migration.

**Tech Stack:** React + TypeScript, Konva + React Konva, Zustand (`zustand/vanilla`), Vitest + React Testing Library. No new dependencies. No bundled image assets — texture is procedural (Konva nodes) per the spec's "Konva-native effects only" rule.

---

## Context From Earlier Milestones

- `project.theme: StyleTheme` (`'neon' | 'retro' | 'military' | 'keynote' | 'mono'`) already exists in `src/domain/project.ts` but is **not consumed** anywhere — `ChipStage` hardcodes every color. M3 makes the theme the source of truth.
- `Decoration` (`neonLine | warningMark | label | sciFiObject`) is defined in the domain but **never rendered**; `decorations` is always `[]`.
- `Block.glow?` and `Block.colorOverride?` exist; glow is rendered with a hardcoded cyan shadow, `colorOverride` is unused.
- Editor commands live in `src/stores/editorStore.ts` (vanilla zustand, `commit()` pushes undo history). Pure geometry/factories are unit-tested directly; Konva is browser-verified. Tests use explicit `import { describe, expect, it } from 'vitest'` (no globals).
- Baseline before this milestone: `npm test` = 14 files / 43 tests; `npm run build` passes (≈557 kB bundle, pre-existing chunk-size warning is expected — not a regression).

## Reference Inputs (the visual contract)

- Theme tokens (palettes, glow intent, anti-references): `docs/reference/visual-direction.md`.
- First hero chip composition A ("AURORA C-1 — Consciousness Processor"): `docs/reference/hero-compositions.md`.
- Global anti-reference (do not look like an EDA tool): `docs/reference/README.md`.

## File Structure

```text
src/
  themes/                         NEW pure boundary (no React/Konva/Zustand/IndexedDB)
    themeTokens.ts                ThemeTokens type + THEMES catalog + resolveTheme()
    themeTokens.test.ts
    gradients.ts                  pure Konva gradient-prop builders
    gradients.test.ts
    resolveStyle.ts               pure block/decoration style resolvers
    resolveStyle.test.ts
  domain/
    decorationFactory.ts          NEW buildDecoration() + nextDecorationZIndex() (pure)
    decorationFactory.test.ts
    heroChip.ts                   NEW createHeroChip() -> Project (composition A, pure)
    heroChip.test.ts
  stores/
    editorStore.ts                MODIFY add setTheme() + addDecoration()
    editorStore.test.ts           MODIFY
    projectStore.ts               MODIFY add createHero()
    projectStore.test.ts          MODIFY
  features/
    editor/
      canvas/
        blockTexture.ts           NEW blockVisual() + memoryCells() (pure)
        blockTexture.test.ts
        ChipStage.tsx             MODIFY theme-driven die/grid/blocks/decorations + stage ref + export
      EditorToolbar.tsx           MODIFY theme picker + decoration adders
      EditorToolbar.test.tsx      MODIFY
      EditorPage.tsx              MODIFY wire setTheme + addDecoration
    export/
      exportStage.ts              NEW minimal PNG download helper (browser-only)
    projects/
      ProjectDashboard.tsx        MODIFY "Load Hero Chip" button
```

## Scope For This Milestone

**In scope (M3 acceptance gate):** theme catalog of 5 themes; Konva-rendered gradients, `shadowBlur` glow, and additive-blend neon lines; decoration rendering (label / warningMark / neonLine, plus a `sciFiObject` fallback); procedural memory-array texture; the first hero chip (composition A); one-click theme switching that recolors the whole die; a minimal die-only PNG export smoke test proving effects are Konva-rendered.

**Deferred (later milestones, noted so no one builds them here):** the dedicated poster export stage, high-DPI dual export, and Web Share (M5); curated preset catalog and remixing (M4); interactive decoration selection/drag/text-editing and `Konva.Filters` blur (post-M3 — `shadowBlur` + additive blend deliver the look without node caching). A mis-added decoration is removed with **Undo**, so no decoration-delete UI is built now.

---

# Phase A — Pure visual engine (TDD, unit-tested)

### Task 1: Theme token catalog

**Files:**
- Create: `src/themes/themeTokens.ts`
- Test: `src/themes/themeTokens.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/themes/themeTokens.test.ts
import { describe, expect, it } from 'vitest'
import type { StyleTheme } from '../domain/project'
import { THEMES, resolveTheme } from './themeTokens'

const ALL_THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']

describe('theme catalog', () => {
  it('defines tokens for every theme', () => {
    for (const theme of ALL_THEMES) {
      expect(THEMES[theme]).toBeDefined()
      expect(THEMES[theme].name).toBe(theme)
    }
  })

  it('resolveTheme returns the matching token set', () => {
    expect(resolveTheme('keynote')).toBe(THEMES.keynote)
  })

  it('keeps every accent budget within 1..3 hues', () => {
    for (const theme of ALL_THEMES) {
      expect(THEMES[theme].accents.length).toBeGreaterThanOrEqual(1)
      expect(THEMES[theme].accents.length).toBeLessThanOrEqual(3)
    }
  })

  it('uses valid glow and gradient values', () => {
    for (const theme of ALL_THEMES) {
      const t = THEMES[theme]
      expect(t.glow.shadowBlur).toBeGreaterThanOrEqual(0)
      expect(t.glow.shadowOpacity).toBeGreaterThanOrEqual(0)
      expect(t.glow.shadowOpacity).toBeLessThanOrEqual(1)
      expect(t.dieFill.length).toBeGreaterThanOrEqual(2)
      for (const stop of [...t.dieFill, ...t.background]) {
        expect(stop.offset).toBeGreaterThanOrEqual(0)
        expect(stop.offset).toBeLessThanOrEqual(1)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/themes/themeTokens.test.ts`
Expected: FAIL — cannot find module `./themeTokens`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/themes/themeTokens.ts
import type { StyleTheme } from '../domain/project'

export type ColorStop = { offset: number; color: string }

export type Glow = {
  shadowColor: string
  shadowBlur: number
  shadowOpacity: number
}

export type ThemeTokens = {
  name: StyleTheme
  background: ColorStop[] // radial backdrop (editor ambiance now; poster stage in M5)
  dieFill: ColorStop[] // die base, vertical gradient
  dieStroke: string
  dieStrokeWidth: number
  gridColor: string
  blockFill: { real: string; fantasy: string }
  blockStroke: { real: string; fantasy: string }
  selectStroke: string
  accents: string[] // 1..3 hues; accents[0] is the signature
  glow: Glow
  text: string
}

export const THEMES: Record<StyleTheme, ThemeTokens> = {
  neon: {
    name: 'neon',
    background: [
      { offset: 0, color: '#0b0420' },
      { offset: 1, color: '#05060a' },
    ],
    dieFill: [
      { offset: 0, color: '#11162a' },
      { offset: 1, color: '#0d1117' },
    ],
    dieStroke: '#22d3ee',
    dieStrokeWidth: 1.5,
    gridColor: '#15314a',
    blockFill: { real: '#13203a', fantasy: '#1b1640' },
    blockStroke: { real: '#22d3ee', fantasy: '#a855f7' },
    selectStroke: '#f0abfc',
    accents: ['#22d3ee', '#ff2bd6', '#a855f7'],
    glow: { shadowColor: '#22d3ee', shadowBlur: 28, shadowOpacity: 0.8 },
    text: '#e6f9ff',
  },
  retro: {
    name: 'retro',
    background: [
      { offset: 0, color: '#1a1208' },
      { offset: 1, color: '#0f0a04' },
    ],
    dieFill: [
      { offset: 0, color: '#33291a' },
      { offset: 1, color: '#241d10' },
    ],
    dieStroke: '#d4af37',
    dieStrokeWidth: 1.5,
    gridColor: '#3a2f14',
    blockFill: { real: '#3a3320', fantasy: '#3f2e16' },
    blockStroke: { real: '#8a6d1f', fantasy: '#c2570f' },
    selectStroke: '#ffd166',
    accents: ['#ffb000', '#33ff66', '#c2570f'],
    glow: { shadowColor: '#ffb000', shadowBlur: 16, shadowOpacity: 0.5 },
    text: '#ffb000',
  },
  military: {
    name: 'military',
    background: [
      { offset: 0, color: '#14181a' },
      { offset: 1, color: '#0e1112' },
    ],
    dieFill: [
      { offset: 0, color: '#2f3a2c' },
      { offset: 1, color: '#222826' },
    ],
    dieStroke: '#6b7d4f',
    dieStrokeWidth: 2,
    gridColor: '#2a322b',
    blockFill: { real: '#23282a', fantasy: '#2a2d22' },
    blockStroke: { real: '#4a5550', fantasy: '#6b7d4f' },
    selectStroke: '#c2a878',
    accents: ['#c2a878', '#f4a000', '#c0392b'],
    glow: { shadowColor: '#f4a000', shadowBlur: 8, shadowOpacity: 0.35 },
    text: '#c2a878',
  },
  keynote: {
    name: 'keynote',
    background: [
      { offset: 0, color: '#15151a' },
      { offset: 1, color: '#0a0a0c' },
    ],
    dieFill: [
      { offset: 0, color: '#3a3d42' },
      { offset: 1, color: '#26282c' },
    ],
    dieStroke: '#4a4d52',
    dieStrokeWidth: 1,
    gridColor: '#34373c',
    blockFill: { real: '#33363b', fantasy: '#3a323f' },
    blockStroke: { real: '#54575d', fantasy: '#a06bff' },
    selectStroke: '#ffffff',
    accents: ['#a06bff', '#ff8a5c'],
    glow: { shadowColor: '#a06bff', shadowBlur: 44, shadowOpacity: 0.45 },
    text: '#f5f5f7',
  },
  mono: {
    name: 'mono',
    background: [
      { offset: 0, color: '#101216' },
      { offset: 1, color: '#0c0c0d' },
    ],
    dieFill: [
      { offset: 0, color: '#1c1f23' },
      { offset: 1, color: '#141619' },
    ],
    dieStroke: '#3a3f45',
    dieStrokeWidth: 1,
    gridColor: '#23272c',
    blockFill: { real: '#1e2125', fantasy: '#2a2e33' },
    blockStroke: { real: '#4a4f55', fantasy: '#6b727a' },
    selectStroke: '#e8ebef',
    accents: ['#9db4cf'],
    glow: { shadowColor: '#9db4cf', shadowBlur: 14, shadowOpacity: 0.3 },
    text: '#c8ccd2',
  },
}

export function resolveTheme(theme: StyleTheme): ThemeTokens {
  return THEMES[theme]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/themes/themeTokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/themes/themeTokens.ts src/themes/themeTokens.test.ts
git commit -m "feat: add theme token catalog for five visual themes"
```

---

### Task 2: Gradient prop builders

**Files:**
- Create: `src/themes/gradients.ts`
- Test: `src/themes/gradients.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/themes/gradients.test.ts
import { describe, expect, it } from 'vitest'
import type { ColorStop } from './themeTokens'
import { dieFillProps, flattenStops, linearGradientProps } from './gradients'

const STOPS: ColorStop[] = [
  { offset: 0, color: '#fff' },
  { offset: 1, color: '#000' },
]

describe('gradients', () => {
  it('flattens stops into Konva colorStops form', () => {
    expect(flattenStops(STOPS)).toEqual([0, '#fff', 1, '#000'])
  })

  it('builds a top-to-bottom linear gradient', () => {
    const props = linearGradientProps(100, 200, STOPS)
    expect(props.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 })
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 0, y: 200 })
    expect(props.fillLinearGradientColorStops).toEqual([0, '#fff', 1, '#000'])
  })

  it('centers the die gradient for radial shapes on their local origin', () => {
    const rect = dieFillProps('rect', 100, 200, STOPS)
    expect(rect.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 })
    expect(rect.fillLinearGradientEndPoint).toEqual({ x: 0, y: 200 })

    const circle = dieFillProps('circle', 300, 300, STOPS)
    expect(circle.fillLinearGradientStartPoint).toEqual({ x: 0, y: -150 })
    expect(circle.fillLinearGradientEndPoint).toEqual({ x: 0, y: 150 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/themes/gradients.test.ts`
Expected: FAIL — cannot find module `./gradients`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/themes/gradients.ts
import type { DieShape } from '../domain/project'
import type { ColorStop } from './themeTokens'

export function flattenStops(stops: ColorStop[]): (number | string)[] {
  return stops.flatMap((stop) => [stop.offset, stop.color])
}

export type LinearGradientProps = {
  fillLinearGradientStartPoint: { x: number; y: number }
  fillLinearGradientEndPoint: { x: number; y: number }
  fillLinearGradientColorStops: (number | string)[]
}

export function linearGradientProps(width: number, height: number, stops: ColorStop[]): LinearGradientProps {
  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 0, y: height },
    fillLinearGradientColorStops: flattenStops(stops),
  }
}

// Rect/square dies draw from their top-left origin; circle/hexagon dies draw
// from their center origin, so the gradient must be offset to span the shape.
export function dieFillProps(
  shape: DieShape,
  width: number,
  height: number,
  stops: ColorStop[],
): LinearGradientProps {
  if (shape === 'circle' || shape === 'hexagon') {
    const radius = width / 2
    return {
      fillLinearGradientStartPoint: { x: 0, y: -radius },
      fillLinearGradientEndPoint: { x: 0, y: radius },
      fillLinearGradientColorStops: flattenStops(stops),
    }
  }
  return linearGradientProps(width, height, stops)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/themes/gradients.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/themes/gradients.ts src/themes/gradients.test.ts
git commit -m "feat: add Konva gradient prop builders"
```

---

### Task 3: Block and decoration style resolvers

**Files:**
- Create: `src/themes/resolveStyle.ts`
- Test: `src/themes/resolveStyle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/themes/resolveStyle.test.ts
import { describe, expect, it } from 'vitest'
import type { Block, Decoration } from '../domain/project'
import { THEMES } from './themeTokens'
import { resolveBlockStyle, resolveDecorationStyle } from './resolveStyle'

const tokens = THEMES.neon

function block(overrides: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    type: 'CPU',
    category: 'real',
    x: 0,
    y: 0,
    w: 100,
    h: 60,
    rotation: 0,
    glow: true,
    zIndex: 0,
    ...overrides,
  }
}

describe('resolveBlockStyle', () => {
  it('uses theme block fill by category', () => {
    expect(resolveBlockStyle(block(), tokens, false).fill).toBe(tokens.blockFill.real)
    expect(resolveBlockStyle(block({ category: 'fantasy' }), tokens, false).fill).toBe(tokens.blockFill.fantasy)
  })

  it('lets colorOverride win over the theme fill', () => {
    expect(resolveBlockStyle(block({ colorOverride: '#123456' }), tokens, false).fill).toBe('#123456')
  })

  it('applies the select stroke when selected', () => {
    expect(resolveBlockStyle(block(), tokens, true).stroke).toBe(tokens.selectStroke)
  })

  it('drops the shadow when glow is off', () => {
    expect(resolveBlockStyle(block({ glow: false }), tokens, false).shadowBlur).toBe(0)
  })

  it('gives fantasy blocks the signature accent glow and a stronger blur than real blocks', () => {
    const fantasy = resolveBlockStyle(block({ category: 'fantasy' }), tokens, false)
    const real = resolveBlockStyle(block(), tokens, false)
    expect(fantasy.shadowColor).toBe(tokens.accents[0])
    expect(fantasy.shadowBlur).toBeGreaterThan(real.shadowBlur)
  })
})

describe('resolveDecorationStyle', () => {
  it('falls back to the signature accent for an uncolored neon line and uses additive blend', () => {
    const decoration: Decoration = { id: 'd', kind: 'neonLine', points: [0, 0, 10, 10], color: '', zIndex: 0 }
    const style = resolveDecorationStyle(decoration, tokens)
    expect(style.color).toBe(tokens.accents[0])
    expect(style.blend).toBe('lighter')
  })

  it('uses the theme text color for labels', () => {
    const decoration: Decoration = { id: 'd', kind: 'label', x: 0, y: 0, text: 'X', zIndex: 0 }
    expect(resolveDecorationStyle(decoration, tokens).color).toBe(tokens.text)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/themes/resolveStyle.test.ts`
Expected: FAIL — cannot find module `./resolveStyle`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/themes/resolveStyle.ts
import type { Block, Decoration } from '../domain/project'
import type { ThemeTokens } from './themeTokens'

export type BlockStyle = {
  fill: string
  stroke: string
  strokeWidth: number
  shadowColor: string
  shadowBlur: number
  shadowOpacity: number
}

export function resolveBlockStyle(block: Block, tokens: ThemeTokens, isSelected: boolean): BlockStyle {
  const isFantasy = block.category === 'fantasy'
  const glowing = block.glow ?? false
  const baseBlur = isFantasy ? tokens.glow.shadowBlur : tokens.glow.shadowBlur * 0.5
  return {
    fill: block.colorOverride ?? tokens.blockFill[block.category],
    stroke: isSelected ? tokens.selectStroke : tokens.blockStroke[block.category],
    strokeWidth: isSelected ? 2.5 : 1.25,
    shadowColor: isFantasy ? tokens.accents[0] : tokens.glow.shadowColor,
    shadowBlur: glowing ? baseBlur : 0,
    shadowOpacity: glowing ? tokens.glow.shadowOpacity : 0,
  }
}

export type DecorationStyle = {
  color: string
  strokeWidth: number
  shadowColor: string
  shadowBlur: number
  blend?: GlobalCompositeOperation
}

export function resolveDecorationStyle(decoration: Decoration, tokens: ThemeTokens): DecorationStyle {
  switch (decoration.kind) {
    case 'neonLine': {
      const color = decoration.color || tokens.accents[0]
      return { color, strokeWidth: 2.5, shadowColor: color, shadowBlur: tokens.glow.shadowBlur, blend: 'lighter' }
    }
    case 'warningMark':
      return { color: '#f4a000', strokeWidth: 2, shadowColor: '#f4a000', shadowBlur: 8 }
    case 'label':
      return { color: tokens.text, strokeWidth: 0, shadowColor: tokens.glow.shadowColor, shadowBlur: 0 }
    case 'sciFiObject':
      return { color: tokens.accents[0], strokeWidth: 1, shadowColor: tokens.accents[0], shadowBlur: tokens.glow.shadowBlur * 0.5 }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/themes/resolveStyle.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/themes/resolveStyle.ts src/themes/resolveStyle.test.ts
git commit -m "feat: add theme-aware block and decoration style resolvers"
```

---

### Task 4: Block texture helpers

**Files:**
- Create: `src/features/editor/canvas/blockTexture.ts`
- Test: `src/features/editor/canvas/blockTexture.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/editor/canvas/blockTexture.test.ts
import { describe, expect, it } from 'vitest'
import { blockVisual, memoryCells } from './blockTexture'

describe('blockVisual', () => {
  it('marks memory-family blocks as memory texture', () => {
    expect(blockVisual('QuantumMemory')).toBe('memory')
    expect(blockVisual('SRAM')).toBe('memory')
    expect(blockVisual('Cache')).toBe('memory')
  })

  it('treats other blocks as standard', () => {
    expect(blockVisual('CPU')).toBe('standard')
    expect(blockVisual('ConsciousnessProcessor')).toBe('standard')
  })
})

describe('memoryCells', () => {
  it('tiles a regular grid of cells inside the block bounds', () => {
    const cells = memoryCells(40, 24, 10, 4)
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.x + cell.w).toBeLessThanOrEqual(40)
      expect(cell.y + cell.h).toBeLessThanOrEqual(24)
      expect(cell.w).toBe(10)
      expect(cell.h).toBe(10)
    }
  })

  it('returns no cells when the block is smaller than one cell', () => {
    expect(memoryCells(6, 6, 10, 4)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/editor/canvas/blockTexture.test.ts`
Expected: FAIL — cannot find module `./blockTexture`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/editor/canvas/blockTexture.ts
import type { BlockType } from '../../../domain/project'

const MEMORY_TYPES = new Set<BlockType>(['QuantumMemory', 'SRAM', 'Cache'])

export function blockVisual(type: BlockType): 'memory' | 'standard' {
  return MEMORY_TYPES.has(type) ? 'memory' : 'standard'
}

export type Cell = { x: number; y: number; w: number; h: number }

export function memoryCells(width: number, height: number, cell = 10, gap = 4): Cell[] {
  const cells: Cell[] = []
  const step = cell + gap
  for (let y = gap; y + cell <= height; y += step) {
    for (let x = gap; x + cell <= width; x += step) {
      cells.push({ x, y, w: cell, h: cell })
    }
  }
  return cells
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/editor/canvas/blockTexture.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/canvas/blockTexture.ts src/features/editor/canvas/blockTexture.test.ts
git commit -m "feat: add procedural memory-array texture helpers"
```

---

### Task 5: Decoration factory

**Files:**
- Create: `src/domain/decorationFactory.ts`
- Test: `src/domain/decorationFactory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/decorationFactory.test.ts
import { describe, expect, it } from 'vitest'
import { createProject } from './projectFactory'
import { buildDecoration, nextDecorationZIndex } from './decorationFactory'

describe('nextDecorationZIndex', () => {
  it('returns 0 for no decorations and max+1 otherwise', () => {
    expect(nextDecorationZIndex([])).toBe(0)
    expect(
      nextDecorationZIndex([{ id: 'a', kind: 'warningMark', x: 0, y: 0, zIndex: 4 }]),
    ).toBe(5)
  })
})

describe('buildDecoration', () => {
  it('places a neon line across the die center with a theme-resolved color', () => {
    const project = createProject('p', 'p1', 0)
    const decoration = buildDecoration(project, 'neonLine', 'd1')
    expect(decoration).toMatchObject({ id: 'd1', kind: 'neonLine', color: '', zIndex: 0 })
    if (decoration.kind !== 'neonLine') throw new Error('expected neonLine')
    expect(decoration.points).toHaveLength(4)
  })

  it('places marks and labels at the die center', () => {
    const project = createProject('p', 'p1', 0)
    const warning = buildDecoration(project, 'warningMark', 'd2')
    expect(warning).toMatchObject({ kind: 'warningMark', x: 480, y: 320 })
    const label = buildDecoration(project, 'label', 'd3')
    expect(label).toMatchObject({ kind: 'label', text: 'LABEL', x: 480, y: 320 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/decorationFactory.test.ts`
Expected: FAIL — cannot find module `./decorationFactory`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/decorationFactory.ts
import type { Decoration, Project } from './project'

export type DecorationKind = Decoration['kind']

export function nextDecorationZIndex(decorations: Decoration[]): number {
  return decorations.reduce((max, decoration) => Math.max(max, decoration.zIndex + 1), 0)
}

export function buildDecoration(
  project: Project,
  kind: DecorationKind,
  id: string = crypto.randomUUID(),
): Decoration {
  const zIndex = nextDecorationZIndex(project.decorations)
  const cx = project.die.width / 2
  const cy = project.die.height / 2
  switch (kind) {
    case 'neonLine':
      return { id, kind, points: [cx - 120, cy, cx + 120, cy], color: '', zIndex }
    case 'warningMark':
      return { id, kind, x: cx, y: cy, zIndex }
    case 'label':
      return { id, kind, x: cx, y: cy, text: 'LABEL', zIndex }
    case 'sciFiObject':
      return { id, kind, assetKey: 'bondRing', x: cx, y: cy, zIndex }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/decorationFactory.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/decorationFactory.ts src/domain/decorationFactory.test.ts
git commit -m "feat: add decoration factory with centered defaults"
```

---

### Task 6: Hero chip factory (composition A)

**Files:**
- Create: `src/domain/heroChip.ts`
- Test: `src/domain/heroChip.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/heroChip.test.ts
import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from './project'
import { createHeroChip } from './heroChip'

describe('createHeroChip', () => {
  it('returns a valid keynote project for composition A', () => {
    const chip = createHeroChip('hero', 1000)
    expect(chip.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(chip.theme).toBe('keynote')
    expect(chip.die.shape).toBe('square')
    expect(chip.spec.cores).toBe(88)
  })

  it('keeps every block inside the square die bounds', () => {
    const chip = createHeroChip('hero', 1000)
    const { width, height } = chip.die
    for (const block of chip.blocks) {
      expect(block.x).toBeGreaterThanOrEqual(0)
      expect(block.y).toBeGreaterThanOrEqual(0)
      expect(block.x + block.w).toBeLessThanOrEqual(width)
      expect(block.y + block.h).toBeLessThanOrEqual(height)
    }
  })

  it('includes the hero block, a memory band, and a name label', () => {
    const chip = createHeroChip('hero', 1000)
    expect(chip.blocks.some((b) => b.type === 'ConsciousnessProcessor')).toBe(true)
    expect(chip.blocks.some((b) => b.type === 'QuantumMemory')).toBe(true)
    expect(chip.decorations.some((d) => d.kind === 'label')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/heroChip.test.ts`
Expected: FAIL — cannot find module `./heroChip`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/heroChip.ts
import { CURRENT_SCHEMA_VERSION, type Block, type Decoration, type Project } from './project'

const DIE = 720

export function createHeroChip(id: string = crypto.randomUUID(), now = Date.now()): Project {
  const blocks: Block[] = [
    { id: `${id}-cpu`, type: 'CPU', category: 'real', x: 86, y: 86, w: 158, h: 86, rotation: 0, glow: true, zIndex: 0 },
    { id: `${id}-gpu`, type: 'GPU', category: 'real', x: 475, y: 86, w: 158, h: 86, rotation: 0, glow: true, zIndex: 1 },
    { id: `${id}-pll`, type: 'PLL', category: 'real', x: 86, y: 461, w: 158, h: 72, rotation: 0, glow: true, zIndex: 2 },
    { id: `${id}-dac`, type: 'DAC', category: 'real', x: 475, y: 461, w: 158, h: 72, rotation: 0, glow: true, zIndex: 3 },
    { id: `${id}-mem`, type: 'QuantumMemory', category: 'fantasy', x: 72, y: 576, w: 576, h: 72, rotation: 0, glow: true, zIndex: 4 },
    { id: `${id}-core`, type: 'ConsciousnessProcessor', category: 'fantasy', x: 216, y: 288, w: 288, h: 130, rotation: 0, glow: true, zIndex: 5 },
  ]
  const decorations: Decoration[] = [
    { id: `${id}-name`, kind: 'label', x: 280, y: 44, text: 'AURORA C-1', zIndex: 0 },
  ]
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: 'AURORA C-1 — Consciousness Processor',
    createdAt: now,
    updatedAt: now,
    die: { shape: 'square', width: DIE, height: DIE, background: 'keynote-graphite' },
    blocks,
    decorations,
    theme: 'keynote',
    spec: {
      brand: 'AURORA',
      series: 'C-1',
      generation: '3rd-gen',
      process: '0.5nm 영혼각인 (soul-etched)',
      cores: 88,
      bandwidth: '∞ TB/s',
      features: ['Dream Coherence Engine', 'Lucid Cache', 'Empathy Co-processor'],
      description: '의식을 88코어로 병렬 처리합니다. 부작용으로 가끔 자아를 가집니다.',
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/heroChip.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/heroChip.ts src/domain/heroChip.test.ts
git commit -m "feat: add first hero chip factory (composition A)"
```

---

### Task 7: Editor store — setTheme and addDecoration

**Files:**
- Modify: `src/stores/editorStore.ts`
- Test: `src/stores/editorStore.test.ts`

- [ ] **Step 1: Write the failing test (append to the existing describe block)**

```ts
// src/stores/editorStore.test.ts — add these imports at the top if missing:
//   (createEditorStore is already imported; createProject is already imported)
// Add this describe block at the end of the file:
import { describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { createEditorStore } from './editorStore'

describe('editorStore visual commands', () => {
  it('setTheme updates the theme and is undoable', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    store.getState().setTheme('military')
    expect(store.getState().project.theme).toBe('military')
    expect(store.getState().past.length).toBe(1)
    store.getState().undo()
    expect(store.getState().project.theme).toBe('neon')
  })

  it('setTheme is a no-op when the theme is unchanged', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    store.getState().setTheme('neon')
    expect(store.getState().past.length).toBe(0)
  })

  it('addDecoration appends a decoration without changing selection and is undoable', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    store.getState().addDecoration('warningMark')
    expect(store.getState().project.decorations).toHaveLength(1)
    expect(store.getState().project.decorations[0].kind).toBe('warningMark')
    expect(store.getState().selectedBlockId).toBeNull()
    store.getState().undo()
    expect(store.getState().project.decorations).toHaveLength(0)
  })
})
```

> If `editorStore.test.ts` already imports `vitest`, `createProject`, and `createEditorStore`, do not duplicate those import lines — just add the `describe('editorStore visual commands', ...)` block.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/editorStore.test.ts`
Expected: FAIL — `setTheme`/`addDecoration` is not a function.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/editorStore.ts`, update imports and the `EditorState` type and add the two commands:

```ts
// add to the existing import from '../domain/project':
import type { Block, BlockType, DieShape, Project, StyleTheme } from '../domain/project'
// add a new import:
import { buildDecoration, type DecorationKind } from '../domain/decorationFactory'
```

```ts
// add to the EditorState type (near setDieShape):
  setTheme: (theme: StyleTheme) => void
  addDecoration: (kind: DecorationKind) => void
```

```ts
// add these two commands inside the returned store object (e.g. after setDieShape):
      setTheme(theme) {
        const { project } = get()
        if (project.theme === theme) return
        commit({ ...project, theme })
      },

      addDecoration(kind) {
        const { project } = get()
        const decoration = buildDecoration(project, kind, createId())
        commit({ ...project, decorations: [...project.decorations, decoration] })
      },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/editorStore.test.ts`
Expected: PASS (existing tests + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat: add setTheme and addDecoration editor commands"
```

---

### Task 8: Project store — createHero

**Files:**
- Modify: `src/stores/projectStore.ts`
- Test: `src/stores/projectStore.test.ts`

- [ ] **Step 1: Write the failing test (append to the existing describe block)**

```ts
// src/stores/projectStore.test.ts — add inside the existing describe, reusing
// the file's existing store/repository setup helpers. Minimal standalone form:
import { describe, expect, it } from 'vitest'
import { createProjectStore } from './projectStore'
import { createLocalStorageProjectRepository } from '../storage/localStorageProjectRepository'

describe('projectStore createHero', () => {
  it('persists the hero chip and lists it first', async () => {
    const repository = createLocalStorageProjectRepository()
    let n = 0
    const store = createProjectStore(repository, () => 1000, () => `id-${n++}`)
    const hero = await store.getState().createHero()
    expect(hero.theme).toBe('keynote')
    expect(hero.blocks.length).toBe(6)
    expect(store.getState().projects[0].id).toBe(hero.id)
    expect(await repository.get(hero.id)).toMatchObject({ id: hero.id, theme: 'keynote' })
  })
})
```

> Match the existing test file's repository setup if it differs (e.g. a shared in-memory fake). The assertions on `createHero()` stay the same.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/projectStore.test.ts`
Expected: FAIL — `createHero` is not a function.

- [ ] **Step 3: Write minimal implementation**

In `src/stores/projectStore.ts`:

```ts
// add import:
import { createHeroChip } from '../domain/heroChip'
```

```ts
// add to the ProjectState type (near create):
  createHero: () => Promise<Project>
```

```ts
// add this method inside the returned store object (after create):
    async createHero() {
      const project = createHeroChip(createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/projectStore.test.ts`
Expected: PASS (existing tests + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/projectStore.test.ts
git commit -m "feat: add hero chip creation to project store"
```

---

# Phase B — Konva rendering and UI (browser-verified)

> jsdom has no canvas, so Konva rendering is not unit-tested (project convention). Each task ends
> with `npm run build`, a browser check via `npm run dev -- --host 127.0.0.1`, and a commit.
> `EditorToolbar.test.tsx` is the one component test that IS run (it renders DOM, no canvas).

### Task 9: Theme picker and decoration adders in the toolbar

**Files:**
- Modify: `src/features/editor/EditorToolbar.tsx`
- Modify: `src/features/editor/EditorToolbar.test.tsx`
- Modify: `src/features/editor/EditorPage.tsx`

- [ ] **Step 1: Update the toolbar test for the new controls**

```tsx
// src/features/editor/EditorToolbar.test.tsx — add these cases (reuse the existing
// render helper / default props in the file; add theme + onSetTheme + onAddDecoration
// to those defaults, e.g. theme: 'neon', onSetTheme: vi.fn(), onAddDecoration: vi.fn()).
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EditorToolbar } from './EditorToolbar'

describe('EditorToolbar themes', () => {
  it('calls onSetTheme when a theme button is clicked', () => {
    const onSetTheme = vi.fn()
    render(
      <EditorToolbar
        dieShape="rect"
        theme="neon"
        canUndo={false}
        canRedo={false}
        hasSelection={false}
        onSetDieShape={vi.fn()}
        onSetTheme={onSetTheme}
        onAddDecoration={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onBringForward={vi.fn()}
        onSendBackward={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Keynote' }))
    expect(onSetTheme).toHaveBeenCalledWith('keynote')
  })

  it('calls onAddDecoration when a decoration button is clicked', () => {
    const onAddDecoration = vi.fn()
    render(
      <EditorToolbar
        dieShape="rect"
        theme="neon"
        canUndo={false}
        canRedo={false}
        hasSelection={false}
        onSetDieShape={vi.fn()}
        onSetTheme={vi.fn()}
        onAddDecoration={onAddDecoration}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onBringForward={vi.fn()}
        onSendBackward={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Neon Line' }))
    expect(onAddDecoration).toHaveBeenCalledWith('neonLine')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/editor/EditorToolbar.test.tsx`
Expected: FAIL — `Keynote` button not found / prop type errors.

- [ ] **Step 3: Implement the toolbar controls**

Edit `src/features/editor/EditorToolbar.tsx`:

```tsx
import type { DieShape, StyleTheme } from '../../domain/project'
import type { DecorationKind } from '../../domain/decorationFactory'

type Props = {
  dieShape: DieShape
  theme: StyleTheme
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  onSetDieShape: (shape: DieShape) => void
  onSetTheme: (theme: StyleTheme) => void
  onAddDecoration: (kind: DecorationKind) => void
  onUndo: () => void
  onRedo: () => void
  onDuplicate: () => void
  onDelete: () => void
  onBringForward: () => void
  onSendBackward: () => void
}

const SHAPES: { shape: DieShape; label: string }[] = [
  { shape: 'rect', label: 'Rect' },
  { shape: 'square', label: 'Square' },
  { shape: 'circle', label: 'Circle' },
  { shape: 'hexagon', label: 'Hexagon' },
]

const THEME_OPTIONS: { theme: StyleTheme; label: string }[] = [
  { theme: 'neon', label: 'Neon' },
  { theme: 'retro', label: 'Retro' },
  { theme: 'military', label: 'Military' },
  { theme: 'keynote', label: 'Keynote' },
  { theme: 'mono', label: 'Mono' },
]

const DECORATIONS: { kind: DecorationKind; label: string }[] = [
  { kind: 'neonLine', label: 'Neon Line' },
  { kind: 'warningMark', label: 'Warning' },
  { kind: 'label', label: 'Label' },
]

const buttonClass = 'border border-cyan-900 px-3 py-1 text-xs uppercase tracking-wider disabled:opacity-30'
```

Then extend the rendered toolbar — keep the existing shape/undo/redo/selection groups and add a theme group and a decoration group (place them after the shape group, separated by the existing `<span className="mx-2 h-4 w-px bg-cyan-900" />` divider):

```tsx
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <div className="flex gap-1">
        {THEME_OPTIONS.map(({ theme: option, label }) => (
          <button
            key={option}
            className={`${buttonClass} ${option === theme ? 'bg-cyan-400/20 text-cyan-200' : ''}`}
            onClick={() => onSetTheme(option)}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="mx-2 h-4 w-px bg-cyan-900" />
      <div className="flex gap-1">
        {DECORATIONS.map(({ kind, label }) => (
          <button key={kind} className={buttonClass} onClick={() => onAddDecoration(kind)}>
            {label}
          </button>
        ))}
      </div>
```

Add `theme`, `onSetTheme`, and `onAddDecoration` to the destructured props in the function signature.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/editor/EditorToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the new props in EditorPage**

Edit `src/features/editor/EditorPage.tsx` — pass the new props to `<EditorToolbar>`:

```tsx
        <EditorToolbar
          dieShape={state.project.die.shape}
          theme={state.project.theme}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          hasSelection={state.selectedBlockId !== null}
          onSetDieShape={state.setDieShape}
          onSetTheme={state.setTheme}
          onAddDecoration={state.addDecoration}
          onUndo={state.undo}
          onRedo={state.redo}
          onDuplicate={state.duplicateSelected}
          onDelete={state.deleteSelected}
          onBringForward={state.bringForward}
          onSendBackward={state.sendBackward}
        />
```

- [ ] **Step 6: Build and commit**

Run: `npm run build` → expect success.

```bash
git add src/features/editor/EditorToolbar.tsx src/features/editor/EditorToolbar.test.tsx src/features/editor/EditorPage.tsx
git commit -m "feat: add theme picker and decoration controls to toolbar"
```

---

### Task 10: Theme-driven die and grid (gate: theme switch recolors the whole die)

**Files:**
- Modify: `src/features/editor/canvas/ChipStage.tsx`

- [ ] **Step 1: Replace the hardcoded die and grid with theme tokens**

Add imports:

```tsx
import { resolveTheme } from '../../../themes/themeTokens'
import { dieFillProps } from '../../../themes/gradients'
```

Replace `DieShape` and `GridLines` so they take resolved tokens, and compute tokens once in `ChipStage`:

```tsx
import type { ThemeTokens } from '../../../themes/themeTokens'

function DieShape({ die, tokens }: { die: Die; tokens: ThemeTokens }) {
  const gradient = dieFillProps(die.shape, die.width, die.height, tokens.dieFill)
  const common = {
    ...gradient,
    stroke: tokens.dieStroke,
    strokeWidth: tokens.dieStrokeWidth,
    shadowColor: tokens.glow.shadowColor,
    shadowBlur: tokens.dieStrokeWidth * 6,
    shadowOpacity: 0.25,
  }
  if (die.shape === 'circle') {
    return <Circle x={die.width / 2} y={die.height / 2} radius={die.width / 2} {...common} />
  }
  if (die.shape === 'hexagon') {
    return <RegularPolygon x={die.width / 2} y={die.height / 2} sides={6} radius={die.width / 2} {...common} />
  }
  return <Rect width={die.width} height={die.height} {...common} />
}

function GridLines({ die, tokens }: { die: Die; tokens: ThemeTokens }) {
  const lines = []
  for (let x = GRID; x < die.width; x += GRID) {
    lines.push(<Line key={`v-${x}`} points={[x, 0, x, die.height]} stroke={tokens.gridColor} strokeWidth={1} />)
  }
  for (let y = GRID; y < die.height; y += GRID) {
    lines.push(<Line key={`h-${y}`} points={[0, y, die.width, y]} stroke={tokens.gridColor} strokeWidth={1} />)
  }
  return <Group clipFunc={(context) => clipForDie(context, die)}>{lines}</Group>
}
```

In the `ChipStage` body, resolve tokens once and pass them down, and set the editor ambiance background from the theme (CSS, editor-only — die-only PNG export does not depend on it):

```tsx
  const tokens = resolveTheme(project.theme)
```

Change the `<Stage>` wrapper / its parent so the container has the themed background. The simplest path: wrap the `<Stage>` in a `<div>` styled with the theme's darkest background stop:

```tsx
  return (
    <div style={{ backgroundColor: tokens.background[tokens.background.length - 1].color }} className="inline-block">
      <Stage
        /* ...existing Stage props unchanged... */
      >
        <Layer>
          <DieShape die={project.die} tokens={tokens} />
          <GridLines die={project.die} tokens={tokens} />
          {/* blocks, labels, Transformer unchanged for now */}
        </Layer>
      </Stage>
    </div>
  )
```

> Keep all existing `<Stage>` props (width, height, scale, position, draggable, onWheel, onDragEnd, onMouseDown, className) exactly as they are.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success (TypeScript clean).

- [ ] **Step 3: Browser-verify the theme gate**

Run: `npm run dev -- --host 127.0.0.1`, open the URL, create a project, add a couple of blocks. Click each of Neon / Retro / Military / Keynote / Mono. Confirm: the die fill gradient, die stroke, grid color, and ambiance background all change together with each theme; no element keeps a previous theme's color. Console shows no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/editor/canvas/ChipStage.tsx
git commit -m "feat: drive die and grid rendering from theme tokens"
```

---

### Task 11: Theme-driven blocks with glow and memory texture

**Files:**
- Modify: `src/features/editor/canvas/ChipStage.tsx`

- [ ] **Step 1: Apply resolved block styles and add the memory texture layer**

Add imports:

```tsx
import { resolveBlockStyle } from '../../../themes/resolveStyle'
import { blockVisual, memoryCells } from './blockTexture'
```

Replace the block `<Rect>`'s hardcoded `fill`/`stroke`/`strokeWidth`/`shadowColor`/`shadowBlur` with the resolved style (compute `const style = resolveBlockStyle(block, tokens, block.id === selectedBlockId)` inside the map), keeping all drag/transform handlers and the `ref` callback unchanged:

```tsx
        {sorted.map((block: Block) => {
          const style = resolveBlockStyle(block, tokens, block.id === selectedBlockId)
          return (
            <Rect
              key={block.id}
              ref={(node) => {
                if (node) blockRefs.current.set(block.id, node)
                else blockRefs.current.delete(block.id)
              }}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              rotation={block.rotation}
              cornerRadius={6}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              shadowColor={style.shadowColor}
              shadowBlur={style.shadowBlur}
              shadowOpacity={style.shadowOpacity}
              draggable
              onClick={() => onSelectBlock(block.id)}
              onTap={() => onSelectBlock(block.id)}
              onDragStart={() => onSelectBlock(block.id)}
              onDragEnd={(event) => {
                onTransformBlock(block.id, {
                  x: snapToGrid(event.target.x(), GRID),
                  y: snapToGrid(event.target.y(), GRID),
                  w: block.w,
                  h: block.h,
                  rotation: block.rotation,
                })
              }}
              onTransformEnd={(event) => {
                const node = event.target as Konva.Rect
                const scaleX = node.scaleX()
                const scaleY = node.scaleY()
                node.scaleX(1)
                node.scaleY(1)
                onTransformBlock(block.id, {
                  x: node.x(),
                  y: node.y(),
                  w: Math.max(MIN_BLOCK, node.width() * scaleX),
                  h: Math.max(MIN_BLOCK, node.height() * scaleY),
                  rotation: node.rotation(),
                })
              }}
            />
          )
        })}
```

Add a memory-texture map directly after the block map (cells are non-interactive, clipped to the block, drawn in the signature accent):

```tsx
        {sorted
          .filter((block) => blockVisual(block.type) === 'memory')
          .map((block) => (
            <Group
              key={`${block.id}-mem`}
              x={block.x}
              y={block.y}
              rotation={block.rotation}
              listening={false}
              clipFunc={(context) => context.rect(0, 0, block.w, block.h)}
            >
              {memoryCells(block.w, block.h).map((cell, index) => (
                <Rect
                  key={index}
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  fill={tokens.accents[0]}
                  opacity={0.18}
                />
              ))}
            </Group>
          ))}
```

Update the label map to use the theme text color:

```tsx
        {sorted.map((block) => (
          <Text
            key={`${block.id}-label`}
            x={block.x + 12}
            y={block.y + 12}
            rotation={block.rotation}
            text={block.type}
            fontSize={13}
            fill={tokens.text}
            listening={false}
          />
        ))}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Browser-verify**

In the dev server: add real blocks (CPU/GPU) and fantasy blocks (ConsciousnessProcessor, QuantumMemory). Confirm fantasy blocks glow more strongly and in the signature accent; real blocks have a subtler glow; the QuantumMemory block shows a fine repeated-cell texture; selecting a block shows the select stroke; labels are readable in every theme. Drag a block and confirm clamp still works. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/editor/canvas/ChipStage.tsx
git commit -m "feat: render blocks with theme glow and memory texture"
```

---

### Task 12: Decoration rendering

**Files:**
- Modify: `src/features/editor/canvas/ChipStage.tsx`

- [ ] **Step 1: Render decorations above blocks**

Add imports:

```tsx
import { resolveDecorationStyle } from '../../../themes/resolveStyle'
import type { Decoration } from '../../../domain/project'
```

Add a `DecorationNode` component (above `ChipStage`):

```tsx
function DecorationNode({ decoration, tokens }: { decoration: Decoration; tokens: ThemeTokens }) {
  const style = resolveDecorationStyle(decoration, tokens)
  switch (decoration.kind) {
    case 'neonLine':
      return (
        <Line
          points={decoration.points}
          stroke={style.color}
          strokeWidth={style.strokeWidth}
          shadowColor={style.shadowColor}
          shadowBlur={style.shadowBlur}
          lineCap="round"
          globalCompositeOperation={style.blend}
          listening={false}
        />
      )
    case 'warningMark':
      return (
        <Group x={decoration.x} y={decoration.y} listening={false}>
          <RegularPolygon
            sides={3}
            radius={18}
            stroke={style.color}
            strokeWidth={style.strokeWidth}
            shadowColor={style.shadowColor}
            shadowBlur={style.shadowBlur}
          />
          <Text x={-3} y={-6} text="!" fontStyle="bold" fontSize={16} fill={style.color} />
        </Group>
      )
    case 'label':
      return (
        <Text
          x={decoration.x}
          y={decoration.y}
          text={decoration.text}
          fontSize={18}
          fontStyle="bold"
          letterSpacing={2}
          fill={style.color}
          listening={false}
        />
      )
    case 'sciFiObject':
      return <Circle x={decoration.x} y={decoration.y} radius={10} stroke={style.color} strokeWidth={style.strokeWidth} listening={false} />
  }
}
```

Render the sorted decorations inside the `<Layer>`, after the labels and before the `<Transformer>`:

```tsx
        {project.decorations
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((decoration) => (
            <DecorationNode key={decoration.id} decoration={decoration} tokens={tokens} />
          ))}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Browser-verify**

In the dev server: click Neon Line, Warning, and Label in the toolbar. Confirm a glowing neon line, a warning triangle with `!`, and a bold label appear at the die center; the neon line blooms additively (brighter where it overlaps other glow). Switch themes and confirm decoration colors follow the theme (label uses theme text color; neon line uses the signature accent). Press Undo to remove the last decoration. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/editor/canvas/ChipStage.tsx
git commit -m "feat: render neon line, warning, label, and sci-fi decorations"
```

---

### Task 13: Load the hero chip from the dashboard (gate: hero chip review)

**Files:**
- Modify: `src/features/projects/ProjectDashboard.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Add the createHero prop and a button to the dashboard**

Edit `src/features/projects/ProjectDashboard.tsx`:

```tsx
type Props = {
  projects: Project[]
  createProject: (name: string) => Promise<Project>
  createHeroChip: () => Promise<Project>
  duplicateProject: (id: string) => Promise<Project>
  removeProject: (id: string) => Promise<void>
}
```

Destructure `createHeroChip`, add a handler, and add a button next to "New Project":

```tsx
  async function startHero() {
    const project = await createHeroChip()
    navigate(`/editor/${project.id}`)
  }
```

```tsx
          <div className="flex gap-3">
            <button className="border border-violet-300 px-4 py-2 text-sm uppercase" onClick={startHero}>
              Load Hero Chip
            </button>
            <button className="border border-cyan-300 px-4 py-2 text-sm uppercase" onClick={startProject}>
              New Project
            </button>
          </div>
```

> Replace the existing single `New Project` button with this two-button group inside the header.

- [ ] **Step 2: Wire createHero in the dashboard route**

Edit `src/app/App.tsx` `DashboardRoute`:

```tsx
    <ProjectDashboard
      projects={store.projects}
      createProject={store.create}
      createHeroChip={store.createHero}
      duplicateProject={store.duplicate}
      removeProject={store.remove}
    />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Browser-verify against the M0 board (the visual gate)**

In the dev server: from the dashboard click "Load Hero Chip". Confirm the AURORA C-1 chip opens in the keynote theme: brushed-metal square die with gradient depth, a soft accent bloom on the central ConsciousnessProcessor, subtler glow on CPU/GPU/PLL/DAC, the QuantumMemory band showing repeated-cell texture, and the AURORA C-1 label. **Review it against `docs/reference/hero-compositions.md` (composition A) and `docs/reference/README.md`.** If the bloom looks like a hard ring, the metal looks flat, or it reads like an EDA tool, stop and refine tokens/rendering before continuing. Refresh and confirm it restores from IndexedDB.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/ProjectDashboard.tsx src/app/App.tsx
git commit -m "feat: load the first hero chip from the dashboard"
```

---

### Task 14: Minimal die PNG export smoke test (gate: effects render in Konva)

**Files:**
- Create: `src/features/export/exportStage.ts`
- Modify: `src/features/editor/canvas/ChipStage.tsx`

> This is the minimal smoke test the M3 gate requires. The full dual export (dedicated poster
> stage, high-DPI sizes, Web Share) is Milestone 5 — do not build it here.

- [ ] **Step 1: Add the download helper**

```ts
// src/features/export/exportStage.ts
// Browser-only helper (touches the DOM); verified in a browser session, not unit-tested.
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
```

- [ ] **Step 2: Add a stage ref and an Export PNG button in ChipStage**

In `src/features/editor/canvas/ChipStage.tsx`:

```tsx
import { downloadDataUrl } from '../../export/exportStage'
```

Add a stage ref:

```tsx
  const stageRef = useRef<Konva.Stage>(null)
```

Put `ref={stageRef}` on the `<Stage>`. Add an Export PNG button above the `<Stage>` inside the wrapping `<div>` from Task 10:

```tsx
      <button
        className="mb-2 border border-cyan-700 px-3 py-1 text-xs uppercase tracking-wider text-cyan-200"
        onClick={() => {
          const url = stageRef.current?.toDataURL({ pixelRatio: 2 })
          if (url) downloadDataUrl(url, `${project.name || 'chip'}.png`)
        }}
      >
        Export PNG
      </button>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Browser-verify the export smoke test**

In the dev server, open the hero chip and click "Export PNG". Open the downloaded PNG and confirm the die gradient, block glow, and memory texture are present in the raster image — proving the effects are Konva-rendered (`toDataURL` captures only the Konva canvas, never DOM/CSS). No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/export/exportStage.ts src/features/editor/canvas/ChipStage.tsx
git commit -m "feat: add minimal die PNG export smoke test"
```

---

### Task 15: Full verification and documentation

**Files:**
- Modify: `implementation.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full test suite and build**

Run: `npm test` — expect all files green (the 14 baseline files + the new theme/decoration/hero/store tests).
Run: `npm run build` — expect success (the ≈557 kB chunk-size warning is pre-existing, not a regression).

- [ ] **Step 2: Record decisions in implementation.md**

Add a dated `## 2026-06-03 - Milestone 3 비주얼 시스템 구현 완료` section covering: the new `src/themes/` boundary (tokens + gradients + resolvers); theme as the render-time source of truth (no migration; `die.background` now unused by the renderer and reserved for presets); procedural memory texture instead of bundled image assets; `colorOverride` now honored; editor ambiance background is CSS (die-only export does not need it; poster background is M5); the hero chip (composition A) and its M0-board review result; the minimal export smoke test and what M5 still owes (poster stage, high-DPI dual export, share); and any token tweaks made during the browser review. End with the next resume point (Milestone 4 — write `docs/superpowers/plans/2026-06-02-presets-and-remixing.md` first).

- [ ] **Step 3: Update CLAUDE.md milestone status**

Mark **M3 Visual System** done in the Milestone Status section (themes catalog, Konva glow/gradients/decorations, memory texture, first hero chip, minimal export smoke test), and update the "next code milestone" pointer to **M4 Presets/Remix**.

- [ ] **Step 4: Commit**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record visual system milestone and browser verification"
```

---

## Self-Review

**Spec coverage (roadmap M3 outcome + acceptance gate):**
- theme catalog `neon`/`retro`/`military`/`keynote`/`mono` → Task 1.
- Konva-renderable gradients, `shadowBlur`, blend → Tasks 2, 3, 10, 11, 12 (`globalCompositeOperation: 'lighter'` on neon lines). `Konva.Filters` blur is explicitly deferred (Scope section); `shadowBlur` + additive blend deliver the look without node caching.
- decorations: labels, warning marks, neon lines → Tasks 5, 9, 12 (+ `sciFiObject` fallback).
- locally bundled texture assets only → satisfied by procedural memory texture (Task 4, 11); no image binaries added.
- first reference-quality hero chip → Tasks 6, 8, 13.
- Gate "theme switch changes the whole die consistently" → Task 10 (+ blocks Task 11, decorations Task 12) browser check.
- Gate "first hero chip reviewed against M0 board" → Task 13 Step 4.
- Gate "PNG export smoke test confirms effects render in Konva, not DOM-only CSS" → Task 14.

**Type consistency:** `ThemeTokens`/`ColorStop`/`Glow` (Task 1) reused by `gradients.ts` (Task 2), `resolveStyle.ts` (Task 3), and `ChipStage` (Tasks 10–12). `DecorationKind` defined in `decorationFactory.ts` (Task 5) and imported by `editorStore.ts` (Task 7) and `EditorToolbar.tsx` (Task 9). `BlockStyle`/`DecorationStyle` (Task 3) consumed in Tasks 11–12. `createHero`/`createHeroChip` names match across Tasks 6, 8, 13. `addDecoration(kind)` signature matches across Tasks 7, 9.

**Placeholder scan:** every code step contains complete code; browser-verification steps replace unit tests only where the project convention forbids unit-testing Konva.

**Deferred-but-named:** poster export / high-DPI / share (M5), preset catalog / remix (M4), interactive decoration selection/drag/edit and `Konva.Filters` (post-M3) — all called out so they are not built in this milestone.
