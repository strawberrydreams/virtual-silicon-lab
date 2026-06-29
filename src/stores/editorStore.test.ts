import { describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { buildBlock } from '../domain/blockFactory'
import type { DieShape, Project } from '../domain/project'
import type { ChipFinish } from '../domain/material/chipFinish'
import type {
  Scene3DAnimationSettings,
  Scene3DCameraSettings,
  Scene3DEnvironmentSettings,
  Scene3DLightingSettings,
  Scene3DLookSettings,
} from '../domain/scene3d/scene3d'
import { outlineToPolygon, resolveDieOutline } from '../domain/die/dieOutline'
import { pointInPolygon } from '../domain/die/polygonClamp'
import { createEditorStore } from './editorStore'

function seededProject(): Project {
  const base = createProject('Dream Chip', 'project-1', 100)
  return {
    ...base,
    blocks: [buildBlock(base, 'CPU', 'cpu'), { ...buildBlock(base, 'GPU', 'gpu'), zIndex: 1 }],
  }
}

function fixedIds(...ids: string[]) {
  return () => ids.shift() ?? 'extra-id'
}

function parameterProject(shape: DieShape = 'l-shape'): Project {
  const base = createProject('Parameter Chip', 'parameter-chip', 100)
  return {
    ...base,
    die: { ...base.die, shape, dieShapeParams: undefined },
    blocks: [
      {
        ...buildBlock(base, 'CPU', 'cpu'),
        x: 330,
        y: 350,
        w: 100,
        h: 80,
        rotation: 0,
      },
    ],
  }
}

describe('editor store selection and history', () => {
  it('selecting a block does not create an undo entry', () => {
    const store = createEditorStore(seededProject())
    store.getState().select('cpu')

    expect(store.getState().selectedBlockId).toBe('cpu')
    expect(store.getState().past).toHaveLength(0)
  })

  it('undo and redo restore previous and next project states', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('new-block') })
    store.getState().addBlock('SRAM')
    expect(store.getState().project.blocks).toHaveLength(3)

    store.getState().undo()
    expect(store.getState().project.blocks).toHaveLength(2)

    store.getState().redo()
    expect(store.getState().project.blocks).toHaveLength(3)
  })

  it('clears selection on undo when the selected block disappears', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('new-block') })
    store.getState().addBlock('SRAM') // selects 'new-block'
    expect(store.getState().selectedBlockId).toBe('new-block')

    store.getState().undo()
    expect(store.getState().selectedBlockId).toBeNull()
  })
})

describe('editor store commands', () => {
  it('adds a clamped block at the top z-index and selects it', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('new-block') })
    store.getState().addBlock('SRAM')

    const added = store.getState().project.blocks.find((block) => block.id === 'new-block')
    expect(added?.zIndex).toBe(2)
    expect(store.getState().selectedBlockId).toBe('new-block')
  })

  it('uses global reflow when a new block is added from the studio kit', () => {
    const base = createProject('Studio Chip', 'studio-chip', 100)
    const store = createEditorStore(
      {
        ...base,
        die: { shape: 'rect', width: 480, height: 320, background: 'studio-test' },
        blocks: [
          {
            ...buildBlock(base, 'CPU', 'cpu'),
            x: 32,
            y: 32,
            w: 112,
            h: 72,
            rotation: 0,
            zIndex: 0,
          },
          {
            ...buildBlock(base, 'GPU', 'gpu'),
            x: 160,
            y: 32,
            w: 112,
            h: 72,
            rotation: 0,
            zIndex: 1,
          },
        ],
      },
      { createId: fixedIds('new-dream') },
    )

    store.getState().addBlock('DreamSynth')

    const blocks = store.getState().project.blocks
    const cpu = blocks.find((block) => block.id === 'cpu')!
    const added = blocks.find((block) => block.id === 'new-dream')!
    expect(added).toBeDefined()
    expect(store.getState().selectedBlockId).toBe('new-dream')
    expect(cpu.x !== 32 || cpu.y !== 32).toBe(true)
  })

  it('transforms a block and clamps it to the die', () => {
    const store = createEditorStore(seededProject())
    store.getState().transformBlock('cpu', { x: 5000, y: 5000, w: 100, h: 100, rotation: 30 })

    const moved = store.getState().project.blocks.find((block) => block.id === 'cpu')!
    expect(rotatedCorners(moved).every((corner) => corner.x <= 960 + 1e-6)).toBe(true)
    expect(rotatedCorners(moved).every((corner) => corner.y <= 640 + 1e-6)).toBe(true)
    expect(moved.rotation).toBe(30)
  })

  it('uses global reflow when a block is moved without resizing or rotating', () => {
    const base = createProject('Studio Chip', 'studio-chip', 100)
    const store = createEditorStore({
      ...base,
      die: { shape: 'rect', width: 480, height: 320, background: 'studio-test' },
      blocks: [
        { ...buildBlock(base, 'CPU', 'cpu'), x: 32, y: 32, w: 112, h: 72, rotation: 0, zIndex: 0 },
        { ...buildBlock(base, 'GPU', 'gpu'), x: 160, y: 32, w: 112, h: 72, rotation: 0, zIndex: 1 },
        {
          ...buildBlock(base, 'QuantumMemory', 'mem'),
          x: 32,
          y: 160,
          w: 240,
          h: 64,
          rotation: 0,
          zIndex: 2,
        },
      ],
    })

    store.getState().transformBlock('mem', { x: 20, y: 20, w: 240, h: 64, rotation: 0 })

    const blocks = store.getState().project.blocks
    const memory = blocks.find((block) => block.id === 'mem')!
    const cpu = blocks.find((block) => block.id === 'cpu')!
    expect(memory.y).toBeLessThan(80)
    expect(cpu.x !== 32 || cpu.y !== 32).toBe(true)
  })

  it('clamps a rotated rectangular transform by its actual corners', () => {
    const store = createEditorStore(seededProject())
    store.getState().transformBlock('cpu', { x: 910, y: 590, w: 140, h: 80, rotation: 45 })

    const moved = store.getState().project.blocks.find((block) => block.id === 'cpu')!
    expect(rotatedCorners(moved).every((corner) => corner.x >= -1e-6)).toBe(true)
    expect(rotatedCorners(moved).every((corner) => corner.y >= -1e-6)).toBe(true)
    expect(rotatedCorners(moved).every((corner) => corner.x <= 960 + 1e-6)).toBe(true)
    expect(rotatedCorners(moved).every((corner) => corner.y <= 640 + 1e-6)).toBe(true)
  })

  it('ignores stale transform and update commands without creating history', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    const initialProject = store.getState().project

    store.getState().transformBlock('missing-block', { x: 40, y: 40, w: 120, h: 80, rotation: 0 })
    store.getState().updateBlockVisual('missing-block', { colorOverride: '#ff00ff' })
    store.getState().transformSticker('missing-sticker', { x: 24, y: 48, rotation: 12 })
    store.getState().updateSticker('missing-sticker', { text: 'STALE' })
    store.getState().transformSpray('missing-spray', { x: 24, y: 48, radius: 96 })
    store.getState().updateSpray('missing-spray', { intensity: 0.5 })

    expect(store.getState().project).toBe(initialProject)
    expect(store.getState().past).toHaveLength(0)
    expect(store.getState().future).toHaveLength(0)
  })

  it('deletes the selected block and clears selection', () => {
    const store = createEditorStore(seededProject())
    store.getState().select('cpu')
    store.getState().deleteSelected()

    expect(store.getState().project.blocks.map((block) => block.id)).toEqual(['gpu'])
    expect(store.getState().selectedBlockId).toBeNull()
  })

  it('duplicates the selected block with a new id and top z-index', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('copy') })
    store.getState().select('cpu')
    store.getState().duplicateSelected()

    const copy = store.getState().project.blocks.find((block) => block.id === 'copy')!
    expect(copy.type).toBe('CPU')
    expect(copy.zIndex).toBe(2)
    expect(store.getState().selectedBlockId).toBe('copy')
  })

  it('reorders by swapping z-index with the adjacent block', () => {
    const store = createEditorStore(seededProject()) // cpu z=0, gpu z=1
    store.getState().select('cpu')
    store.getState().bringForward()

    const byId = Object.fromEntries(store.getState().project.blocks.map((b) => [b.id, b.zIndex]))
    expect(byId.cpu).toBe(1)
    expect(byId.gpu).toBe(0)
  })

  it('does not create history when reorder has no adjacent block', () => {
    const store = createEditorStore(seededProject())
    store.getState().select('gpu') // gpu already on top (z=1)
    store.getState().bringForward()

    expect(store.getState().past).toHaveLength(0)
  })

  it('squares the die and re-clamps blocks when shape changes', () => {
    const store = createEditorStore(seededProject())
    store.getState().setDieShape('circle')

    const die = store.getState().project.die
    expect(die).toMatchObject({ shape: 'circle', width: 640, height: 640 })
    for (const block of store.getState().project.blocks) {
      expect(block.x + block.w).toBeLessThanOrEqual(640)
    }
  })

  it('changes to a parametric shape as one undoable clamp and clears stale params', () => {
    const project = seededProject()
    project.die.dieShapeParams = { chamfer: 0.2 }
    project.blocks[0] = { ...project.blocks[0], x: 820, y: 520, w: 120, h: 80 }
    const store = createEditorStore(project)

    store.getState().setDieShape('l-shape')

    const changed = store.getState().project
    const polygon = outlineToPolygon(resolveDieOutline(changed.die))
    expect(changed.die.shape).toBe('l-shape')
    expect(changed.die.dieShapeParams).toBeUndefined()
    expect(
      changed.blocks.every((block) =>
        rotatedCorners(block).every((corner) => pointInPolygon(corner, polygon)),
      ),
    ).toBe(true)
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project).toEqual(project)
  })

  it('does not create history when selecting the active die shape', () => {
    const store = createEditorStore(seededProject())
    store.getState().setDieShape('rect')
    expect(store.getState().past).toHaveLength(0)
  })

  it('previews die parameters without history and commits the gesture once', () => {
    const project = parameterProject()
    const store = createEditorStore(project)

    store.getState().previewDieShapeParams({ notch: { corner: 'bottom-right', size: 0.58 } })

    expect(store.getState().project.die.dieShapeParams).toEqual({
      notch: { corner: 'bottom-right', size: 0.58 },
    })
    expect(store.getState().past).toHaveLength(0)
    expect(store.getState().dieParameterEditActive).toBe(true)

    store.getState().commitDieShapeParamEdit()

    expect(store.getState().past).toEqual([project])
    expect(store.getState().dieParameterEditActive).toBe(false)
    store.getState().undo()
    expect(store.getState().project).toEqual(project)
  })

  it('derives every preview from the original block baseline', () => {
    const project = parameterProject()
    const originalBlock = project.blocks[0]
    const store = createEditorStore(project)

    store.getState().previewDieShapeParams({ notch: { corner: 'bottom-right', size: 0.65 } })
    expect(store.getState().project.blocks[0]).not.toEqual(originalBlock)

    store.getState().previewDieShapeParams({ notch: { corner: 'bottom-right', size: 0.3 } })

    expect(store.getState().project.blocks[0]).toEqual(originalBlock)
    expect(store.getState().past).toHaveLength(0)
  })

  it('cancels a die parameter preview without history', () => {
    const project = parameterProject()
    const store = createEditorStore(project)
    store.getState().previewDieShapeParams({ notch: { corner: 'top-left', size: 0.62 } })

    store.getState().cancelDieShapeParamEdit()

    expect(store.getState().project).toEqual(project)
    expect(store.getState().past).toHaveLength(0)
    expect(store.getState().dieParameterEditActive).toBe(false)
  })

  it('sets a corner or reset as one atomic parameter command', () => {
    const project = parameterProject()
    const store = createEditorStore(project)

    store.getState().setDieShapeParams({ notch: { corner: 'top-right', size: 0.5 } })
    expect(store.getState().project.die.dieShapeParams).toEqual({
      notch: { corner: 'top-right', size: 0.5 },
    })
    expect(store.getState().past).toHaveLength(1)

    store.getState().setDieShapeParams({ notch: { corner: 'bottom-right', size: 0.5 } })
    expect(store.getState().past).toHaveLength(2)
    store.getState().undo()
    expect(store.getState().project.die.dieShapeParams).toEqual({
      notch: { corner: 'top-right', size: 0.5 },
    })
  })

  it('ignores equal and legacy die parameter commands', () => {
    const parametric = createEditorStore(parameterProject())
    parametric.getState().setDieShapeParams({ notch: { corner: 'bottom-right', size: 0.5 } })
    expect(parametric.getState().past).toHaveLength(0)

    const legacyProject = parameterProject('rect')
    const legacy = createEditorStore(legacyProject)
    legacy.getState().previewDieShapeParams({ cornerRadius: 0.2 })
    legacy.getState().setDieShapeParams({ cornerRadius: 0.2 })
    expect(legacy.getState().project).toBe(legacyProject)
    expect(legacy.getState().past).toHaveLength(0)
    expect(legacy.getState().dieParameterEditActive).toBe(false)
  })

  it('finalizes an active parameter preview before another project command', () => {
    const project = parameterProject()
    const store = createEditorStore(project)
    store.getState().previewDieShapeParams({ notch: { corner: 'bottom-right', size: 0.62 } })

    store.getState().setTheme('military')

    expect(store.getState().past).toHaveLength(2)
    expect(store.getState().dieParameterEditActive).toBe(false)
    store.getState().undo()
    expect(store.getState().project.theme).toBe(project.theme)
    expect(store.getState().project.die.dieShapeParams).toEqual({
      notch: { corner: 'bottom-right', size: 0.62 },
    })
    store.getState().undo()
    expect(store.getState().project).toEqual(project)
  })

  it('finalizes and immediately undoes an active parameter preview', () => {
    const project = parameterProject()
    const store = createEditorStore(project)
    store.getState().previewDieShapeParams({ notch: { corner: 'bottom-right', size: 0.62 } })

    store.getState().undo()

    expect(store.getState().project).toEqual(project)
    expect(store.getState().future).toHaveLength(1)
    expect(store.getState().dieParameterEditActive).toBe(false)
  })

  it('re-clamps studio stickers and sprays when the die shape shrinks', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('sticker-1', 'spray-1') })
    store.getState().addSticker('badge')
    store.getState().addSpray()
    store.getState().transformSticker('sticker-1', { x: 900, y: 600 })
    store.getState().transformSpray('spray-1', { x: 920, y: 40 })

    store.getState().setDieShape('circle') // 960x640 rect → 640x640 circle

    const { stickers, sprays } = store.getState().project.studio
    expect(stickers[0].x).toBeLessThanOrEqual(640)
    expect(stickers[0].y).toBeLessThanOrEqual(640)
    expect(sprays[0].x).toBeLessThanOrEqual(640)
    expect(sprays[0].y).toBeLessThanOrEqual(640)
  })
})

function rotatedCorners(block: { x: number; y: number; w: number; h: number; rotation?: number }) {
  const radians = ((block.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [
    { x: 0, y: 0 },
    { x: block.w, y: 0 },
    { x: 0, y: block.h },
    { x: block.w, y: block.h },
  ].map((corner) => ({
    x: block.x + corner.x * cos - corner.y * sin,
    y: block.y + corner.x * sin + corner.y * cos,
  }))
}

describe('editorStore visual commands', () => {
  it('setTheme updates the theme and is undoable', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    store.getState().setTheme('military')
    expect(store.getState().project.theme).toBe('military')
    expect(store.getState().past).toHaveLength(1)
    store.getState().undo()
    expect(store.getState().project.theme).toBe('neon')
  })

  it('setTheme is a no-op when the theme is unchanged', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    store.getState().setTheme('neon')
    expect(store.getState().past).toHaveLength(0)
  })

  it('sets the chip finish as one undoable project command', () => {
    const store = createEditorStore(seededProject())

    store.getState().setFinish('metallic')

    expect(store.getState().project.finish).toBe('metallic')
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.finish).toBe('gloss')

    store.getState().redo()
    expect(store.getState().project.finish).toBe('metallic')
  })

  it('does not create history when selecting the active finish', () => {
    const project = { ...seededProject(), finish: 'satin' as ChipFinish }
    const store = createEditorStore(project)

    store.getState().setFinish('satin')

    expect(store.getState().project).toBe(project)
    expect(store.getState().past).toHaveLength(0)
  })

  it('sets a block finish override as one undoable command', () => {
    const store = createEditorStore(seededProject())

    store.getState().setBlockFinish('cpu', 'metallic')

    expect(store.getState().project.blocks.find((block) => block.id === 'cpu')?.finish).toBe(
      'metallic',
    )
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.blocks.find((block) => block.id === 'cpu')?.finish).toBe(
      undefined,
    )

    store.getState().redo()
    expect(store.getState().project.blocks.find((block) => block.id === 'cpu')?.finish).toBe(
      'metallic',
    )
  })

  it('clears a block finish override back to inherited without leaving a persisted key', () => {
    const project = {
      ...seededProject(),
      blocks: seededProject().blocks.map((block) =>
        block.id === 'cpu' ? { ...block, finish: 'satin' as ChipFinish } : block,
      ),
    }
    const store = createEditorStore(project)

    store.getState().setBlockFinish('cpu', undefined)

    const cpu = store.getState().project.blocks.find((block) => block.id === 'cpu')!
    expect(cpu).not.toHaveProperty('finish')
    expect(store.getState().past).toHaveLength(1)
  })

  it('does not create history for stale or unchanged block finish commands', () => {
    const project = {
      ...seededProject(),
      blocks: seededProject().blocks.map((block) =>
        block.id === 'cpu' ? { ...block, finish: 'satin' as ChipFinish } : block,
      ),
    }
    const store = createEditorStore(project)

    store.getState().setBlockFinish('cpu', 'satin')
    store.getState().setBlockFinish('missing', 'metallic')

    expect(store.getState().project).toBe(project)
    expect(store.getState().past).toHaveLength(0)
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

  it('adds a studio sticker and can undo it', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), {
      createId: fixedIds('sticker-1'),
    })

    store.getState().addSticker()

    expect(store.getState().project.studio.stickers).toEqual([
      {
        id: 'sticker-1',
        kind: 'badge',
        x: 480,
        y: 320,
        text: 'STAR',
        color: '#f9f4ff',
        rotation: -8,
      },
    ])
    expect(store.getState().selectedStudioItem).toEqual({ kind: 'sticker', id: 'sticker-1' })
    store.getState().undo()
    expect(store.getState().project.studio.stickers).toHaveLength(0)
    expect(store.getState().selectedStudioItem).toBeNull()
  })

  it('adds stickers of a chosen kind with kind-specific defaults', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), { createId: fixedIds('warn-1') })

    store.getState().addSticker('warning')

    const sticker = store.getState().project.studio.stickers[0]
    expect(sticker.kind).toBe('warning')
    expect(sticker.text).toBe('!')
    expect(store.getState().selectedStudioItem).toEqual({ kind: 'sticker', id: 'warn-1' })
  })

  it('adds a studio spray and can undo it', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), { createId: fixedIds('spray-1') })

    store.getState().addSpray()

    expect(store.getState().project.studio.sprays).toEqual([
      {
        id: 'spray-1',
        x: 384,
        y: 256,
        radius: 154,
        color: '#ff70dc',
        intensity: 0.72,
        blend: 'screen',
      },
    ])
    expect(store.getState().selectedStudioItem).toEqual({ kind: 'spray', id: 'spray-1' })
    store.getState().undo()
    expect(store.getState().project.studio.sprays).toHaveLength(0)
    expect(store.getState().selectedStudioItem).toBeNull()
  })

  it('adds a spray with a chosen color', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), { createId: fixedIds('spray-1') })

    store.getState().addSpray('#00ffee')

    expect(store.getState().project.studio.sprays[0].color).toBe('#00ffee')
    expect(store.getState().project.studio.sprays[0].blend).toBe('screen')
  })

  it('moves and updates selected studio items', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), {
      createId: fixedIds('sticker-1', 'spray-1'),
    })

    store.getState().addSticker()
    store.getState().transformSticker('sticker-1', { x: 24, y: 48, rotation: 12 })
    store.getState().updateSticker('sticker-1', { text: 'WOW', color: '#ffcc00' })
    store.getState().addSpray()
    store.getState().transformSpray('spray-1', { x: 900, y: 620, radius: 90 })
    store.getState().updateSpray('spray-1', { intensity: 0.35, color: '#00ffee' })

    expect(store.getState().project.studio.stickers[0]).toMatchObject({
      x: 24,
      y: 48,
      rotation: 12,
      text: 'WOW',
      color: '#ffcc00',
    })
    expect(store.getState().project.studio.sprays[0]).toMatchObject({
      x: 900,
      y: 620,
      radius: 90,
      intensity: 0.35,
      color: '#00ffee',
    })
  })

  it('sets and clamps studio tile settings as a single undo step', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    const before = store.getState().past.length

    store.getState().setTileSettings({ detailDensity: 0.9 })
    store.getState().setTileSettings({ routeIntensity: 5 })
    store.getState().setTileSettings({ detailDensity: -1 })
    store.getState().setTileSettings({ contactStyle: 'dense' })

    const tile = store.getState().project.studio.tileSettings
    expect(tile.detailDensity).toBe(0)
    expect(tile.routeIntensity).toBe(1)
    expect(tile.contactStyle).toBe('dense')
    expect(store.getState().past.length).toBe(before + 1)

    store.getState().undo()
    expect(store.getState().project.studio.tileSettings.contactStyle).toBe('balanced')
  })

  it('coalesces repeated edits to one studio item into a single undo step', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), {
      createId: fixedIds('sticker-1'),
    })

    store.getState().addSticker()
    const pastAfterAdd = store.getState().past.length

    store.getState().updateSticker('sticker-1', { text: 'W' })
    store.getState().updateSticker('sticker-1', { text: 'WO' })
    store.getState().updateSticker('sticker-1', { text: 'WOW' })

    expect(store.getState().past.length).toBe(pastAfterAdd + 1)
    expect(store.getState().project.studio.stickers[0].text).toBe('WOW')

    store.getState().undo()
    expect(store.getState().project.studio.stickers[0].text).toBe('STAR')
  })

  it('starts a fresh undo step for edits made after an undo', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), {
      createId: fixedIds('sticker-1'),
    })

    store.getState().addSticker()
    store.getState().updateSticker('sticker-1', { text: 'W' })
    store.getState().undo()
    expect(store.getState().project.studio.stickers[0].text).toBe('STAR')

    store.getState().updateSticker('sticker-1', { text: 'X' })
    store.getState().undo()
    expect(store.getState().project.studio.stickers[0].text).toBe('STAR')
  })

  it('deletes and duplicates selected studio items', () => {
    const store = createEditorStore(createProject('p', 'p1', 0), {
      createId: fixedIds('sticker-1', 'sticker-copy', 'spray-1'),
    })

    store.getState().addSticker()
    store.getState().duplicateSelected()
    expect(store.getState().project.studio.stickers.map((sticker) => sticker.id)).toEqual([
      'sticker-1',
      'sticker-copy',
    ])
    expect(store.getState().selectedStudioItem).toEqual({ kind: 'sticker', id: 'sticker-copy' })

    store.getState().addSpray()
    store.getState().deleteSelected()
    expect(store.getState().project.studio.sprays).toHaveLength(0)
    expect(store.getState().selectedStudioItem).toBeNull()
  })

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

  it('sets a scene3d camera as one undoable project command', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    const targetNudge: [number, number, number] = [0.1, -0.2, 0.3]
    const camera: Scene3DCameraSettings = {
      azimuthRadians: 0.5,
      elevationRadians: 0.6,
      zoom: 0.4,
      targetNudge,
      fov: 46,
    }

    store.getState().setScene3DCamera(camera)
    targetNudge[0] = 0.9

    expect(store.getState().project.scene3d?.camera).toEqual({
      azimuthRadians: 0.5,
      elevationRadians: 0.6,
      zoom: 0.4,
      targetNudge: [0.1, -0.2, 0.3],
      fov: 46,
    })
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.scene3d).toBeUndefined()

    store.getState().redo()
    expect(store.getState().project.scene3d?.camera?.zoom).toBe(0.4)
  })

  it('resets only the scene3d camera and removes scene3d when empty', () => {
    const camera: Scene3DCameraSettings = {
      azimuthRadians: 0.5,
      elevationRadians: 0.6,
      zoom: 0.4,
    }
    const withOnlyCamera = { ...createProject('p', 'p1', 0), scene3d: { camera } }
    const onlyCameraStore = createEditorStore(withOnlyCamera)

    onlyCameraStore.getState().resetScene3DCamera()

    expect(onlyCameraStore.getState().project.scene3d).toBeUndefined()
    expect(onlyCameraStore.getState().past).toHaveLength(1)
    onlyCameraStore.getState().undo()
    expect(onlyCameraStore.getState().project.scene3d?.camera).toEqual(camera)

    const studioLighting: Scene3DLightingSettings = { preset: 'studio', intensity: 1 }
    const withLighting = {
      ...createProject('p2', 'p2', 0),
      scene3d: { camera, lighting: studioLighting },
    }
    const lightingStore = createEditorStore(withLighting)

    lightingStore.getState().resetScene3DCamera()

    expect(lightingStore.getState().project.scene3d).toEqual({ lighting: studioLighting })
  })

  it('does not create history for unchanged scene3d camera commands', () => {
    const camera: Scene3DCameraSettings = {
      azimuthRadians: 0.5,
      elevationRadians: 0.6,
      zoom: 0.4,
    }
    const project = { ...createProject('p', 'p1', 0), scene3d: { camera } }
    const store = createEditorStore(project)

    store.getState().setScene3DCamera({ ...camera })
    const blankStore = createEditorStore(createProject('blank', 'blank', 0))
    blankStore.getState().resetScene3DCamera()

    expect(store.getState().past).toHaveLength(0)
    expect(blankStore.getState().past).toHaveLength(0)
  })

  it('sets scene3d lighting as one undoable project command', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    const lighting: Scene3DLightingSettings = { preset: 'neon-noir', intensity: 1.25 }

    store.getState().setScene3DLighting(lighting)

    expect(store.getState().project.scene3d?.lighting).toEqual({
      preset: 'neon-noir',
      intensity: 1.25,
    })
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.scene3d).toBeUndefined()

    store.getState().redo()
    expect(store.getState().project.scene3d?.lighting).toEqual(lighting)
  })

  it('resets only scene3d lighting and removes scene3d when empty', () => {
    const lighting: Scene3DLightingSettings = { preset: 'daylight', intensity: 0.85 }
    const withOnlyLighting = { ...createProject('p', 'p1', 0), scene3d: { lighting } }
    const onlyLightingStore = createEditorStore(withOnlyLighting)

    onlyLightingStore.getState().resetScene3DLighting()

    expect(onlyLightingStore.getState().project.scene3d).toBeUndefined()
    expect(onlyLightingStore.getState().past).toHaveLength(1)
    onlyLightingStore.getState().undo()
    expect(onlyLightingStore.getState().project.scene3d?.lighting).toEqual(lighting)

    const camera: Scene3DCameraSettings = {
      azimuthRadians: 0.5,
      elevationRadians: 0.6,
      zoom: 0.4,
    }
    const withCamera = { ...createProject('p2', 'p2', 0), scene3d: { camera, lighting } }
    const cameraStore = createEditorStore(withCamera)

    cameraStore.getState().resetScene3DLighting()

    expect(cameraStore.getState().project.scene3d).toEqual({ camera })
  })

  it('does not create history for unchanged scene3d lighting commands', () => {
    const lighting: Scene3DLightingSettings = { preset: 'dramatic', intensity: 1.1 }
    const project = { ...createProject('p', 'p1', 0), scene3d: { lighting } }
    const store = createEditorStore(project)

    store.getState().setScene3DLighting({ ...lighting })
    const blankStore = createEditorStore(createProject('blank', 'blank', 0))
    blankStore.getState().resetScene3DLighting()

    expect(store.getState().past).toHaveLength(0)
    expect(blankStore.getState().past).toHaveLength(0)
  })

  it('sets scene3d environment as one undoable project command', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    const environment: Scene3DEnvironmentSettings = {
      topColor: '#112233',
      bottomColor: '#445566',
      exposure: 1.25,
      bloom: { threshold: 0.4, strength: 1.2, radius: 0.65 },
    }

    store.getState().setScene3DEnvironment(environment)

    expect(store.getState().project.scene3d?.environment).toEqual(environment)
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.scene3d).toBeUndefined()

    store.getState().redo()
    expect(store.getState().project.scene3d?.environment).toEqual(environment)
  })

  it('resets only scene3d environment and removes scene3d when empty', () => {
    const environment: Scene3DEnvironmentSettings = {
      topColor: '#112233',
      bottomColor: '#445566',
      exposure: 1.25,
      bloom: { threshold: 0.4, strength: 1.2, radius: 0.65 },
    }
    const withOnlyEnvironment = { ...createProject('p', 'p1', 0), scene3d: { environment } }
    const onlyEnvironmentStore = createEditorStore(withOnlyEnvironment)

    onlyEnvironmentStore.getState().resetScene3DEnvironment()

    expect(onlyEnvironmentStore.getState().project.scene3d).toBeUndefined()
    expect(onlyEnvironmentStore.getState().past).toHaveLength(1)
    onlyEnvironmentStore.getState().undo()
    expect(onlyEnvironmentStore.getState().project.scene3d?.environment).toEqual(environment)

    const lighting: Scene3DLightingSettings = { preset: 'studio', intensity: 1 }
    const withLighting = { ...createProject('p2', 'p2', 0), scene3d: { lighting, environment } }
    const lightingStore = createEditorStore(withLighting)

    lightingStore.getState().resetScene3DEnvironment()

    expect(lightingStore.getState().project.scene3d).toEqual({ lighting })
  })

  it('does not create history for unchanged scene3d environment commands', () => {
    const environment: Scene3DEnvironmentSettings = {
      topColor: '#112233',
      bottomColor: '#445566',
      exposure: 1.25,
      bloom: { threshold: 0.4, strength: 1.2, radius: 0.65 },
    }
    const project = { ...createProject('p', 'p1', 0), scene3d: { environment } }
    const store = createEditorStore(project)

    store.getState().setScene3DEnvironment({
      ...environment,
      bloom: { ...environment.bloom },
    })
    const blankStore = createEditorStore(createProject('blank', 'blank', 0))
    blankStore.getState().resetScene3DEnvironment()

    expect(store.getState().past).toHaveLength(0)
    expect(blankStore.getState().past).toHaveLength(0)
  })

  it('sets scene3d animation as one undoable project command', () => {
    const store = createEditorStore(createProject('p', 'p1', 0))
    const animation: Scene3DAnimationSettings = {
      turntable: { enabled: false, periodSeconds: 24 },
      glow: { enabled: true, periodSeconds: 5, min: 0.7, max: 1.35 },
    }

    store.getState().setScene3DAnimation(animation)
    animation.glow.min = 0.2

    expect(store.getState().project.scene3d?.animation).toEqual({
      turntable: { enabled: false, periodSeconds: 24 },
      glow: { enabled: true, periodSeconds: 5, min: 0.7, max: 1.35 },
    })
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.scene3d).toBeUndefined()

    store.getState().redo()
    expect(store.getState().project.scene3d?.animation?.turntable.periodSeconds).toBe(24)
  })

  it('resets only scene3d animation and removes scene3d when empty', () => {
    const animation: Scene3DAnimationSettings = {
      turntable: { enabled: true, periodSeconds: 18 },
      glow: { enabled: false, periodSeconds: 4, min: 0.75, max: 1.2 },
    }
    const withOnlyAnimation = { ...createProject('p', 'p1', 0), scene3d: { animation } }
    const onlyAnimationStore = createEditorStore(withOnlyAnimation)

    onlyAnimationStore.getState().resetScene3DAnimation()

    expect(onlyAnimationStore.getState().project.scene3d).toBeUndefined()
    expect(onlyAnimationStore.getState().past).toHaveLength(1)
    onlyAnimationStore.getState().undo()
    expect(onlyAnimationStore.getState().project.scene3d?.animation).toEqual(animation)

    const environment: Scene3DEnvironmentSettings = {
      topColor: '#112233',
      bottomColor: '#445566',
      exposure: 1.25,
      bloom: { threshold: 0.4, strength: 1.2, radius: 0.65 },
    }
    const withEnvironment = { ...createProject('p2', 'p2', 0), scene3d: { environment, animation } }
    const environmentStore = createEditorStore(withEnvironment)

    environmentStore.getState().resetScene3DAnimation()

    expect(environmentStore.getState().project.scene3d).toEqual({ environment })
  })

  it('does not create history for unchanged scene3d animation commands', () => {
    const animation: Scene3DAnimationSettings = {
      turntable: { enabled: true, periodSeconds: 18 },
      glow: { enabled: false, periodSeconds: 4, min: 0.75, max: 1.2 },
    }
    const project = { ...createProject('p', 'p1', 0), scene3d: { animation } }
    const store = createEditorStore(project)

    store.getState().setScene3DAnimation({
      turntable: { ...animation.turntable },
      glow: { ...animation.glow },
    })
    const blankStore = createEditorStore(createProject('blank', 'blank', 0))
    blankStore.getState().resetScene3DAnimation()

    expect(store.getState().past).toHaveLength(0)
    expect(blankStore.getState().past).toHaveLength(0)
  })

  it('applies a scene3d look as one undoable command while preserving animation', () => {
    const animation: Scene3DAnimationSettings = {
      turntable: { enabled: false, periodSeconds: 24 },
      glow: { enabled: true, periodSeconds: 5, min: 0.7, max: 1.3 },
    }
    const look: Scene3DLookSettings = {
      camera: { azimuthRadians: 0.18, elevationRadians: 0.82, zoom: 0.32, fov: 38 },
      lighting: { preset: 'daylight', intensity: 1.05 },
      environment: {
        topColor: '#e8edf7',
        bottomColor: '#8994a8',
        exposure: 1.1,
        bloom: { threshold: 0.65, strength: 0.35, radius: 0.4 },
      },
    }
    const store = createEditorStore({ ...createProject('p', 'p1', 0), scene3d: { animation } })

    store.getState().applyScene3DLook(look)

    expect(store.getState().project.scene3d).toEqual({ ...look, animation })
    expect(store.getState().past).toHaveLength(1)
    store.getState().undo()
    expect(store.getState().project.scene3d).toEqual({ animation })
    store.getState().redo()
    expect(store.getState().project.scene3d).toEqual({ ...look, animation })
  })

  it('does not create history for unchanged scene3d look commands', () => {
    const look: Scene3DLookSettings = {
      camera: { azimuthRadians: -0.68, elevationRadians: 0.42, zoom: 0.18, fov: 50 },
      lighting: { preset: 'dramatic', intensity: 1.25 },
      environment: {
        topColor: '#111827',
        bottomColor: '#030712',
        exposure: 1.05,
        bloom: { threshold: 0.35, strength: 1.35, radius: 0.72 },
      },
    }
    const store = createEditorStore({ ...createProject('p', 'p1', 0), scene3d: { ...look } })

    store.getState().applyScene3DLook({
      camera: { ...look.camera },
      lighting: { ...look.lighting },
      environment: { ...look.environment, bloom: { ...look.environment.bloom } },
    })

    expect(store.getState().past).toHaveLength(0)
  })
})

describe('editor store AI suggestions', () => {
  it('applies a suggestion as one undoable block addition', () => {
    const store = createEditorStore(seededProject(), { createId: fixedIds('sug-1') })
    const before = store.getState().project.blocks.length

    store.getState().applyAiSuggestion({ type: 'SRAM', x: 0.1, y: 0.1, w: 0.2, h: 0.2 })

    const added = store.getState().project.blocks
    expect(added).toHaveLength(before + 1)
    expect(added[added.length - 1]).toMatchObject({ id: 'sug-1', type: 'SRAM' })
    expect(store.getState().selectedBlockId).toBe('sug-1')
    expect(store.getState().past).toHaveLength(1)

    store.getState().undo()
    expect(store.getState().project.blocks).toHaveLength(before)
  })

  it('ignores a suggestion with an unknown block type without creating history', () => {
    const store = createEditorStore(seededProject())
    const before = store.getState().project.blocks.length

    store.getState().applyAiSuggestion({ type: 'Nonsense', x: 0.1, y: 0.1, w: 0.2, h: 0.2 })

    expect(store.getState().project.blocks).toHaveLength(before)
    expect(store.getState().past).toHaveLength(0)
  })
})
