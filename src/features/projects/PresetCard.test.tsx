import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { PresetCard } from './PresetCard'

describe('PresetCard', () => {
  it('summarizes a preset and starts a remix', async () => {
    const remix = vi.fn()
    render(<PresetCard preset={PRESET_CATALOG[1]} onRemix={remix} />)

    expect(screen.getByText('NEON DISTRICT N-9')).toBeInTheDocument()
    expect(screen.getByText('hexagon / neon')).toBeInTheDocument()
    expect(screen.getByText('EmotionEngine')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remix NEON DISTRICT N-9' }))
    expect(remix).toHaveBeenCalledWith('neon-district-n9')
  })
})
