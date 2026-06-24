import { describe, expect, it } from 'vitest'
import { createHeroChip } from '../domain/heroChip'
import {
  AMBIENT_CANONICAL_FRAME,
  ambientFrameAt,
  ambientMotionBudgetForProject,
  resolveAmbientMotionDefault,
  shouldRunAmbientRaf,
} from './ambientEditorAnimation'

describe('ambientFrameAt', () => {
  it('returns the canonical neutral frame at t=0', () => {
    expect(ambientFrameAt(0)).toEqual(AMBIENT_CANONICAL_FRAME)
  })

  it('keeps glow and trace values inside conservative visual bounds', () => {
    for (let ms = 0; ms <= 12000; ms += 137) {
      const frame = ambientFrameAt(ms)

      expect(frame.glowOpacityScale).toBeGreaterThanOrEqual(0.88)
      expect(frame.glowOpacityScale).toBeLessThanOrEqual(1.08)
      expect(frame.glowBlurScale).toBeGreaterThanOrEqual(0.92)
      expect(frame.glowBlurScale).toBeLessThanOrEqual(1.16)
      expect(frame.traceOpacityScale).toBeGreaterThanOrEqual(0.78)
      expect(frame.traceOpacityScale).toBeLessThanOrEqual(1)
      expect(frame.traceDashOffset).toBeGreaterThanOrEqual(0)
      expect(frame.traceDashOffset).toBeLessThan(48)
    }
  })

  it('wraps without a visible discontinuity at the shared loop period', () => {
    expect(ambientFrameAt(0)).toEqual(ambientFrameAt(12000))
  })
})

describe('resolveAmbientMotionDefault', () => {
  it('defaults on unless reduced motion is requested', () => {
    expect(resolveAmbientMotionDefault(false)).toBe(true)
    expect(resolveAmbientMotionDefault(true)).toBe(false)
  })
})

describe('ambientMotionBudgetForProject', () => {
  it('uses full ambient motion for normal hero chips', () => {
    expect(ambientMotionBudgetForProject(createHeroChip('normal', 1))).toEqual({
      tier: 'full',
      animateGlow: true,
      animateTraces: true,
      reason: null,
    })
  })

  it('degrades trace shimmer before disabling glow on dense chips', () => {
    const project = createHeroChip('dense', 1)
    project.blocks = Array.from({ length: 181 }, (_, index) => ({
      ...project.blocks[0],
      id: `block-${index}`,
      x: 20 + (index % 18) * 24,
      y: 20 + Math.floor(index / 18) * 24,
    }))

    expect(ambientMotionBudgetForProject(project)).toMatchObject({
      tier: 'glow-only',
      animateGlow: true,
      animateTraces: false,
    })
  })

  it('stays static on extreme projects', () => {
    const project = createHeroChip('extreme', 1)
    project.blocks = Array.from({ length: 321 }, (_, index) => ({
      ...project.blocks[0],
      id: `block-${index}`,
      x: 20 + (index % 24) * 18,
      y: 20 + Math.floor(index / 24) * 18,
    }))

    expect(ambientMotionBudgetForProject(project)).toMatchObject({
      tier: 'static',
      animateGlow: false,
      animateTraces: false,
    })
  })
})

describe('shouldRunAmbientRaf', () => {
  it('runs only when the user enabled motion and the budget has something to animate', () => {
    expect(
      shouldRunAmbientRaf(true, {
        tier: 'full',
        animateGlow: true,
        animateTraces: true,
        reason: null,
      }),
    ).toBe(true)
    expect(
      shouldRunAmbientRaf(false, {
        tier: 'full',
        animateGlow: true,
        animateTraces: true,
        reason: null,
      }),
    ).toBe(false)
    expect(
      shouldRunAmbientRaf(true, {
        tier: 'static',
        animateGlow: false,
        animateTraces: false,
        reason: 'Project is too dense for editor ambient motion.',
      }),
    ).toBe(false)
  })
})
