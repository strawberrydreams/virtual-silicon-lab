import type { Die } from '../../domain/project'
import type { Bounds, ChipLayerModel } from '../chipLayers'

export type Vec3 = [number, number, number]

export type Footprint =
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'polygon'; points: [number, number][] }

export type Chip3DPiece =
  | {
      id: string
      kind: 'package'
      footprint: Footprint
      baseZ: number
      depth: number
      color: string
    }
  | {
      id: string
      kind: 'dieBase'
      footprint: Footprint
      baseZ: number
      depth: number
      color: string
    }
  | {
      id: string
      kind: 'blockSurface'
      blockId: string
      footprint: Footprint
      baseZ: number
      depth: number
      color: string
      emphasis: 'real' | 'fantasy'
    }

export type Chip3DModel = {
  pieces: Chip3DPiece[]
  center: Vec3
  extent: Vec3
}

export type Chip3DPalette = {
  die: string
  blockReal: string
  blockFantasy: string
}

const PACKAGE_DEPTH = 24
const DIE_DEPTH = 16
const BLOCK_REAL_DEPTH = 10
const BLOCK_FANTASY_DEPTH = 18

function rectFootprint(bounds: Bounds): Footprint {
  return {
    type: 'rect',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function dieFootprint(die: Die, bounds: Bounds): Footprint {
  if (die.shape !== 'circle' && die.shape !== 'hexagon') {
    return rectFootprint(bounds)
  }

  const cx = bounds.x + bounds.width / 2
  const cy = bounds.y + bounds.height / 2
  const rx = bounds.width / 2
  const ry = bounds.height / 2
  const segments = die.shape === 'hexagon' ? 6 : 48
  const offset = die.shape === 'hexagon' ? Math.PI / 6 : 0
  const points: [number, number][] = []

  for (let index = 0; index < segments; index += 1) {
    const angle = offset + (index / segments) * Math.PI * 2
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry])
  }

  return { type: 'polygon', points }
}

export function buildChip3DModel(
  layers: ChipLayerModel,
  die: Die,
  palette: Chip3DPalette,
): Chip3DModel {
  const pieces: Chip3DPiece[] = []

  const packageZ = 0
  pieces.push({
    id: layers.package.id,
    kind: 'package',
    footprint: rectFootprint(layers.package.bounds),
    baseZ: packageZ,
    depth: PACKAGE_DEPTH,
    color: layers.package.color,
  })

  const dieZ = packageZ + PACKAGE_DEPTH
  pieces.push({
    id: layers.dieBase.id,
    kind: 'dieBase',
    footprint: dieFootprint(die, layers.dieBase.bounds),
    baseZ: dieZ,
    depth: DIE_DEPTH,
    color: palette.die,
  })

  const blockZ = dieZ + DIE_DEPTH
  for (const surface of layers.blockSurfaces) {
    const fantasy = surface.emphasis === 'fantasy'
    pieces.push({
      id: surface.id,
      kind: 'blockSurface',
      blockId: surface.blockId,
      footprint: rectFootprint(surface.bounds),
      baseZ: blockZ,
      depth: fantasy ? BLOCK_FANTASY_DEPTH : BLOCK_REAL_DEPTH,
      color: fantasy ? palette.blockFantasy : palette.blockReal,
      emphasis: surface.emphasis,
    })
  }

  const top = blockZ + BLOCK_FANTASY_DEPTH
  const center: Vec3 = [
    layers.package.bounds.x + layers.package.bounds.width / 2,
    top / 2,
    layers.package.bounds.y + layers.package.bounds.height / 2,
  ]
  const extent: Vec3 = [layers.package.bounds.width, top, layers.package.bounds.height]

  return { pieces, center, extent }
}
