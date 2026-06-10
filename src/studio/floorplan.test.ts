import { describe, expect, it } from 'vitest'
import type { Project } from '../domain/project'
import { buildFillerCells, usableDieRegion } from './floorplan'

function makeProject(overrides: Partial<Project> = {}): Project {
  const base: Project = {
    schemaVersion: 4,
    id: 'p1',
    name: 'Test',
    createdAt: 0,
    updatedAt: 0,
    die: { shape: 'square', width: 760, height: 760, background: '#000' },
    blocks: [],
    decorations: [],
    theme: 'neon',
    spec: {
      brand: 'TEST',
      series: 'X',
      generation: '1',
      process: '3nm',
      cores: 8,
      bandwidth: '1TB/s',
      features: [],
      description: '',
    },
    studio: {
      layoutMode: 'global-reflow',
      detailMode: 'semi-auto',
      tileSettings: { detailDensity: 0.5, routeIntensity: 0.5, contactStyle: 'balanced' },
      colorSettings: {
        background: { mode: 'solid', color: '#000' },
        package: { mode: 'solid', color: '#000' },
        die: { mode: 'solid', color: '#000' },
        block: { mode: 'solid', color: '#000' },
        tile: { mode: 'solid', color: '#000' },
        trace: { mode: 'solid', color: '#000' },
        label: { mode: 'solid', color: '#000' },
        mark: { mode: 'solid', color: '#000' },
      },
      sprays: [],
      stickers: [],
    },
  }
  return { ...base, ...overrides }
}

describe('usableDieRegion', () => {
  it('insets a rect die by padding', () => {
    const region = usableDieRegion({ shape: 'square', width: 760, height: 760, background: '#000' })
    expect(region).toEqual({ x: 16, y: 16, width: 728, height: 728 })
  })
})

describe('buildFillerCells', () => {
  it('fills an empty die with cells inside the usable region', () => {
    const cells = buildFillerCells(makeProject())
    expect(cells.length).toBeGreaterThan(0)
    const region = usableDieRegion(makeProject().die)
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(region.x)
      expect(cell.y).toBeGreaterThanOrEqual(region.y)
      expect(cell.x + cell.w).toBeLessThanOrEqual(region.x + region.width + 0.001)
      expect(cell.y + cell.h).toBeLessThanOrEqual(region.y + region.height + 0.001)
    }
  })

  it('never overlaps a real block', () => {
    const project = makeProject({
      blocks: [
        { id: 'b1', type: 'CPU', category: 'real', x: 200, y: 200, w: 360, h: 360, rotation: 0, zIndex: 0 },
      ],
    })
    const block = project.blocks[0]
    for (const cell of buildFillerCells(project)) {
      const overlap =
        cell.x < block.x + block.w &&
        cell.x + cell.w > block.x &&
        cell.y < block.y + block.h &&
        cell.y + cell.h > block.y
      expect(overlap).toBe(false)
    }
  })

  it('respects the rotated footprint of a rotated block', () => {
    // 400x80 block rotated 90° about its top-left occupies [320,400]x[160,560],
    // while its unrotated rect would claim [400,800]x[160,240].
    const project = makeProject({
      blocks: [
        { id: 'rot', type: 'CPU', category: 'real', x: 400, y: 160, w: 400, h: 80, rotation: 90, zIndex: 0 },
      ],
    })
    const footprint = { x: 320, y: 160, w: 80, h: 400 }

    const cells = buildFillerCells(project)

    for (const cell of cells) {
      const overlap =
        cell.x < footprint.x + footprint.w &&
        cell.x + cell.w > footprint.x &&
        cell.y < footprint.y + footprint.h &&
        cell.y + cell.h > footprint.y
      expect(overlap).toBe(false)
    }
    // The stale unrotated zone right of the block is actually free — it must be filled.
    expect(cells.some((cell) => cell.x > 410 && cell.y < 240 && cell.y + cell.h > 160)).toBe(true)
  })

  it('is deterministic for identical input', () => {
    expect(buildFillerCells(makeProject())).toEqual(buildFillerCells(makeProject()))
  })

  it('returns no cells when a block covers the whole usable region', () => {
    const project = makeProject({
      blocks: [
        { id: 'full', type: 'CPU', category: 'real', x: 8, y: 8, w: 744, h: 744, rotation: 0, zIndex: 0 },
      ],
    })
    expect(buildFillerCells(project)).toEqual([])
  })

  it('packs more cells at higher detail density', () => {
    const sparse = buildFillerCells(
      makeProject({
        studio: {
          ...makeProject().studio,
          tileSettings: { detailDensity: 0, routeIntensity: 0.5, contactStyle: 'balanced' },
        },
      }),
    )
    const dense = buildFillerCells(
      makeProject({
        studio: {
          ...makeProject().studio,
          tileSettings: { detailDensity: 1, routeIntensity: 0.5, contactStyle: 'balanced' },
        },
      }),
    )
    expect(dense.length).toBeGreaterThan(sparse.length)
  })
})
