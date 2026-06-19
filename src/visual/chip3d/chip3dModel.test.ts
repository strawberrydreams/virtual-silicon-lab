import { describe, expect, it } from 'vitest'
import { buildChipLayers } from '../chipLayers'
import { createProject } from '../../domain/projectFactory'
import { resolveChip3DStyle } from './chip3dMaterials'
import { buildChip3DModel } from './chip3dModel'

const style = resolveChip3DStyle('neon')

function rectProjectWithBlocks() {
  const project = createProject('3D Test')
  project.die = { shape: 'rect', width: 800, height: 500, background: '#101820' }
  project.blocks = [
    { id: 'b-real', type: 'CPU', category: 'real', x: 100, y: 80, w: 120, h: 90, rotation: 0, zIndex: 0 },
    { id: 'b-fan', type: 'ConsciousnessProcessor', category: 'fantasy', x: 400, y: 200, w: 140, h: 100, rotation: 0, zIndex: 1 },
  ]
  return project
}

describe('buildChip3DModel', () => {
  it('stacks package below die below blocks', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)

    const pkg = model.pieces.find((p) => p.kind === 'package')!
    const die = model.pieces.find((p) => p.kind === 'dieBase')!
    const blocks = model.pieces.filter((p) => p.kind === 'blockSurface')

    expect(pkg.baseZ).toBe(0)
    expect(die.baseZ).toBe(pkg.baseZ + pkg.depth)
    expect(blocks).toHaveLength(2)
    for (const b of blocks) expect(b.baseZ).toBe(die.baseZ + die.depth)
  })

  it('assigns recipe-driven materials per piece role', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)

    const pkg = model.pieces.find((p) => p.kind === 'package')!
    const die = model.pieces.find((p) => p.kind === 'dieBase')!
    const real = model.pieces.find((p) => p.kind === 'blockSurface' && p.emphasis === 'real')!
    const fantasy = model.pieces.find((p) => p.kind === 'blockSurface' && p.emphasis === 'fantasy')!

    expect(pkg.material).toEqual(style.materials.package)
    expect(die.material).toEqual(style.materials.dieBase)
    expect(real.material).toEqual(style.materials.blockReal)
    expect(fantasy.material).toEqual(style.materials.blockFantasy)
    expect(fantasy.material.emissiveIntensity).toBeGreaterThan(real.material.emissiveIntensity)
    expect(fantasy.depth).toBeGreaterThan(real.depth)
  })

  it('carries the resolved environment on the model', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)
    expect(model.environment).toEqual(style.environment)
  })

  it('uses a rect footprint for a rect die and a polygon footprint for a circle die', () => {
    const rect = rectProjectWithBlocks()
    const rectModel = buildChip3DModel(buildChipLayers(rect), rect.die, style)
    expect(rectModel.pieces.find((p) => p.kind === 'dieBase')!.footprint.type).toBe('rect')

    const circle = rectProjectWithBlocks()
    circle.die = { shape: 'circle', width: 600, height: 600, background: '#101820' }
    const circleModel = buildChip3DModel(buildChipLayers(circle), circle.die, style)
    expect(circleModel.pieces.find((p) => p.kind === 'dieBase')!.footprint.type).toBe('polygon')
  })

  it('reports a center and extent covering the die', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)
    expect(model.extent[0]).toBeGreaterThanOrEqual(project.die.width)
    expect(model.extent[2]).toBeGreaterThanOrEqual(project.die.height)
    expect(model.center).toHaveLength(3)
  })
})
