export type Chip3DRenderMode = 'interactive' | 'poster'

// Each package, die, and block piece becomes one mesh. Above this admission
// threshold the static poster is retained instead of creating a WebGL scene.
export const CHIP_3D_PIECE_BUDGET = 400

export function resolveChip3DRenderMode(input: {
  pieceCount: number
  webglAvailable: boolean
}): Chip3DRenderMode {
  if (!input.webglAvailable) return 'poster'
  if (input.pieceCount > CHIP_3D_PIECE_BUDGET) return 'poster'
  return 'interactive'
}
