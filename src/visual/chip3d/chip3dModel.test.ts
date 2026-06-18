import { describe, expect, it } from 'vitest'
import { buildChipLayers } from '../chipLayers'
import { createProject } from '../../domain/projectFactory'
import { buildChip3DModel, type Chip3DPalette } from './chip3dModel'

const palette: Chip3DPalette = {
  die: '#101820',
  blockReal: '#8aa0b4',
  blockFantasy: '#d76a4a',
}

function rectProjectWithBlocks() {
  const project = createProject('3D Test')
  project.die = { shape: 'rect', width: 800, height: 500, background: '#101820' }
  project.blocks = [
    {
      id: 'b-real',
      type: 'CPU',
      category: 'real',
      x: 100,
      y: 80,
      w: 120,
      h: 90,
      rotation: 0,
      zIndex: 0,
    },
    {
      id: 'b-fan',
      type: 'ConsciousnessProcessor',
      category: 'fantasy',
      x: 400,
      y: 200,
      w: 140,
      h: 100,
      rotation: 0,
      zIndex: 1,
    },
  ]
  return project
}

describe('buildChip3DModel', () => {
  it('stacks package below die below blocks, with package color from the layer model', () => {
    const project = rectProjectWithBlocks()
    const layers = buildChipLayers(project)
    const model = buildChip3DModel(layers, project.die, palette)

    const pkg = model.pieces.find((piece) => piece.kind === 'package')!
    const die = model.pieces.find((piece) => piece.kind === 'dieBase')!
    const blocks = model.pieces.filter((piece) => piece.kind === 'blockSurface')

    expect(pkg.baseZ).toBe(0)
    expect(pkg.color).toBe(layers.package.color)
    expect(die.baseZ).toBe(pkg.baseZ + pkg.depth)
    expect(die.color).toBe(palette.die)
    expect(blocks).toHaveLength(2)
    for (const block of blocks) {
      expect(block.baseZ).toBe(die.baseZ + die.depth)
    }
  })

  it('extrudes fantasy blocks taller than real blocks and colors by emphasis', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, palette)
    const real = model.pieces.find(
      (piece) => piece.kind === 'blockSurface' && piece.emphasis === 'real',
    )!
    const fantasy = model.pieces.find(
      (piece) => piece.kind === 'blockSurface' && piece.emphasis === 'fantasy',
    )!

    expect(fantasy.depth).toBeGreaterThan(real.depth)
    expect(real.color).toBe(palette.blockReal)
    expect(fantasy.color).toBe(palette.blockFantasy)
  })

  it('uses a rect footprint for a rect die and a polygon footprint for a circle die', () => {
    const rect = rectProjectWithBlocks()
    const rectModel = buildChip3DModel(buildChipLayers(rect), rect.die, palette)
    expect(rectModel.pieces.find((piece) => piece.kind === 'dieBase')!.footprint.type).toBe(
      'rect',
    )

    const circle = rectProjectWithBlocks()
    circle.die = { shape: 'circle', width: 600, height: 600, background: '#101820' }
    const circleModel = buildChip3DModel(buildChipLayers(circle), circle.die, palette)
    expect(circleModel.pieces.find((piece) => piece.kind === 'dieBase')!.footprint.type).toBe(
      'polygon',
    )
  })

  it('reports a center and extent covering the die', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, palette)

    expect(model.extent[0]).toBeGreaterThanOrEqual(project.die.width)
    expect(model.extent[2]).toBeGreaterThanOrEqual(project.die.height)
    expect(model.center).toHaveLength(3)
  })
})
