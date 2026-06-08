import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { PresetCard } from './PresetCard'

describe('PresetCard', () => {
  it('summarizes a preset and starts a remix', async () => {
    const remix = vi.fn()
    const preset = PRESET_CATALOG.find((candidate) => candidate.id === 'neon-district-n9')
    if (preset === undefined) throw new Error('Expected neon-district-n9 preset')
    render(<PresetCard preset={preset} onRemix={remix} />)

    expect(screen.getByText('NEON DISTRICT N-9')).toBeInTheDocument()
    expect(screen.getByText('hexagon / Cyan gradient')).toBeInTheDocument()
    expect(screen.getByText('EmotionEngine')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remix NEON DISTRICT N-9' }))
    expect(remix).toHaveBeenCalledWith('neon-district-n9')
  })
})
