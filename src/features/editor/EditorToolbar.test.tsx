import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditorToolbar } from './EditorToolbar'

function renderToolbar(overrides = {}) {
  const props = {
    dieShape: 'rect' as const,
    canUndo: true,
    canRedo: false,
    hasSelection: true,
    onSetDieShape: vi.fn(),
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
})
