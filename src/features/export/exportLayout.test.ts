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

  it('keeps 2D raster sizes independent of authored scene3d settings', () => {
    const projectLike = {
      die: { shape: 'rect' as const, width: 960, height: 640, background: 'neon' },
      scene3d: {
        camera: { azimuthRadians: 0.4, elevationRadians: 0.5, zoom: 0.6, fov: 48 },
        lighting: { preset: 'dramatic' as const, intensity: 1.35 },
        environment: {
          topColor: '#101a33',
          bottomColor: '#060816',
          exposure: 1.25,
          bloom: { threshold: 0.4, strength: 1.4, radius: 0.7 },
        },
        animation: {
          turntable: { enabled: false, periodSeconds: 24 },
          glow: { enabled: true, periodSeconds: 5, min: 0.7, max: 1.35 },
        },
      },
    }

    expect(dieExportSize(projectLike.die)).toEqual({
      logicalWidth: 960,
      logicalHeight: 640,
      pixelRatio: 4,
      pixelWidth: 3840,
      pixelHeight: 2560,
    })
    expect(POSTER_EXPORT.pixelWidth).toBe(3200)
    expect(POSTER_EXPORT.pixelHeight).toBe(1800)
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
