import { describe, expect, it } from 'vitest'
import { SPEC_EXAMPLES } from './specExamples'

describe('SPEC_EXAMPLES', () => {
  it('ships three populated examples with independent feature arrays', () => {
    expect(SPEC_EXAMPLES).toHaveLength(3)
    expect(SPEC_EXAMPLES.every((example) => example.spec.features.length >= 3)).toBe(true)
    expect(SPEC_EXAMPLES[0].spec.features).not.toBe(SPEC_EXAMPLES[1].spec.features)
  })
})
