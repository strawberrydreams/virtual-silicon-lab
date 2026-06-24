import type { DieShape, Project } from '../domain/project'
import { resolveChip3DRenderMode } from '../visual/chip3d/chip3dBudget'
import { buildChip3DModel, type Chip3DModel } from '../visual/chip3d/chip3dModel'
import { resolveChip3DStyle } from '../visual/chip3d/chip3dMaterials'
import { buildChipLayers } from '../visual/chipLayers'

export function webglAvailable(): boolean {
  if (
    typeof WebGLRenderingContext === 'undefined' &&
    typeof WebGL2RenderingContext === 'undefined'
  ) {
    return false
  }
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function buildChip3DShowcaseModel(project: Project): Chip3DModel {
  const blockStylesById = Object.fromEntries(
    project.blocks
      .filter((block) => block.finish !== undefined)
      .map((block) => [block.id, resolveChip3DStyle(project.theme, block.finish!)]),
  )
  return buildChip3DModel(
    buildChipLayers(project),
    project.die,
    resolveChip3DStyle(project.theme, project.finish),
    { blockStylesById },
  )
}

export function isChip3DShapeSupported(shape: DieShape): boolean {
  switch (shape) {
    case 'rect':
    case 'square':
    case 'circle':
    case 'hexagon':
    case 'octagon':
    case 'rounded-rect':
    case 'chamfered-rect':
    case 'keyed':
    case 'l-shape':
    case 'plus':
      return true
    default: {
      const unhandledShape: never = shape
      return unhandledShape
    }
  }
}

export function isChip3DShowcaseAvailable(project: Project): boolean {
  if (!isChip3DShapeSupported(project.die.shape)) return false
  const model = buildChip3DShowcaseModel(project)
  return (
    resolveChip3DRenderMode({
      pieceCount: model.pieces.length,
      webglAvailable: webglAvailable(),
    }) === 'interactive'
  )
}
