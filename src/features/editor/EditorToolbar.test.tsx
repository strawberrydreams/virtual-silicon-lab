import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorToolbar } from './EditorToolbar'

function renderToolbar(overrides = {}) {
  const props = {
    dieShape: 'rect' as const,
    theme: 'neon' as const,
    canUndo: true,
    canRedo: false,
    hasSelection: true,
    hasBlockSelection: true,
    onSetDieShape: vi.fn(),
    onSetTheme: vi.fn(),
    onAddDecoration: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onBringForward: vi.fn(),
    onSendBackward: vi.fn(),
    ...overrides,
  }
  render(<EditorToolbar {...props} />)
  return props
}

describe('EditorToolbar', () => {
  it('changes die shape', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Circle' }))
    expect(props.onSetDieShape).toHaveBeenCalledWith('circle')
  })

  it('selects a shape from the parametric menu', async () => {
    const user = userEvent.setup()
    const props = renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Parametric die shapes' }))
    expect(screen.getByRole('menu', { name: 'Parametric die shapes' })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'L-Shape' }))

    expect(props.onSetDieShape).toHaveBeenCalledWith('l-shape')
    expect(screen.queryByRole('menu', { name: 'Parametric die shapes' })).not.toBeInTheDocument()
  })

  it('shows the active parametric shape beside the menu', () => {
    renderToolbar({ dieShape: 'plus' })
    expect(screen.getByLabelText('Current parametric shape')).toHaveTextContent('Plus')
  })

  it('closes the parametric menu on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    renderToolbar()
    const trigger = screen.getByRole('button', { name: 'Parametric die shapes' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Parametric die shapes' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes the parametric menu on an outside pointer click', async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByRole('button', { name: 'Parametric die shapes' }))
    await user.click(screen.getByRole('region', { name: 'Editor operation strip' }))
    expect(screen.queryByRole('menu', { name: 'Parametric die shapes' })).not.toBeInTheDocument()
  })

  it('disables redo when there is nothing to redo', () => {
    renderToolbar({ canRedo: false })
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('disables selection commands when nothing is selected', () => {
    renderToolbar({ hasSelection: false, hasBlockSelection: false })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled()
  })

  it('disables z-order commands for studio-item selections that have no z-order', () => {
    renderToolbar({ hasSelection: true, hasBlockSelection: false }) // sticker/spray selected
    expect(screen.getByRole('button', { name: 'Forward' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Backward' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled()
  })

  it('invokes undo and delete handlers', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(props.onUndo).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it('switches chip theme', async () => {
    const props = renderToolbar()
    const keynoteButton = screen.getByRole('button', { name: 'Keynote' })
    expect(keynoteButton).toHaveAttribute('data-theme', 'keynote')
    expect(keynoteButton).not.toHaveAttribute('data-finish')

    await userEvent.click(keynoteButton)
    expect(props.onSetTheme).toHaveBeenCalledWith('keynote')
  })

  it('adds a decoration', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Glow Route' }))
    expect(props.onAddDecoration).toHaveBeenCalledWith('neonLine')
  })

  it('groups controls into stable tool clusters', () => {
    renderToolbar()

    expect(screen.getByRole('region', { name: 'Shape and theme controls' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Editor operation strip' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Die shape controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Chip theme controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Decoration controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'History controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Selection controls' })).toBeInTheDocument()
  })

  it('exposes reference-style operation tools without changing existing handlers', () => {
    renderToolbar()

    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resize' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Align' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Distribute' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Snap' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Resize' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Align' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Distribute' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Snap' })).toBeDisabled()
    // Copy is a reference placeholder until clipboard lands — it must not
    // silently mirror the adjacent Duplicate button.
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('exposes the sci-fi object decoration command', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Object' }))
    expect(props.onAddDecoration).toHaveBeenCalledWith('sciFiObject')
  })
})
