import { describe, expect, it } from 'vitest'
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
})
