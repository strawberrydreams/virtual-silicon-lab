import { describe, expect, it } from 'vitest'
import { GLOW_PULSE, TURNTABLE, glowPulseAt, turntableAzimuthAt } from './chip3dAnimation'

describe('turntableAzimuthAt', () => {
  it('starts at 0 and completes exactly one revolution per period', () => {
    expect(turntableAzimuthAt(0)).toBe(0)
    expect(turntableAzimuthAt(TURNTABLE.periodSeconds)).toBeCloseTo(Math.PI * 2, 10)
  })

  it('increases monotonically and adds exactly 2π per period (seamless wrap)', () => {
    const period = TURNTABLE.periodSeconds
    let prev = -Infinity
    for (let i = 0; i <= 10; i += 1) {
      const a = turntableAzimuthAt((period * i) / 10)
      expect(a).toBeGreaterThan(prev)
      prev = a
    }
    expect(turntableAzimuthAt(period) - turntableAzimuthAt(0)).toBeCloseTo(Math.PI * 2, 10)
  })

  it('honors a custom period', () => {
    expect(turntableAzimuthAt(5, { periodSeconds: 10 })).toBeCloseTo(Math.PI, 10)
  })
})

describe('glowPulseAt', () => {
  it('stays within [min, max] across a sampled grid', () => {
    const { periodSeconds, min, max } = GLOW_PULSE
    for (let i = 0; i <= 40; i += 1) {
      const v = glowPulseAt((periodSeconds * i) / 40)
      expect(v).toBeGreaterThanOrEqual(min - 1e-9)
      expect(v).toBeLessThanOrEqual(max + 1e-9)
    }
  })

  it('is continuous across the loop boundary', () => {
    expect(glowPulseAt(0)).toBeCloseTo(glowPulseAt(GLOW_PULSE.periodSeconds), 10)
  })

  it('reaches near min and near max within one period', () => {
    const { periodSeconds, min, max } = GLOW_PULSE
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i <= 200; i += 1) {
      const v = glowPulseAt((periodSeconds * i) / 200)
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
    expect(lo).toBeLessThan(min + (max - min) * 0.02)
    expect(hi).toBeGreaterThan(max - (max - min) * 0.02)
  })

  it('starts at the midpoint (sine phase 0) and is deterministic', () => {
    const mid = (GLOW_PULSE.min + GLOW_PULSE.max) / 2
    expect(glowPulseAt(0)).toBeCloseTo(mid, 10)
    expect(glowPulseAt(1.234)).toBe(glowPulseAt(1.234))
  })
})
