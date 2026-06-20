import { describe, expect, it } from 'vitest'
import { createProject } from '../projectFactory'
import type { AiLayoutSuggestion } from './aiLayoutSuggestion'
import { resolveAiSuggestionBlock } from './resolveAiSuggestionBlock'

const project = createProject('Chip', 'p1', 0)

describe('resolveAiSuggestionBlock', () => {
  it('resolves a valid suggestion into a clamped block carrying the label', () => {
    const suggestion: AiLayoutSuggestion = {
      type: 'Cache',
      label: 'L3',
      x: 0.1,
      y: 0.1,
      w: 0.2,
      h: 0.2,
    }
    const block = resolveAiSuggestionBlock(project, suggestion, 'b1')
    expect(block).not.toBeNull()
    expect(block!.id).toBe('b1')
    expect(block!.type).toBe('Cache')
    expect(block!.label).toBe('L3')
    expect(block!.x).toBeCloseTo(96)
    expect(block!.w).toBeCloseTo(192)
  })

  it('returns null for an unknown block type', () => {
    const block = resolveAiSuggestionBlock(
      project,
      { type: 'Nonsense', x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
      'b1',
    )
    expect(block).toBeNull()
  })

  it('clamps an out-of-bounds suggestion inside the die', () => {
    const block = resolveAiSuggestionBlock(
      project,
      { type: 'GPU', x: 5, y: 5, w: 9, h: 9 },
      'b1',
    )!
    const { width, height } = project.die
    expect(block.x).toBeGreaterThanOrEqual(0)
    expect(block.y).toBeGreaterThanOrEqual(0)
    expect(block.x + block.w).toBeLessThanOrEqual(width)
    expect(block.y + block.h).toBeLessThanOrEqual(height)
  })

  it('normalizes non-finite positions and enforces the minimum block size', () => {
    const block = resolveAiSuggestionBlock(
      project,
      { type: 'PLL', x: Number.POSITIVE_INFINITY, y: Number.NaN, w: 0, h: -1 },
      'b1',
    )!
    expect(block).toMatchObject({ x: 0, y: 0, w: 24, h: 24 })
  })
})
