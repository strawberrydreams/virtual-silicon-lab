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
    render(
      <BlockVisualPanel
        block={block}
        chipFinish="gloss"
        onChange={onChange}
        onSetBlockFinish={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText('Tile image URL'), 'data:image/png;base64,abc')
    expect(onChange).toHaveBeenLastCalledWith('tile-1', {
      imageDataUrl: 'data:image/png;base64,abc',
    })

    await userEvent.click(screen.getByRole('button', { name: 'Clear tile image' }))
    expect(onChange).toHaveBeenLastCalledWith('tile-1', { imageDataUrl: undefined })
  })

  it('re-syncs the URL field when a different tile is selected', () => {
    const { rerender } = render(
      <BlockVisualPanel
        block={{ ...block, imageDataUrl: 'data:image/png;base64,AAA' }}
        chipFinish="gloss"
        onChange={vi.fn()}
        onSetBlockFinish={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Tile image URL')).toHaveValue('data:image/png;base64,AAA')

    rerender(
      <BlockVisualPanel
        block={{ ...block, id: 'tile-2', imageDataUrl: 'data:image/png;base64,BBB' }}
        chipFinish="gloss"
        onChange={vi.fn()}
        onSetBlockFinish={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Tile image URL')).toHaveValue('data:image/png;base64,BBB')
  })

  it('updates selected tile material override and can switch back to inherited', async () => {
    const onSetBlockFinish = vi.fn()
    render(
      <BlockVisualPanel
        block={{ ...block, finish: 'satin' }}
        chipFinish="gloss"
        onChange={vi.fn()}
        onSetBlockFinish={onSetBlockFinish}
      />,
    )

    const group = screen.getByRole('group', { name: 'Selected tile material controls' })
    expect(screen.getByRole('button', { name: 'Satin polymer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Brushed metal' }))
    expect(onSetBlockFinish).toHaveBeenCalledWith('tile-1', 'metallic')

    await userEvent.click(screen.getByRole('button', { name: 'Inherit chip finish: Gloss glass' }))
    expect(onSetBlockFinish).toHaveBeenCalledWith('tile-1', undefined)
    expect(group).toHaveTextContent('Global: Gloss glass')
  })
})
