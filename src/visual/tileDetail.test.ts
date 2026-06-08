import { describe, expect, it } from 'vitest'
import type { StudioTileSettings } from '../domain/project'
import { resolveTileDetail } from './tileDetail'

function settings(patch: Partial<StudioTileSettings> = {}): StudioTileSettings {
  return { detailDensity: 0.5, routeIntensity: 0.5, contactStyle: 'balanced', ...patch }
}

describe('resolveTileDetail', () => {
  it('packs micro detail tighter as detailDensity rises', () => {
    const sparse = resolveTileDetail(settings({ detailDensity: 0 }))
    const dense = resolveTileDetail(settings({ detailDensity: 1 }))

    expect(dense.microStep).toBeLessThan(sparse.microStep)
    expect(dense.blockStride).toBeLessThan(sparse.blockStride)
    expect(dense.microOpacityScale).toBeGreaterThan(sparse.microOpacityScale)
  })

  it('strengthens routing as routeIntensity rises', () => {
    const quiet = resolveTileDetail(settings({ routeIntensity: 0 }))
    const loud = resolveTileDetail(settings({ routeIntensity: 1 }))

    expect(loud.traceWidthScale).toBeGreaterThan(quiet.traceWidthScale)
    expect(loud.traceOpacityScale).toBeGreaterThan(quiet.traceOpacityScale)
  })

  it('packs contacts denser for the dense contact style', () => {
    const minimal = resolveTileDetail(settings({ contactStyle: 'minimal' }))
    const dense = resolveTileDetail(settings({ contactStyle: 'dense' }))

    expect(dense.contactGap).toBeLessThan(minimal.contactGap)
    expect(dense.contactCell).toBeLessThanOrEqual(minimal.contactCell)
  })

  it('clamps out-of-range density and intensity', () => {
    const low = resolveTileDetail(settings({ detailDensity: -1, routeIntensity: -1 }))
    const high = resolveTileDetail(settings({ detailDensity: 5, routeIntensity: 5 }))

    expect(low.microStep).toBe(resolveTileDetail(settings({ detailDensity: 0, routeIntensity: 0 })).microStep)
    expect(high.microStep).toBe(resolveTileDetail(settings({ detailDensity: 1, routeIntensity: 1 })).microStep)
    expect(low.microStep).toBeGreaterThan(high.microStep)
  })

  it('keeps the micro grid step positive', () => {
    expect(resolveTileDetail(settings({ detailDensity: 1 })).microStep).toBeGreaterThan(0)
  })
})
