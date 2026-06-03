import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BlockType } from '../../domain/project'
import { BlockPalette } from './BlockPalette'

const ALL_BLOCK_TYPES: BlockType[] = [
  'CPU',
  'GPU',
  'DSP',
  'SRAM',
  'Cache',
  'DAC',
  'ADC',
  'PLL',
  'IO',
  'USB',
  'EmotionEngine',
  'DreamSynth',
  'QuantumMemory',
  'ConsciousnessProcessor',
  'RealityDistortionUnit',
  'TimeCore',
]

describe('BlockPalette', () => {
  it('renders every v1 block type', () => {
    render(<BlockPalette addBlock={vi.fn()} />)

    for (const type of ALL_BLOCK_TYPES) {
      expect(screen.getByRole('button', { name: type })).toBeInTheDocument()
    }
  })

  it('adds newly exposed fantasy blocks', async () => {
    const addBlock = vi.fn()
    render(<BlockPalette addBlock={addBlock} />)

    await userEvent.click(screen.getByRole('button', { name: 'ConsciousnessProcessor' }))

    expect(addBlock).toHaveBeenCalledWith('ConsciousnessProcessor')
  })
})
