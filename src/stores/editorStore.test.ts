import { describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { buildBlock } from '../domain/blockFactory'
import type { Project } from '../domain/project'
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

    store
      .getState()
      .transformBlock('missing-block', { x: 40, y: 40, w: 120, h: 80, rotation: 0 })
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
})
