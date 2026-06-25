import type { Die } from '../../domain/project'
import { outlineToPolygon, resolveDieOutline } from '../../domain/die/dieOutline'
import type { Scene3DSettings } from '../../domain/scene3d/scene3d'
import type { Bounds, ChipLayerModel } from '../chipLayers'
import type { Chip3DEnvironment, Chip3DMaterial, Chip3DStyle } from './chip3dMaterials'

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
      material: Chip3DMaterial
    }
  | {
      id: string
      kind: 'dieBase'
      footprint: Footprint
      baseZ: number
      depth: number
      material: Chip3DMaterial
    }
  | {
      id: string
      kind: 'blockSurface'
      blockId: string
      footprint: Footprint
      baseZ: number
      depth: number
      material: Chip3DMaterial
      emphasis: 'real' | 'fantasy'
    }

export type Chip3DModel = {
  pieces: Chip3DPiece[]
  center: Vec3
  extent: Vec3
  environment: Chip3DEnvironment
  scene3d?: Scene3DSettings
}

export type Chip3DModelOptions = {
  blockStylesById?: Record<string, Chip3DStyle>
  scene3d?: Scene3DSettings
}

const PACKAGE_DEPTH = 24
const DIE_DEPTH = 16
const BLOCK_REAL_DEPTH = 10
const BLOCK_FANTASY_DEPTH = 18
const DIE_OUTLINE_SEGMENTS_PER_CIRCLE = 64

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
  const scaleX = bounds.width / die.width
  const scaleY = bounds.height / die.height
  const points = outlineToPolygon(resolveDieOutline(die), DIE_OUTLINE_SEGMENTS_PER_CIRCLE).map(
    ({ x, y }): [number, number] => [bounds.x + x * scaleX, bounds.y + y * scaleY],
  )
  return { type: 'polygon', points }
}

export function buildChip3DModel(
  layers: ChipLayerModel,
  die: Die,
  style: Chip3DStyle,
  options: Chip3DModelOptions = {},
): Chip3DModel {
  const pieces: Chip3DPiece[] = []

  const packageZ = 0
  pieces.push({
    id: layers.package.id,
    kind: 'package',
    footprint: rectFootprint(layers.package.bounds),
    baseZ: packageZ,
    depth: PACKAGE_DEPTH,
    material: style.materials.package,
  })

  const dieZ = packageZ + PACKAGE_DEPTH
  pieces.push({
    id: layers.dieBase.id,
    kind: 'dieBase',
    footprint: dieFootprint(die, layers.dieBase.bounds),
    baseZ: dieZ,
    depth: DIE_DEPTH,
    material: style.materials.dieBase,
  })

  const blockZ = dieZ + DIE_DEPTH
  for (const surface of layers.blockSurfaces) {
    const fantasy = surface.emphasis === 'fantasy'
    const blockStyle = options.blockStylesById?.[surface.blockId] ?? style
    pieces.push({
      id: surface.id,
      kind: 'blockSurface',
      blockId: surface.blockId,
      footprint: rectFootprint(surface.bounds),
      baseZ: blockZ,
      depth: fantasy ? BLOCK_FANTASY_DEPTH : BLOCK_REAL_DEPTH,
      material: fantasy ? blockStyle.materials.blockFantasy : blockStyle.materials.blockReal,
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

  return { pieces, center, extent, environment: style.environment, scene3d: options.scene3d }
}
