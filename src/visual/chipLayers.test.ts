import { describe, expect, it } from 'vitest'
import { createHeroChip } from '../domain/heroChip'
import type { Project } from '../domain/project'
import { buildChipLayers } from './chipLayers'

function sampleProject(): Project {
  return {
    ...createHeroChip('sample', 1),
    blocks: createHeroChip('sample', 1).blocks.slice(0, 3),
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
})
