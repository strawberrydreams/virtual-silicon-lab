import { describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { buildBlock } from '../domain/blockFactory'
import type { Project } from '../domain/project'
import { createEditorStore } from './editorStore'

function seededProject(): Project {
  const base = createProject('Dream Chip', 'project-1', 100)
  return {
    ...base,
    blocks: [
      buildBlock(base, 'CPU', 'cpu'),
      { ...buildBlock(base, 'GPU', 'gpu'), zIndex: 1 },
    ],
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

  it('transforms a block and clamps it to the die', () => {
    const store = createEditorStore(seededProject())
    store.getState().transformBlock('cpu', { x: 5000, y: 5000, w: 100, h: 100, rotation: 30 })

    const moved = store.getState().project.blocks.find((block) => block.id === 'cpu')!
    expect(rotatedCorners(moved).every((corner) => corner.x <= 960 + 1e-6)).toBe(true)
    expect(rotatedCorners(moved).every((corner) => corner.y <= 640 + 1e-6)).toBe(true)
    expect(moved.rotation).toBe(30)
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
