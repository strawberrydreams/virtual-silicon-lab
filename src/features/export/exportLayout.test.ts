import { describe, expect, it } from 'vitest'
import { dieExportSize, posterChipPlacement, POSTER_EXPORT } from './exportLayout'

describe('export layout', () => {
  it('documents a four-times die-only raster size', () => {
    expect(
      dieExportSize({ shape: 'square', width: 720, height: 720, background: 'keynote' }),
    ).toEqual({
      logicalWidth: 720,
      logicalHeight: 720,
      pixelRatio: 4,
      pixelWidth: 2880,
      pixelHeight: 2880,
    })
  })

  it('documents a 3200 by 1800 poster raster', () => {
    expect(POSTER_EXPORT).toEqual({
      logicalWidth: 1600,
      logicalHeight: 900,
      pixelRatio: 2,
      pixelWidth: 3200,
      pixelHeight: 1800,
    })
  })

  it('fits a wide die into the poster hero area', () => {
    expect(
      posterChipPlacement({ shape: 'rect', width: 920, height: 600, background: 'military' }),
    ).toMatchObject({ x: 80, y: 180 })
  })

  it('can resolve alternate poster format placements', () => {
    expect(
      posterChipPlacement(
        { shape: 'rect', width: 920, height: 600, background: 'military' },
        'architecture-slide',
      ),
    ).toMatchObject({ x: 430, y: 174 })
  })
})
