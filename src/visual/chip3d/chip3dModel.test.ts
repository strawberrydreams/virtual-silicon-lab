import { describe, expect, it } from 'vitest'
import { outlineToPolygon, resolveDieOutline } from '../../domain/die/dieOutline'
import type { DieShape, Project } from '../../domain/project'
import { buildChipLayers } from '../chipLayers'
import { createProject } from '../../domain/projectFactory'
import { resolveChip3DStyle } from './chip3dMaterials'
import { buildChip3DModel } from './chip3dModel'

const style = resolveChip3DStyle('neon')

const DIE_SHAPES = [
  'rect',
  'square',
  'circle',
  'hexagon',
  'octagon',
  'rounded-rect',
  'chamfered-rect',
  'keyed',
  'l-shape',
  'plus',
] as const satisfies readonly DieShape[]

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

function diePiece(project: Project) {
  const model = buildChip3DModel(buildChipLayers(project), project.die, style)
  return model.pieces.find((piece) => piece.kind === 'dieBase')!
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

  it('uses block-specific 3D styles when supplied', () => {
    const project = rectProjectWithBlocks()
    const matteStyle = resolveChip3DStyle('neon', 'matte')
    const model = buildChip3DModel(buildChipLayers(project), project.die, style, {
      blockStylesById: { 'b-real': matteStyle },
    })

    const real = model.pieces.find((p) => p.kind === 'blockSurface' && p.blockId === 'b-real')!
    const fantasy = model.pieces.find((p) => p.kind === 'blockSurface' && p.blockId === 'b-fan')!

    expect(real.material).toEqual(matteStyle.materials.blockReal)
    expect(fantasy.material).toEqual(style.materials.blockFantasy)
  })

  it('carries the resolved environment on the model', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)
    expect(model.environment).toEqual(style.environment)
  })

  it.each(DIE_SHAPES)('derives the %s die footprint from the shared outline', (shape) => {
    const project = rectProjectWithBlocks()
    const squareShape = ['square', 'circle', 'hexagon', 'octagon', 'plus'].includes(shape)
    project.die = {
      ...project.die,
      shape,
      width: squareShape ? 600 : 800,
      height: 600,
    }

    expect(diePiece(project).footprint).toEqual({
      type: 'polygon',
      points: outlineToPolygon(resolveDieOutline(project.die), 64).map(
        ({ x, y }): [number, number] => [x, y],
      ),
    })
  })

  it('maps die-local outline points into the supplied die-base bounds', () => {
    const project = rectProjectWithBlocks()
    project.die = { ...project.die, shape: 'keyed', width: 800, height: 400 }
    const layers = buildChipLayers(project)
    layers.dieBase.bounds = { x: 25, y: 40, width: 400, height: 200 }

    const model = buildChip3DModel(layers, project.die, style)
    const footprint = model.pieces.find((piece) => piece.kind === 'dieBase')!.footprint

    expect(footprint).toEqual({
      type: 'polygon',
      points: outlineToPolygon(resolveDieOutline(project.die), 64).map(
        ({ x, y }): [number, number] => [25 + x / 2, 40 + y / 2],
      ),
    })
  })

  it('uses 64 vertices for a circular die', () => {
    const project = rectProjectWithBlocks()
    project.die = { ...project.die, shape: 'circle', width: 600, height: 600 }
    const footprint = diePiece(project).footprint
    expect(footprint.type).toBe('polygon')
    if (footprint.type === 'polygon') expect(footprint.points).toHaveLength(64)
  })

  it('uses fixed-64 arc sampling for a rounded rectangle', () => {
    const project = rectProjectWithBlocks()
    project.die = {
      ...project.die,
      shape: 'rounded-rect',
      dieShapeParams: { cornerRadius: 0.2 },
    }
    const footprint = diePiece(project).footprint
    expect(footprint.type).toBe('polygon')
    if (footprint.type === 'polygon') expect(footprint.points).toHaveLength(68)
  })

  it.each([
    ['rounded-rect', { cornerRadius: 0.3 }],
    ['chamfered-rect', { chamfer: 0.25 }],
    ['keyed', { notch: { corner: 'bottom-left', size: 0.22 } }],
    ['l-shape', { notch: { corner: 'top-right', size: 0.6 } }],
    ['plus', { armWidth: 0.52 }],
  ] as const)('carries custom %s parameters into the 3D footprint', (shape, dieShapeParams) => {
    const project = rectProjectWithBlocks()
    project.die = { ...project.die, shape, width: 800, height: 600, dieShapeParams }

    expect(diePiece(project).footprint).toEqual({
      type: 'polygon',
      points: outlineToPolygon(resolveDieOutline(project.die), 64).map(
        ({ x, y }): [number, number] => [x, y],
      ),
    })
  })

  it.each(['l-shape', 'plus'] as const)('preserves the ordered concave %s outline', (shape) => {
    const project = rectProjectWithBlocks()
    project.die = { ...project.die, shape, width: 600, height: 600 }

    expect(diePiece(project).footprint).toEqual({
      type: 'polygon',
      points: outlineToPolygon(resolveDieOutline(project.die), 64).map(
        ({ x, y }): [number, number] => [x, y],
      ),
    })
  })

  it('reports a center and extent covering the die', () => {
    const project = rectProjectWithBlocks()
    const model = buildChip3DModel(buildChipLayers(project), project.die, style)
    expect(model.extent[0]).toBeGreaterThanOrEqual(project.die.width)
    expect(model.extent[2]).toBeGreaterThanOrEqual(project.die.height)
    expect(model.center).toHaveLength(3)
  })
})
