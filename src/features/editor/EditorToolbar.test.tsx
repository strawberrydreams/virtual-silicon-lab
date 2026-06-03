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

  it('disables redo when there is nothing to redo', () => {
    renderToolbar({ canRedo: false })
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('disables selection commands when nothing is selected', () => {
    renderToolbar({ hasSelection: false })
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled()
  })

  it('invokes undo and delete handlers', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(props.onUndo).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it('switches theme', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Keynote' }))
    expect(props.onSetTheme).toHaveBeenCalledWith('keynote')
  })

  it('adds a decoration', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Neon Line' }))
    expect(props.onAddDecoration).toHaveBeenCalledWith('neonLine')
  })

  it('groups controls into stable tool clusters', () => {
    renderToolbar()

    expect(screen.getByRole('group', { name: 'Die shape controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Chip theme controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Decoration controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'History controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Selection controls' })).toBeInTheDocument()
  })

  it('exposes the sci-fi object decoration command', async () => {
    const props = renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Object' }))
    expect(props.onAddDecoration).toHaveBeenCalledWith('sciFiObject')
  })
})
