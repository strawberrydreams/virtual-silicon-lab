import type { Project } from '../domain/project'
import { resolveChip3DRenderMode } from '../visual/chip3d/chip3dBudget'
import { buildChip3DModel, type Chip3DModel } from '../visual/chip3d/chip3dModel'
import { resolveChip3DStyle } from '../visual/chip3d/chip3dMaterials'
import { buildChipLayers } from '../visual/chipLayers'

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function buildChip3DShowcaseModel(project: Project): Chip3DModel {
  return buildChip3DModel(
    buildChipLayers(project),
    project.die,
    resolveChip3DStyle(project.theme),
  )
}

export function isChip3DShowcaseAvailable(project: Project): boolean {
  const model = buildChip3DShowcaseModel(project)
  return (
    resolveChip3DRenderMode({
      pieceCount: model.pieces.length,
      webglAvailable: webglAvailable(),
    }) === 'interactive'
  )
}
