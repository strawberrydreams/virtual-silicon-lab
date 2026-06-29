import { describe, expect, it } from 'vitest'
import type { ResolvedAnimation } from '../../domain/scene3d/scene3d'
import { GLOW_PULSE } from './chip3dAnimation'
import { CAPTURE, captureFrameAt, captureFrameCount } from './chip3dCapture'

describe('captureFrameCount', () => {
  it('is round(duration * fps)', () => {
    expect(captureFrameCount()).toBe(240)
    expect(captureFrameCount({ ...CAPTURE, durationSeconds: 4, fps: 60 })).toBe(240)
  })
})

describe('captureFrameAt', () => {
  it('starts the rotation at azimuth 0 at t=0', () => {
    const f0 = captureFrameAt(0)
    expect(f0.tSeconds).toBe(0)
    expect(f0.azimuth).toBe(0)
  })

  it('completes exactly one revolution over the clip (seamless wrap)', () => {
    const n = captureFrameCount()
    const last = captureFrameAt(n - 1)
    expect(last.azimuth).toBeGreaterThan(0)
    expect(last.azimuth).toBeLessThan(Math.PI * 2)
    expect(captureFrameAt(n).azimuth).toBeCloseTo(Math.PI * 2, 9)
  })

  it('azimuth increases monotonically', () => {
    const n = captureFrameCount()
    let prev = -Infinity
    for (let i = 0; i <= n; i += 1) {
      const azimuth = captureFrameAt(i).azimuth
      expect(azimuth).toBeGreaterThan(prev)
      prev = azimuth
    }
  })

  it('glow stays within range and loops seamlessly (integer cycles per clip)', () => {
    const n = captureFrameCount()
    for (let i = 0; i <= n; i += 1) {
      const glow = captureFrameAt(i).glow
      expect(glow).toBeGreaterThanOrEqual(GLOW_PULSE.min - 1e-9)
      expect(glow).toBeLessThanOrEqual(GLOW_PULSE.max + 1e-9)
    }
    expect(captureFrameAt(n).glow).toBeCloseTo(captureFrameAt(0).glow, 9)
  })

  it('is deterministic', () => {
    expect(captureFrameAt(57)).toEqual(captureFrameAt(57))
  })

  it('honors disabled turntable animation', () => {
    const animation: ResolvedAnimation = {
      turntable: { enabled: false, periodSeconds: 4 },
      glow: { enabled: true, periodSeconds: 2, min: 0.8, max: 1.2 },
    }

    expect(captureFrameAt(0, CAPTURE, animation).azimuth).toBe(0)
    expect(captureFrameAt(captureFrameCount(), CAPTURE, animation).azimuth).toBe(0)
  })

  it('honors custom turntable period', () => {
    const animation: ResolvedAnimation = {
      turntable: { enabled: true, periodSeconds: 4 },
      glow: { enabled: true, periodSeconds: 2, min: 0.8, max: 1.2 },
    }

    expect(captureFrameAt(captureFrameCount(), CAPTURE, animation).azimuth).toBeCloseTo(Math.PI * 4, 9)
  })

  it('honors disabled glow animation', () => {
    const animation: ResolvedAnimation = {
      turntable: { enabled: true, periodSeconds: 8 },
      glow: { enabled: false, periodSeconds: 2, min: 0.4, max: 1.8 },
    }

    expect(captureFrameAt(0, CAPTURE, animation).glow).toBe(1)
    expect(captureFrameAt(57, CAPTURE, animation).glow).toBe(1)
  })

  it('honors custom glow period and range deterministically', () => {
    const animation: ResolvedAnimation = {
      turntable: { enabled: true, periodSeconds: 8 },
      glow: { enabled: true, periodSeconds: 4, min: 0.65, max: 1.45 },
    }

    const first = captureFrameAt(0, CAPTURE, animation)
    const halfCycle = captureFrameAt(CAPTURE.fps * 2, CAPTURE, animation)

    expect(first.glow).toBeCloseTo((0.65 + 1.45) / 2, 9)
    expect(halfCycle.glow).toBeCloseTo(first.glow, 9)
    expect(captureFrameAt(57, CAPTURE, animation)).toEqual(captureFrameAt(57, CAPTURE, animation))
  })
})
