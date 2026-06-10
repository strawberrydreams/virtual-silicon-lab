import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BlockType } from '../../domain/project'
import type { DecorationKind } from '../../domain/decorationFactory'
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
      addDecoration: vi.fn(),
      addSticker: vi.fn(),
      addSpray: vi.fn(),
      ...actions,
    }
  }

  it('renders every v1 block type', () => {
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    expect(screen.getByRole('navigation', { name: 'Editor mode rail' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Library panel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search components' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hardware' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Speculative' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add custom tile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tiles / Stickers / Spray' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hardware Tiles' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Speculative Tiles' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Round badge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Warning label' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Text label' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spray Pink' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spray Cyan' })).toBeInTheDocument()
    expect(screen.queryByText('Impossible Tiles')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add custom tile' })).toBeDisabled()
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

  it('filters library tiles by category and search text', async () => {
    const user = userEvent.setup()
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    await user.click(screen.getByRole('button', { name: 'Hardware' }))

    expect(screen.getByRole('button', { name: 'CPU' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'DreamSynth' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Speculative' }))
    expect(screen.queryByRole('button', { name: 'CPU' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DreamSynth' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search components' }), 'gpu')

    expect(screen.getByRole('button', { name: 'GPU' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'CPU' })).not.toBeInTheDocument()
  })

  it('tracks the active editor mode rail item', async () => {
    const user = userEvent.setup()
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    await user.click(screen.getByRole('button', { name: 'Decorate' }))

    expect(screen.getByRole('button', { name: 'Decorate' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tiles' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches the left rail to mode-specific content and actions', async () => {
    const user = userEvent.setup()
    const actions = renderPalette()
    render(<BlockPalette {...actions} />)

    await user.click(screen.getByRole('button', { name: 'Decorate' }))
    expect(screen.getByRole('heading', { name: 'Decoration Tools' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hardware Tiles' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(screen.getByRole('heading', { name: 'Connection Tools' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add route guide' }))
    expect(actions.addDecoration).toHaveBeenCalledWith('neonLine' satisfies DecorationKind)

    await user.click(screen.getByRole('button', { name: 'Text' }))
    expect(screen.getByRole('heading', { name: 'Text Tools' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add text label' }))
    expect(actions.addDecoration).toHaveBeenCalledWith('label' satisfies DecorationKind)

    await user.click(screen.getByRole('button', { name: 'Layers' }))
    expect(screen.getByRole('heading', { name: 'Layer Controls' })).toBeInTheDocument()
    expect(screen.getByText('Use the right inspector to toggle M1-M5 and label visibility.')).toBeInTheDocument()
  })
})
