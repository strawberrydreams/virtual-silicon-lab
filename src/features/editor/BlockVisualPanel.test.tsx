import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Block } from '../../domain/project'
import { BlockVisualPanel } from './BlockVisualPanel'

const block: Block = {
  id: 'tile-1',
  type: 'CPU',
  category: 'real',
  x: 0,
  y: 0,
  w: 120,
  h: 80,
  rotation: 0,
  glow: false,
  zIndex: 0,
}

describe('BlockVisualPanel', () => {
  it('updates and clears a selected tile custom image URL', async () => {
    const onChange = vi.fn()
    render(<BlockVisualPanel block={block} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Tile image URL'), 'data:image/png;base64,abc')
    expect(onChange).toHaveBeenLastCalledWith('tile-1', {
      imageDataUrl: 'data:image/png;base64,abc',
    })

    await userEvent.click(screen.getByRole('button', { name: 'Clear tile image' }))
    expect(onChange).toHaveBeenLastCalledWith('tile-1', { imageDataUrl: undefined })
  })
})
