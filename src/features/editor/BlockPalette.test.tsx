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
  function renderPalette(actions = {}) {
    return {
      addBlock: vi.fn(),
      addSticker: vi.fn(),
      addSpray: vi.fn(),
      ...actions,
    }
  }

  it('renders every v1 block type', () => {
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    expect(screen.getByRole('heading', { name: 'Tiles / Stickers / Spray' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Round badge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Warning label' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Text label' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spray Pink' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spray Cyan' })).toBeInTheDocument()
    for (const type of ALL_BLOCK_TYPES) {
      expect(screen.getByRole('button', { name: type })).toBeInTheDocument()
    }
  })

  it('adds newly exposed fantasy blocks', async () => {
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    await userEvent.click(screen.getByRole('button', { name: 'ConsciousnessProcessor' }))

    expect(actions.addBlock).toHaveBeenCalledWith('ConsciousnessProcessor')
  })

  it('adds studio decorations from the creation rail', async () => {
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    await userEvent.click(screen.getByRole('button', { name: 'Round badge' }))
    await userEvent.click(screen.getByRole('button', { name: 'Warning label' }))
    await userEvent.click(screen.getByRole('button', { name: 'Spray Cyan' }))

    expect(actions.addSticker).toHaveBeenCalledWith('badge')
    expect(actions.addSticker).toHaveBeenCalledWith('warning')
    expect(actions.addSpray).toHaveBeenCalledWith('#70eeff')
  })
})
