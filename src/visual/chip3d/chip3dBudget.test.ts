import { describe, expect, it } from 'vitest'
import { CHIP_3D_PIECE_BUDGET, resolveChip3DRenderMode } from './chip3dBudget'

describe('resolveChip3DRenderMode', () => {
  it('falls back to the poster when WebGL is unavailable', () => {
    expect(resolveChip3DRenderMode({ pieceCount: 10, webglAvailable: false })).toBe('poster')
  })

  it('renders interactively within the piece budget when WebGL is available', () => {
    expect(resolveChip3DRenderMode({ pieceCount: 10, webglAvailable: true })).toBe('interactive')
  })

  it('treats the budget boundary as still interactive', () => {
    expect(
      resolveChip3DRenderMode({ pieceCount: CHIP_3D_PIECE_BUDGET, webglAvailable: true }),
    ).toBe('interactive')
  })

  it('falls back to the poster when the chip exceeds the piece budget', () => {
    expect(
      resolveChip3DRenderMode({ pieceCount: CHIP_3D_PIECE_BUDGET + 1, webglAvailable: true }),
    ).toBe('poster')
  })
})
