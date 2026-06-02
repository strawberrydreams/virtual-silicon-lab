# Fake Specs And Dual PNG Export (Milestone 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user edit a funny fake spec sheet, download a high-DPI die-only PNG, download a presentation-ready keynote-style poster PNG, and share the poster through Web Share with a download fallback.

**Architecture:** Keep serializable `Project` JSON as the only source of truth. Extract reusable Konva chip artwork from the interactive editor so export-only stages render the same die, grid, blocks, labels, textures, and decorations without scraping editor DOM or inheriting editor zoom/pan. Put output dimensions and sharing decisions in pure helpers, mount dedicated offscreen Konva stages for export, and leave browser-only canvas capture behind a small component boundary.

**Tech Stack:** React + TypeScript, Konva + React Konva, Zustand (`zustand/vanilla`), Tailwind CSS, Vitest + React Testing Library. No new dependencies and no persisted-schema change.

---

## Context From Earlier Milestones

- `Project.spec` already stores `FakeSpec`; M5 adds editing and poster presentation, not a new persisted field.
- `src/themes/themeTokens.ts` already exposes Konva-renderable background, die, grid, block, glow, accent, and text tokens.
- `src/features/editor/canvas/ChipStage.tsx` currently owns both artwork and editor interaction. Export stages must reuse the artwork but must not reuse editor viewport state.
- The M3 `Export PNG` button is intentionally a smoke test: it captures the fixed editor stage. M5 removes it after the dedicated exporters exist.
- Presets already ship populated fake specs and `die.background` intent keys. The poster layout can consume the resolved theme tokens immediately; mapping every background intent key to a separate treatment is not required for M5.
- Baseline before this milestone: `npm test -- --run` = 23 files / 81 tests; `npm run build` passes with the known Vite chunk-size warning.

## Review-Informed Prerequisites

The pre-M5 code review found three issues that directly affect M5 output reliability. Fix them before adding exporter UI:

1. `ChipStage` is fixed at `960x640`, while multiple presets are `720x720`. Their bottom `80px` are clipped in the editor and in the M3 smoke PNG.
2. `useAutosave()` cancels a pending save on unmount. Editing a spec and navigating away inside the debounce window would lose the latest change.
3. Blocks render in separate shape, texture, and label passes. A lower-z memory block can draw its texture or label over a higher-z block. Export must preserve complete block-level stacking.

Two additional review findings remain release-hardening debt and are deliberately not expanded into M5:

- Rectangular and square die boundary clamping ignores block rotation, so rotated corners can extend beyond the die.
- `BlockPalette` exposes only 6 of the 16 v1 block types declared in `BlockType`.

Record both in `implementation.md`; schedule them before M6 release QA.

## Decisions Locked For M5

- **Output dimensions**
  - die-only logical size = exact `project.die.width x project.die.height`; capture with `pixelRatio: 4`.
  - die-only PNG pixels = `project.die.width * 4 x project.die.height * 4`.
  - poster logical size = `1600 x 900`; capture with `pixelRatio: 2`.
  - poster PNG pixels = `3200 x 1800`.
- **Offscreen stages:** mount export stages outside the viewport with absolute positioning. Do not use `display: none`; canvases stay mounted and drawable.
- **Shared artwork:** one reusable Konva artwork component renders die, grid, blocks, textures, labels, and decorations. The editor wraps it with interaction; exporters render it without selection or controls.
- **Poster style:** use a landscape keynote slide composition: theme background, title and series, a scaled chip hero, a compact right-side spec sheet, and a small lab footer. Keep typography inside Konva `Text`.
- **Sharing:** share the poster PNG file when `navigator.share` and `navigator.canShare({ files })` allow it. Otherwise download the same poster PNG. A user-cancelled share is not converted into an extra download.
- **Examples:** ship three bundled fake spec examples as pure read-only data. Applying an example copies its `features` array before storing it.
- **Schema:** reuse the existing `FakeSpec` shape. No `schemaVersion` bump and no migration.

## File Structure

```text
src/
  lib/
    debounce.ts                         MODIFY add flush()
    debounce.test.ts                    MODIFY
  features/
    editor/
      useAutosave.ts                    MODIFY flush pending save on cleanup
      canvas/
        artworkLayout.ts                NEW editor stage sizing + z-order helper
        artworkLayout.test.ts
        ChipArtwork.tsx                 NEW shared Konva artwork
        ChipStage.tsx                   MODIFY interactive wrapper; remove smoke export
    specs/
      specExamples.ts                   NEW bundled fake spec examples
      specExamples.test.ts
      FakeSpecForm.tsx                  NEW form + example actions
      FakeSpecForm.test.tsx
    export/
      exportLayout.ts                   NEW documented output dimensions + poster layout
      exportLayout.test.ts
      exportStage.ts                    MODIFY browser download + share helpers
      exportStage.test.ts
      DieExportStage.tsx                NEW dedicated die-only Konva stage
      PosterExportStage.tsx             NEW dedicated poster Konva stage
      ExportPanel.tsx                   NEW capture/download/share controls + offscreen stages
    editor/
      EditorPage.tsx                    MODIFY wire spec form and export panel
  stores/
    editorStore.ts                      MODIFY setSpec()
    editorStore.test.ts                 MODIFY
implementation.md                       MODIFY record decisions, review debt, browser gate
CLAUDE.md                               MODIFY milestone status and next resume point
```

---

# Phase A - Reliability Prerequisites

### Task 1: Flush pending autosave work before teardown

**Files:**
- Modify: `src/lib/debounce.ts`
- Modify: `src/lib/debounce.test.ts`
- Modify: `src/features/editor/useAutosave.ts`

- [ ] **Step 1: Write the failing debouncer test**

```ts
it('flush runs a pending callback immediately and only once', () => {
  const callback = vi.fn()
  const debouncer = createDebouncer(callback, 600)

  debouncer.schedule()
  debouncer.flush()
  vi.advanceTimersByTime(600)

  expect(callback).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/lib/debounce.test.ts`

Expected: FAIL because `flush` is not part of `Debouncer`.

- [ ] **Step 3: Add `flush()` and use it during autosave cleanup**

```ts
// src/lib/debounce.ts
export type Debouncer = {
  schedule: () => void
  cancel: () => void
  flush: () => void
}

export function createDebouncer(callback: () => void, delayMs: number): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined

  return {
    schedule() {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        callback()
      }, delayMs)
    },
    cancel() {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
    flush() {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
      callback()
    },
  }
}
```

```ts
// src/features/editor/useAutosave.ts cleanup
return () => {
  debouncer.flush()
  unsubscribe()
}
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx vitest run src/lib/debounce.test.ts
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds with only the known chunk-size warning.

- [ ] **Step 5: Commit**

```bash
git add src/lib/debounce.ts src/lib/debounce.test.ts src/features/editor/useAutosave.ts
git commit -m "fix: flush pending autosave before editor teardown"
```

### Task 2: Size the interactive editor stage to the current die

**Files:**
- Create: `src/features/editor/canvas/artworkLayout.ts`
- Test: `src/features/editor/canvas/artworkLayout.test.ts`
- Modify: `src/features/editor/canvas/ChipStage.tsx`

- [ ] **Step 1: Write the failing layout test**

```ts
import { describe, expect, it } from 'vitest'
import { editorStageSize } from './artworkLayout'

describe('editorStageSize', () => {
  it('keeps the blank rectangular canvas at its established size', () => {
    expect(editorStageSize({ shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }))
      .toEqual({ width: 960, height: 640 })
  })

  it('expands to show every pixel of a 720 square preset', () => {
    expect(editorStageSize({ shape: 'square', width: 720, height: 720, background: 'keynote-graphite' }))
      .toEqual({ width: 960, height: 720 })
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/features/editor/canvas/artworkLayout.test.ts`

Expected: FAIL because `./artworkLayout` does not exist.

- [ ] **Step 3: Implement dynamic editor sizing**

```ts
// src/features/editor/canvas/artworkLayout.ts
import type { Block, Die } from '../../../domain/project'

const MIN_EDITOR_WIDTH = 960
const MIN_EDITOR_HEIGHT = 640

export function editorStageSize(die: Die) {
  return {
    width: Math.max(MIN_EDITOR_WIDTH, die.width),
    height: Math.max(MIN_EDITOR_HEIGHT, die.height),
  }
}

export function blocksByZIndex(blocks: Block[]) {
  return blocks.slice().sort((left, right) => left.zIndex - right.zIndex)
}
```

In `ChipStage`, replace the fixed constants with:

```ts
const stageSize = editorStageSize(project.die)
```

and pass:

```tsx
<Stage width={stageSize.width} height={stageSize.height}>
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx vitest run src/features/editor/canvas/artworkLayout.test.ts
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds.

- [ ] **Step 5: Browser-check the regression**

Open AURORA C-1 and NEON DISTRICT N-9. Confirm the full bottom edge is visible and the AURORA QuantumMemory band is no longer clipped.

- [ ] **Step 6: Commit**

```bash
git add src/features/editor/canvas/artworkLayout.ts src/features/editor/canvas/artworkLayout.test.ts src/features/editor/canvas/ChipStage.tsx
git commit -m "fix: size the editor stage for tall preset dies"
```

### Task 3: Extract shared chip artwork and preserve block-level z-order

**Files:**
- Modify: `src/features/editor/canvas/artworkLayout.test.ts`
- Create: `src/features/editor/canvas/ChipArtwork.tsx`
- Modify: `src/features/editor/canvas/ChipStage.tsx`

- [ ] **Step 1: Add a z-order regression test**

```ts
import type { Block } from '../../../domain/project'
import { blocksByZIndex } from './artworkLayout'

it('sorts complete block artwork from back to front', () => {
  const top = { id: 'top', zIndex: 3 } as Block
  const bottom = { id: 'bottom', zIndex: 1 } as Block
  expect(blocksByZIndex([top, bottom]).map((block) => block.id)).toEqual(['bottom', 'top'])
})
```

- [ ] **Step 2: Extract the shared artwork component**

Move `clipForDie`, `DieShape`, `GridLines`, and `DecorationNode` from `ChipStage.tsx` into `ChipArtwork.tsx`. Add a block component that keeps each shape, texture, and label in one group:

```tsx
// src/features/editor/canvas/ChipArtwork.tsx
export function BlockArtwork({
  block,
  tokens,
  selected = false,
  groupRef,
  groupProps,
}: {
  block: Block
  tokens: ThemeTokens
  selected?: boolean
  groupRef?: (node: Konva.Group | null) => void
  groupProps?: ComponentProps<typeof Group>
}) {
  const style = resolveBlockStyle(block, tokens, selected)
  return (
    <Group
      ref={groupRef}
      x={block.x}
      y={block.y}
      rotation={block.rotation}
      listening={groupProps !== undefined}
      {...groupProps}
    >
      <Rect
        width={block.w}
        height={block.h}
        cornerRadius={6}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        shadowColor={style.shadowColor}
        shadowBlur={style.shadowBlur}
        shadowOpacity={style.shadowOpacity}
      />
      {blockVisual(block.type) === 'memory' ? (
        <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)}>
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
      ) : null}
      <Text x={12} y={12} text={block.label ?? block.type} fontSize={13} fill={tokens.text} />
    </Group>
  )
}

type Props = {
  project: Project
  renderBlock?: (block: Block, tokens: ThemeTokens) => ReactNode
}

export function ChipArtwork({ project, renderBlock }: Props) {
  const tokens = resolveTheme(project.theme)
  return (
    <>
      <DieShape die={project.die} tokens={tokens} />
      <GridLines die={project.die} tokens={tokens} />
      {blocksByZIndex(project.blocks).map((block) => (
        <Fragment key={block.id}>
          {renderBlock?.(block, tokens) ?? <BlockArtwork block={block} tokens={tokens} />}
        </Fragment>
      ))}
      {project.decorations
        .slice()
        .sort((left, right) => left.zIndex - right.zIndex)
        .map((decoration) => <DecorationNode key={decoration.id} decoration={decoration} tokens={tokens} />)}
    </>
  )
}
```

Pass an interactive `BlockArtwork` through `ChipArtwork.renderBlock` in `ChipStage.tsx`. Change `blockRefs` to store `Konva.Group`, attach the `Transformer` to that visible group, and use:

```tsx
<ChipArtwork
  project={project}
  renderBlock={(block, tokens) => (
    <BlockArtwork
      block={block}
      tokens={tokens}
      selected={block.id === selectedBlockId}
      groupRef={(node) => {
        if (node) blockRefs.current.set(block.id, node)
        else blockRefs.current.delete(block.id)
      }}
      groupProps={{
        draggable: true,
        onClick: () => onSelectBlock(block.id),
        onTap: () => onSelectBlock(block.id),
        onDragStart: () => onSelectBlock(block.id),
        onDragEnd: (event) => {
          onTransformBlock(block.id, {
            x: snapToGrid(event.target.x(), GRID),
            y: snapToGrid(event.target.y(), GRID),
            w: block.w,
            h: block.h,
            rotation: block.rotation,
          })
        },
        onTransformEnd: (event) => {
          const node = event.target as Konva.Group
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          onTransformBlock(block.id, {
            x: node.x(),
            y: node.y(),
            w: Math.max(MIN_BLOCK, block.w * scaleX),
            h: Math.max(MIN_BLOCK, block.h * scaleY),
            rotation: node.rotation(),
          })
        },
      }}
    />
  )}
/>
```

Import `ComponentProps` and `ReactNode` from React in `ChipArtwork.tsx`, and import Konva for the `Konva.Group` type. This keeps live drag feedback intact while making shape, texture, and label move and stack as one unit. Export stages omit `renderBlock`, so they receive static artwork with no selection callbacks or `Transformer`.

- [ ] **Step 3: Remove the M3 smoke export from the interactive canvas**

Delete the `downloadDataUrl` import, `stageRef`, and `Export PNG` button from `ChipStage.tsx`. M5 adds export actions through `ExportPanel`.

- [ ] **Step 4: Run verification**

Run:

```bash
npx vitest run src/features/editor/canvas/artworkLayout.test.ts
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds.

- [ ] **Step 5: Browser-check editor behavior**

Verify block select, drag, resize, rotate, undo, redo, Forward, and Backward on overlapping blocks. Confirm a memory block moved backward cannot draw its cells or label over the foreground block.

- [ ] **Step 6: Commit**

```bash
git add src/features/editor/canvas/artworkLayout.test.ts src/features/editor/canvas/ChipArtwork.tsx src/features/editor/canvas/ChipStage.tsx
git commit -m "refactor: share ordered chip artwork with exporters"
```

---

# Phase B - Fake Specs

### Task 4: Add bundled spec examples and an undoable store command

**Files:**
- Create: `src/features/specs/specExamples.ts`
- Test: `src/features/specs/specExamples.test.ts`
- Modify: `src/stores/editorStore.ts`
- Modify: `src/stores/editorStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/features/specs/specExamples.test.ts
import { describe, expect, it } from 'vitest'
import { SPEC_EXAMPLES } from './specExamples'

describe('SPEC_EXAMPLES', () => {
  it('ships three populated examples with independent feature arrays', () => {
    expect(SPEC_EXAMPLES).toHaveLength(3)
    expect(SPEC_EXAMPLES.every((example) => example.spec.features.length >= 3)).toBe(true)
    expect(SPEC_EXAMPLES[0].spec.features).not.toBe(SPEC_EXAMPLES[1].spec.features)
  })
})
```

```ts
// add to src/stores/editorStore.test.ts
it('sets a copied spec and can undo it', () => {
  const store = createEditorStore(createProject('p', 'p1', 0))
  const original = store.getState().project.spec
  const spec = { ...original, brand: 'AEGIS', features: ['Temporal seal'] }
  store.getState().setSpec(spec)
  expect(store.getState().project.spec).toEqual(spec)
  expect(store.getState().project.spec.features).not.toBe(spec.features)
  store.getState().undo()
  expect(store.getState().project.spec).toEqual(original)
})
```

- [ ] **Step 2: Implement examples and `setSpec()`**

Create three examples in `SPEC_EXAMPLES`: `AURORA C-1`, `AEGIS M-7`, and `ONEIRIC LUCID-88`. Each entry has:

```ts
export type SpecExample = {
  id: 'aurora-c1' | 'aegis-m7' | 'oneiric-lucid-88'
  label: string
  spec: FakeSpec
}

export const SPEC_EXAMPLES: readonly SpecExample[] = [
  {
    id: 'aurora-c1',
    label: 'AURORA C-1',
    spec: {
      brand: 'AURORA',
      series: 'C-1',
      generation: '3rd-gen',
      process: '0.5nm soul-etched',
      cores: 88,
      bandwidth: 'infinity TB/s',
      features: ['Dream Coherence Engine', 'Lucid Cache', 'Empathy Co-processor'],
      description: 'Parallel consciousness processing with occasional self-awareness.',
    },
  },
  {
    id: 'aegis-m7',
    label: 'AEGIS M-7',
    spec: {
      brand: 'AEGIS',
      series: 'M-7',
      generation: 'Field Revision',
      process: '3nm hardened deployment',
      cores: 32,
      bandwidth: '2.4 TB/s',
      features: ['Rad-Hardened', 'Faraday Seal', 'Failover Core'],
      description: 'Slows time by 1.5x in hostile environments.',
    },
  },
  {
    id: 'oneiric-lucid-88',
    label: 'ONEIRIC LUCID-88',
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
]
```

Add to `EditorState` and the returned store:

```ts
setSpec: (spec: FakeSpec) => void
```

```ts
setSpec(spec) {
  const { project } = get()
  commit({ ...project, spec: { ...spec, features: [...spec.features] } })
},
```

- [ ] **Step 3: Run verification and commit**

Run:

```bash
npx vitest run src/features/specs/specExamples.test.ts src/stores/editorStore.test.ts
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds.

```bash
git add src/features/specs src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat: add editable fake spec examples"
```

### Task 5: Add the fake spec form to the editor

**Files:**
- Create: `src/features/specs/FakeSpecForm.tsx`
- Test: `src/features/specs/FakeSpecForm.test.tsx`
- Modify: `src/features/editor/EditorPage.tsx`

- [ ] **Step 1: Write the failing form test**

```tsx
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { FakeSpecForm } from './FakeSpecForm'

it('emits a copied spec when brand and features change', async () => {
  const onChange = vi.fn()
  function Harness() {
    const [spec, setSpec] = useState(createProject('p', 'p1', 0).spec)
    return <FakeSpecForm spec={spec} onChange={(next) => { setSpec(next); onChange(next) }} />
  }
  render(<Harness />)
  await userEvent.clear(screen.getByLabelText('Brand'))
  await userEvent.type(screen.getByLabelText('Brand'), 'AURORA')
  await userEvent.clear(screen.getByLabelText('Features'))
  await userEvent.type(screen.getByLabelText('Features'), 'Lucid Cache{enter}Empathy Core')
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
    brand: 'AURORA',
    features: ['Lucid Cache', 'Empathy Core'],
  }))
})
```

- [ ] **Step 2: Implement the controlled form**

Create `FakeSpecForm` with labeled inputs for `brand`, `series`, `generation`, `process`, `cores`, `bandwidth`, `features`, and `description`. Convert feature textarea lines with:

```ts
function featureLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean)
}
```

Render one button per `SPEC_EXAMPLES` item and call:

```ts
onChange({ ...example.spec, features: [...example.spec.features] })
```

Use compact Tailwind styling and keep every field controlled by the `spec` prop.

- [ ] **Step 3: Wire the editor**

Add a right-hand panel in `EditorPage.tsx`:

```tsx
<aside className="w-80 border-l border-cyan-900 bg-[#071015] p-4">
  <FakeSpecForm spec={state.project.spec} onChange={state.setSpec} />
</aside>
```

- [ ] **Step 4: Run verification**

Run:

```bash
npx vitest run src/features/specs/FakeSpecForm.test.tsx
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds.

- [ ] **Step 5: Browser-check spec persistence and commit**

Edit brand, features, and description; navigate back to dashboard immediately; reopen the project and refresh it. Confirm the last edits survive.

```bash
git add src/features/specs/FakeSpecForm.tsx src/features/specs/FakeSpecForm.test.tsx src/features/editor/EditorPage.tsx
git commit -m "feat: edit fake specs in the chip editor"
```

---

# Phase C - Dedicated Export Stages

### Task 6: Define documented export dimensions and poster layout

**Files:**
- Create: `src/features/export/exportLayout.ts`
- Test: `src/features/export/exportLayout.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { dieExportSize, posterChipPlacement, POSTER_EXPORT } from './exportLayout'

describe('export layout', () => {
  it('documents a four-times die-only raster size', () => {
    expect(dieExportSize({ shape: 'square', width: 720, height: 720, background: 'keynote' }))
      .toEqual({ logicalWidth: 720, logicalHeight: 720, pixelRatio: 4, pixelWidth: 2880, pixelHeight: 2880 })
  })

  it('documents a 3200 by 1800 poster raster', () => {
    expect(POSTER_EXPORT).toEqual({
      logicalWidth: 1600,
      logicalHeight: 900,
      pixelRatio: 2,
      pixelWidth: 3200,
      pixelHeight: 1800,
    })
  })

  it('fits a wide die into the poster hero area', () => {
    expect(posterChipPlacement({ shape: 'rect', width: 920, height: 600, background: 'military' }))
      .toMatchObject({ x: 80, y: 180 })
  })
})
```

- [ ] **Step 2: Implement constants and pure layout**

```ts
// src/features/export/exportLayout.ts
import type { Die } from '../../domain/project'

export const DIE_EXPORT_PIXEL_RATIO = 4
export const POSTER_EXPORT = {
  logicalWidth: 1600,
  logicalHeight: 900,
  pixelRatio: 2,
  pixelWidth: 3200,
  pixelHeight: 1800,
} as const

export function dieExportSize(die: Die) {
  return {
    logicalWidth: die.width,
    logicalHeight: die.height,
    pixelRatio: DIE_EXPORT_PIXEL_RATIO,
    pixelWidth: die.width * DIE_EXPORT_PIXEL_RATIO,
    pixelHeight: die.height * DIE_EXPORT_PIXEL_RATIO,
  }
}

export function posterChipPlacement(die: Die) {
  const maxWidth = 900
  const maxHeight = 620
  const scale = Math.min(maxWidth / die.width, maxHeight / die.height)
  return { x: 80, y: 180, scale }
}
```

- [ ] **Step 3: Run verification and commit**

Run:

```bash
npx vitest run src/features/export/exportLayout.test.ts
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds.

```bash
git add src/features/export/exportLayout.ts src/features/export/exportLayout.test.ts
git commit -m "feat: document high dpi export layouts"
```

### Task 7: Expand browser export helpers with Web Share fallback

**Files:**
- Modify: `src/features/export/exportStage.ts`
- Create: `src/features/export/exportStage.test.ts`

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { shareFileOrDownload } from './exportStage'

describe('shareFileOrDownload', () => {
  const file = new File(['poster'], 'chip-poster.png', { type: 'image/png' })

  it('shares a file when the browser supports file sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const download = vi.fn()
    await shareFileOrDownload(file, { canShare: () => true, share, download })
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Virtual Silicon Lab poster' })
    expect(download).not.toHaveBeenCalled()
  })

  it('downloads when file sharing is unavailable', async () => {
    const download = vi.fn()
    await shareFileOrDownload(file, { download })
    expect(download).toHaveBeenCalledWith(file)
  })
})
```

- [ ] **Step 2: Implement browser helpers**

```ts
// src/features/export/exportStage.ts
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, payload] = dataUrl.split(',')
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
  return new File([bytes], filename, { type: mime })
}

type ShareDependencies = {
  canShare?: (data: ShareData) => boolean
  share?: (data: ShareData) => Promise<void>
  download: (file: File) => void
}

export async function shareFileOrDownload(file: File, dependencies: ShareDependencies) {
  const data = { files: [file], title: 'Virtual Silicon Lab poster' }
  if (dependencies.share && dependencies.canShare?.(data)) {
    await dependencies.share(data)
    return 'shared' as const
  }
  dependencies.download(file)
  return 'downloaded' as const
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.download = file.name
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Run verification and commit**

Run:

```bash
npx vitest run src/features/export/exportStage.test.ts
npm test -- --run
npm run build
```

Expected: focused and full suites pass; build succeeds.

```bash
git add src/features/export/exportStage.ts src/features/export/exportStage.test.ts
git commit -m "feat: share poster files with a download fallback"
```

### Task 8: Add the dedicated die-only export stage

**Files:**
- Create: `src/features/export/DieExportStage.tsx`

- [ ] **Step 1: Implement the export-only stage**

```tsx
import { forwardRef } from 'react'
import type Konva from 'konva'
import { Layer, Stage } from 'react-konva'
import type { Project } from '../../domain/project'
import { ChipArtwork } from '../editor/canvas/ChipArtwork'

export const DieExportStage = forwardRef<Konva.Stage, { project: Project }>(
  function DieExportStage({ project }, ref) {
    return (
      <Stage ref={ref} width={project.die.width} height={project.die.height}>
        <Layer>
          <ChipArtwork project={project} />
        </Layer>
      </Stage>
    )
  },
)
```

- [ ] **Step 2: Run verification and commit**

Run:

```bash
npm test -- --run
npm run build
```

Expected: full suite passes; build succeeds.

```bash
git add src/features/export/DieExportStage.tsx
git commit -m "feat: render a dedicated die only export stage"
```

### Task 9: Add the dedicated poster export stage

**Files:**
- Create: `src/features/export/PosterExportStage.tsx`

- [ ] **Step 1: Implement the poster-only composition**

Use `POSTER_EXPORT`, `posterChipPlacement(project.die)`, `resolveTheme(project.theme)`, `linearGradientProps()`, and `ChipArtwork`. Render:

```tsx
<Stage ref={ref} width={POSTER_EXPORT.logicalWidth} height={POSTER_EXPORT.logicalHeight}>
  <Layer>
    <Rect width={1600} height={900} {...linearGradientProps(1600, 900, tokens.background)} />
    <Text x={80} y={72} text={project.spec.brand} fontSize={22} letterSpacing={8} fill={tokens.text} />
    <Text x={80} y={108} text={project.name} fontSize={42} fontStyle="bold" fill={tokens.text} />
    <Group x={chip.x} y={chip.y} scaleX={chip.scale} scaleY={chip.scale}>
      <ChipArtwork project={project} />
    </Group>
    <Group x={1060} y={210}>
      <Text text={`${project.spec.series} // ${project.spec.generation}`} fontSize={22} fill={tokens.accents[0]} />
      <Text y={58} text={`PROCESS  ${project.spec.process}`} width={450} fontSize={18} fill={tokens.text} />
      <Text y={98} text={`CORES    ${project.spec.cores}`} width={450} fontSize={18} fill={tokens.text} />
      <Text y={138} text={`BANDWIDTH ${project.spec.bandwidth}`} width={450} fontSize={18} fill={tokens.text} />
      <Text y={202} text={project.spec.features.map((feature) => `+ ${feature}`).join('\n')} width={450} fontSize={18} lineHeight={1.7} fill={tokens.text} />
      <Text y={390} text={project.spec.description} width={450} fontSize={17} lineHeight={1.5} fill={tokens.text} />
    </Group>
    <Text x={80} y={840} text="VIRTUAL SILICON LAB // CONCEPT FABRICATION TERMINAL" fontSize={14} letterSpacing={3} fill={tokens.text} opacity={0.65} />
  </Layer>
</Stage>
```

The chip group must use the pure placement helper and must not include editor overlay nodes, selection, `Transformer`, toolbar, or DOM text.

- [ ] **Step 2: Run verification and commit**

Run:

```bash
npm test -- --run
npm run build
```

Expected: full suite passes; build succeeds.

```bash
git add src/features/export/PosterExportStage.tsx
git commit -m "feat: render keynote style poster exports"
```

### Task 10: Add export actions and wire the editor

**Files:**
- Create: `src/features/export/ExportPanel.tsx`
- Modify: `src/features/editor/EditorPage.tsx`

- [ ] **Step 1: Implement `ExportPanel`**

Mount stages offscreen:

```tsx
<div className="absolute left-[-10000px] top-[-10000px]" aria-hidden="true">
  <DieExportStage ref={dieStageRef} project={project} />
  <PosterExportStage ref={posterStageRef} project={project} />
</div>
```

Add three buttons:

```tsx
<button onClick={downloadDie}>Download Die PNG</button>
<button onClick={downloadPoster}>Download Poster PNG</button>
<button onClick={sharePoster}>Share Poster</button>
```

Use:

```ts
const dieUrl = dieStageRef.current?.toDataURL({ pixelRatio: DIE_EXPORT_PIXEL_RATIO })
const posterUrl = posterStageRef.current?.toDataURL({ pixelRatio: POSTER_EXPORT.pixelRatio })
```

Download die and poster data URLs with deterministic filenames:

```ts
`${project.name || 'chip'}-die.png`
`${project.name || 'chip'}-poster.png`
```

For share:

```ts
const file = dataUrlToFile(posterUrl, `${project.name || 'chip'}-poster.png`)
await shareFileOrDownload(file, {
  canShare: navigator.canShare?.bind(navigator),
  share: navigator.share?.bind(navigator),
  download: downloadFile,
})
```

- [ ] **Step 2: Wire the panel**

Render `<ExportPanel project={state.project} />` in the right-hand editor aside below `FakeSpecForm`.

- [ ] **Step 3: Run verification and commit**

Run:

```bash
npm test -- --run
npm run build
```

Expected: full suite passes; build succeeds.

```bash
git add src/features/export/ExportPanel.tsx src/features/editor/EditorPage.tsx
git commit -m "feat: download and share dedicated chip exports"
```

---

# Phase D - Browser Gate And Milestone Notes

### Task 11: Verify exports in desktop Chrome and record the milestone

**Files:**
- Modify: `implementation.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Start the development server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a localhost URL.

- [ ] **Step 2: Verify the M5 acceptance gate in the in-app Browser**

1. Remix AURORA C-1 and confirm its full `720x720` die is visible, including the bottom memory band.
2. Edit every fake spec field, apply one bundled example, edit again, navigate to dashboard immediately, reopen, and refresh. Confirm the last values persist.
3. Download die-only PNG for AURORA and inspect it with `sips -g pixelWidth -g pixelHeight <downloaded-file>`. Confirm `2880x2880`.
4. Remix FIELD UNIT M-7, download die-only PNG, and confirm `3680x2400`.
5. Download poster PNG and confirm `3200x1800`.
6. Open the poster PNG. Confirm it contains theme background, complete chip artwork, title, series, process, cores, bandwidth, feature list, description, and footer. Confirm it contains no toolbar, selection outline, transformer handles, editor border, block palette, or DOM-only UI.
7. Confirm AURORA, N-9, and M-7 posters remain visually distinct and presentation-ready.
8. In a browser context without `navigator.share`, click `Share Poster` and confirm a poster PNG download occurs.
9. Confirm browser console errors remain empty.

- [ ] **Step 3: Record milestone completion**

Append a dated M5 completion section to `implementation.md` covering:

- shared ordered artwork and dynamic editor sizing;
- autosave flush on teardown;
- fake spec examples and form;
- die-only `pixelRatio: 4` dimensions;
- poster logical `1600x900`, `pixelRatio: 2`, output `3200x1800`;
- dedicated offscreen Konva stages and the no-DOM-capture boundary;
- Web Share file support and fallback behavior;
- browser verification results;
- unresolved review debt: rotation-aware rectangular clamping and complete block palette;
- next resume point: M6, beginning by writing `docs/superpowers/plans/2026-06-02-landing-and-release.md`.

Update `CLAUDE.md` Milestone Status: mark M5 complete and point the next code milestone at M6.

- [ ] **Step 4: Final verification**

Run:

```bash
npm test -- --run
npm run build
git status --short
```

Expected: all tests pass, build succeeds with only the known chunk-size warning, and status contains only intended M5 files plus docs.

- [ ] **Step 5: Commit**

```bash
git add implementation.md CLAUDE.md
git commit -m "docs: record fake specs and export milestone"
```

---

## Cross-Cutting Verification

Run after every code task:

```bash
npm test -- --run
npm run build
```

Browser verification is mandatory after Tasks 2, 3, 5, and 10. Task 11 is the milestone gate and must inspect downloaded raster dimensions, not only button clicks.

## Requirement Coverage (Milestone 5)

- fake spec form with all required fields -> Tasks 4-5.
- bundled example sheets -> Task 4.
- die-only high-DPI PNG -> Tasks 6, 8, and 10.
- dedicated poster export stage with background, chip, typography, and spec layout -> Tasks 6, 9, and 10.
- poster output contains no editor controls -> shared-artwork boundary in Task 3 and browser gate in Task 11.
- required visual effects render inside Konva -> shared `ChipArtwork` in Tasks 3, 8, and 9.
- Web Share when available, download fallback otherwise -> Tasks 7 and 10.
- documented pixel dimensions -> Task 6 tests and Task 11 raster inspection.

## Self-Review Notes

**Spec coverage:** Every M5 outcome and acceptance-gate line maps to at least one implementation task and one verification step.

**Schema consistency:** `FakeSpec` already exists inside persisted `Project`. `setSpec()` copies arrays and commits the existing shape; no migration is needed.

**Boundary consistency:** Export helpers decide dimensions and sharing behavior. Export stages render Konva-only visuals. `ExportPanel` owns refs and browser capture. The editor passes serializable project data and never exposes DOM to exporters.

**Visual consistency:** `ChipArtwork` is the render-time source for editor and both exporters. Poster composition adds background and typography around it without reimplementing chip visuals.

**Known review debt:** Rotation-aware rectangular clamping and the complete 16-type block palette remain explicit pre-release work. They are independent of M5 exporter architecture and stay out of this milestone.
