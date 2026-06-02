import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION } from './project'
import { createHeroChip } from './heroChip'

describe('createHeroChip', () => {
  it('returns a valid keynote project for composition A', () => {
    const chip = createHeroChip('hero', 1000)
    expect(chip.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(chip.theme).toBe('keynote')
    expect(chip.die.shape).toBe('square')
    expect(chip.spec.cores).toBe(88)
  })

  it('keeps every block inside the square die bounds', () => {
    const chip = createHeroChip('hero', 1000)
    const { width, height } = chip.die
    for (const block of chip.blocks) {
      expect(block.x).toBeGreaterThanOrEqual(0)
      expect(block.y).toBeGreaterThanOrEqual(0)
      expect(block.x + block.w).toBeLessThanOrEqual(width)
      expect(block.y + block.h).toBeLessThanOrEqual(height)
    }
  })

  it('includes the hero block, a memory band, and a name label', () => {
    const chip = createHeroChip('hero', 1000)
    expect(chip.blocks.some((b) => b.type === 'ConsciousnessProcessor')).toBe(true)
    expect(chip.blocks.some((b) => b.type === 'QuantumMemory')).toBe(true)
    expect(chip.decorations.some((d) => d.kind === 'label')).toBe(true)
  })
})
