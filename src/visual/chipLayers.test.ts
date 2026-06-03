import { describe, expect, it } from 'vitest'
import { createHeroChip } from '../domain/heroChip'
import type { Block, Project } from '../domain/project'
import { buildChipLayers } from './chipLayers'

function sampleProject(): Project {
  return {
    ...createHeroChip('sample', 1),
    blocks: createHeroChip('sample', 1).blocks.slice(0, 3),
  }
}

function manyBlockProject(count: number): Project {
  const blocks: Block[] = Array.from({ length: count }, (_, index) => {
    const column = index % 15
    const row = Math.floor(index / 15)
    return {
      id: `block-${index}`,
      type: index % 5 === 0 ? 'QuantumMemory' : 'CPU',
      category: index % 5 === 0 ? 'fantasy' : 'real',
      x: 24 + column * 58,
      y: 32 + row * 48,
      w: 44,
      h: 32,
      rotation: 0,
      glow: index % 7 === 0,
      zIndex: index,
    }
  })
  return {
    ...createHeroChip('many', 1),
    die: { shape: 'rect', width: 920, height: 600, background: 'many-block-smoke' },
    blocks,
  }
}

describe('buildChipLayers', () => {
  it('creates material layers around the existing project schema', () => {
    const project = sampleProject()
    const layers = buildChipLayers(project)

    expect(layers.package.kind).toBe('package')
    expect(layers.package.bounds.x).toBeLessThan(0)
    expect(layers.dieBase.kind).toBe('dieBase')
    expect(layers.blockSurfaces).toHaveLength(project.blocks.length)
    expect(layers.microTiles.length).toBeGreaterThan(20)
    expect(layers.traces.length).toBeGreaterThan(0)
    expect(layers.glowOverlay.kind).toBe('glassGlow')
  })

  it('keeps generated micro tiles inside die bounds', () => {
    const project = sampleProject()
    const layers = buildChipLayers(project)

    for (const tile of layers.microTiles) {
      expect(tile.bounds.x).toBeGreaterThanOrEqual(0)
      expect(tile.bounds.y).toBeGreaterThanOrEqual(0)
      expect(tile.bounds.x + tile.bounds.width).toBeLessThanOrEqual(project.die.width)
      expect(tile.bounds.y + tile.bounds.height).toBeLessThanOrEqual(project.die.height)
    }
  })

  it('connects block centers without mutating the source block array', () => {
    const project = sampleProject()
    const original = project.blocks.map((block) => block.id)
    const layers = buildChipLayers(project)

    expect(project.blocks.map((block) => block.id)).toEqual(original)
    expect(layers.traces[0].points.length).toBe(4)
  })

  it('supports a 150-block smoke layout without dropping render layers', () => {
    const project = manyBlockProject(150)
    const originalBlocks = structuredClone(project.blocks)

    const layers = buildChipLayers(project)

    expect(layers.blockSurfaces).toHaveLength(150)
    expect(layers.traces).toHaveLength(149)
    expect(layers.microTiles.length).toBeGreaterThan(100)
    expect(project.blocks).toEqual(originalBlocks)
  })
})
