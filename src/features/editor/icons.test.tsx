import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BlockType } from '../../domain/project'
import { TileGlyph } from './icons'

const TYPES: BlockType[] = [
  'CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB',
  'EmotionEngine', 'DreamSynth', 'QuantumMemory', 'ConsciousnessProcessor', 'RealityDistortionUnit', 'TimeCore',
]

describe('TileGlyph', () => {
  it('renders an svg glyph for every block type', () => {
    for (const type of TYPES) {
      const { container, unmount } = render(<TileGlyph type={type} />)
      expect(container.querySelector('svg')).not.toBeNull()
      unmount()
    }
  })
})
