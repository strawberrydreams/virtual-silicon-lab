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

  it('includes derived filler cells in the layer model', () => {
    const project = sampleProject()
    const layers = buildChipLayers(project)
    expect(Array.isArray(layers.fillerCells)).toBe(true)
    expect(layers.fillerCells.length).toBeGreaterThan(0)
  })

  it('adds derived SoC fabrication details for pad arrays, rails, and via clusters', () => {
    const project = sampleProject()
    const layers = buildChipLayers(project)
    const detailKinds = new Set(layers.fabricDetails.map((detail) => detail.kind))

    expect(detailKinds).toContain('padArray')
    expect(detailKinds).toContain('powerRail')
    expect(detailKinds).toContain('viaCluster')
    expect(layers.fabricDetails.length).toBeGreaterThan(project.blocks.length)
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

  it('routes traces through the rotated visual center of a block', () => {
    const base = createHeroChip('rotated', 1)
    const project: Project = {
      ...base,
      die: { shape: 'rect', width: 600, height: 400, background: 'rotate-trace' },
      blocks: [
        { id: 'a', type: 'CPU', category: 'real', x: 40, y: 40, w: 80, h: 40, rotation: 0, zIndex: 0 },
        { id: 'b', type: 'GPU', category: 'real', x: 100, y: 100, w: 80, h: 40, rotation: 90, zIndex: 1 },
      ],
    }

    const layers = buildChipLayers(project)
    const trace = layers.traces[0]

    // Block "a" is unrotated: center is (x + w/2, y + h/2) = (80, 60).
    expect(trace.points[0]).toBeCloseTo(80)
    expect(trace.points[1]).toBeCloseTo(60)
    // Block "b" is rotated 90deg about its (x, y) origin, so the local center
    // (40, 20) maps to (x - 20, y + 40) = (80, 140), not (140, 120).
    expect(trace.points[2]).toBeCloseTo(80)
    expect(trace.points[3]).toBeCloseTo(140)
  })

  it('packs more micro tiles as studio detail density rises', () => {
    const base = sampleProject()
    const sparse = buildChipLayers({
      ...base,
      studio: { ...base.studio, tileSettings: { ...base.studio.tileSettings, detailDensity: 0 } },
    })
    const dense = buildChipLayers({
      ...base,
      studio: { ...base.studio, tileSettings: { ...base.studio.tileSettings, detailDensity: 1 } },
    })

    expect(dense.microTiles.length).toBeGreaterThan(sparse.microTiles.length)
  })

  it('thickens traces as studio route intensity rises', () => {
    const base = sampleProject()
    const quiet = buildChipLayers({
      ...base,
      studio: { ...base.studio, tileSettings: { ...base.studio.tileSettings, routeIntensity: 0 } },
    })
    const loud = buildChipLayers({
      ...base,
      studio: { ...base.studio, tileSettings: { ...base.studio.tileSettings, routeIntensity: 1 } },
    })

    expect(loud.traces[0].width).toBeGreaterThan(quiet.traces[0].width)
    expect(loud.traces[0].opacity).toBeGreaterThan(quiet.traces[0].opacity)
  })

  it('caps micro-tile node count on a very large die at max density', () => {
    const base = sampleProject()
    const huge = buildChipLayers({
      ...base,
      die: { ...base.die, width: 4000, height: 3000 },
      studio: { ...base.studio, tileSettings: { ...base.studio.tileSettings, detailDensity: 1 } },
    })

    expect(huge.microTiles.length).toBeLessThanOrEqual(4000)
    expect(huge.microTiles.length).toBeGreaterThan(1000)
  })

  it('keeps pad cells and power rails inside a circular die outline', () => {
    const base = sampleProject()
    const project: Project = { ...base, die: { shape: 'circle', width: 760, height: 760, background: 'circle-fabric' } }
    const cx = 380
    const cy = 380
    const r = 380

    const layers = buildChipLayers(project)

    const pads = layers.fabricDetails.filter((detail) => detail.kind === 'padArray')
    expect(pads.some((detail) => detail.cells.length > 0)).toBe(true) // ring survives near edge centers
    for (const detail of pads) {
      for (const cell of detail.cells) {
        const corners = [
          [cell.x, cell.y],
          [cell.x + cell.w, cell.y],
          [cell.x, cell.y + cell.h],
          [cell.x + cell.w, cell.y + cell.h],
        ]
        for (const [x, y] of corners) expect(Math.hypot(x - cx, y - cy)).toBeLessThanOrEqual(r + 0.001)
      }
    }
    const rails = layers.fabricDetails.filter((detail) => detail.kind === 'powerRail')
    expect(rails.length).toBeGreaterThan(0)
    for (const rail of rails) {
      if (rail.kind !== 'powerRail') continue
      const [x1, y1, x2, y2] = rail.points
      expect(Math.hypot(x1 - cx, y1 - cy)).toBeLessThanOrEqual(r + 0.001)
      expect(Math.hypot(x2 - cx, y2 - cy)).toBeLessThanOrEqual(r + 0.001)
    }
  })

  it('keeps power rails inside a hexagonal die incircle', () => {
    const base = sampleProject()
    const project: Project = { ...base, die: { shape: 'hexagon', width: 760, height: 760, background: 'hex-fabric' } }
    const r = 380 * (Math.sqrt(3) / 2)

    const layers = buildChipLayers(project)

    for (const rail of layers.fabricDetails.filter((detail) => detail.kind === 'powerRail')) {
      if (rail.kind !== 'powerRail') continue
      const [x1, y1, x2, y2] = rail.points
      expect(Math.hypot(x1 - 380, y1 - 380)).toBeLessThanOrEqual(r + 0.001)
      expect(Math.hypot(x2 - 380, y2 - 380)).toBeLessThanOrEqual(r + 0.001)
    }
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
