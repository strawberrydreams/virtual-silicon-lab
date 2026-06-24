import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Die, DieShape } from '../../domain/project'
import { DieParameterPanel } from './DieParameterPanel'

function die(shape: DieShape, dieShapeParams?: Die['dieShapeParams']): Die {
  return { shape, width: 960, height: 640, background: 'test', dieShapeParams }
}

function renderPanel(value: Die) {
  const callbacks = {
    onPreview: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
    onSet: vi.fn(),
  }
  render(<DieParameterPanel die={value} {...callbacks} />)
  return callbacks
}

describe('DieParameterPanel', () => {
  it('renders the resolved slider and percentage for the active shape', () => {
    renderPanel(die('rounded-rect'))

    expect(screen.getByRole('heading', { name: 'Die Parameters' })).toBeInTheDocument()
    expect(screen.getByText('Rounded Rect')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Corner Radius' })).toHaveValue('0.12')
    expect(screen.getByText('12%')).toBeInTheDocument()
  })

  it('previews slider changes and commits on pointer release', () => {
    const callbacks = renderPanel(die('rounded-rect'))
    const slider = screen.getByRole('slider', { name: 'Corner Radius' })

    fireEvent.change(slider, { target: { value: '0.24' } })
    fireEvent.pointerUp(slider)

    expect(callbacks.onPreview).toHaveBeenCalledWith({ cornerRadius: 0.24 })
    expect(callbacks.onCommit).toHaveBeenCalledOnce()
  })

  it('commits keyboard changes on key release', () => {
    const callbacks = renderPanel(die('plus'))
    const slider = screen.getByRole('slider', { name: 'Arm Width' })

    fireEvent.change(slider, { target: { value: '0.42' } })
    fireEvent.keyUp(slider, { key: 'ArrowRight' })

    expect(callbacks.onPreview).toHaveBeenCalledWith({ armWidth: 0.42 })
    expect(callbacks.onCommit).toHaveBeenCalledOnce()
  })

  it('cancels preview on Escape or pointer cancellation', () => {
    const callbacks = renderPanel(die('octagon'))
    const slider = screen.getByRole('slider', { name: 'Corner Cut' })

    fireEvent.keyDown(slider, { key: 'Escape' })
    fireEvent.pointerCancel(slider)

    expect(callbacks.onCancel).toHaveBeenCalledTimes(2)
    expect(callbacks.onCommit).not.toHaveBeenCalled()
  })

  it('offers four atomic notch corner choices', async () => {
    const callbacks = renderPanel(die('keyed', { notch: { corner: 'bottom-left', size: 0.22 } }))

    expect(screen.getByRole('group', { name: 'Notch corner' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bottom left' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Top right' }))

    expect(callbacks.onSet).toHaveBeenCalledWith({
      notch: { corner: 'top-right', size: 0.22 },
    })
  })

  it('resets custom params atomically and disables reset at defaults', async () => {
    const custom = renderPanel(die('plus', { armWidth: 0.52 }))
    await userEvent.click(screen.getByRole('button', { name: 'Reset die parameters' }))
    expect(custom.onSet).toHaveBeenCalledWith({ armWidth: 0.36 })
  })

  it('disables reset when current params resolve to defaults', () => {
    renderPanel(die('l-shape'))
    expect(screen.getByRole('button', { name: 'Reset die parameters' })).toBeDisabled()
  })

  it.each(['rect', 'square', 'circle', 'hexagon'] as const)(
    'renders nothing for legacy shape %s',
    (shape) => {
      const { container } = render(
        <DieParameterPanel
          die={die(shape)}
          onPreview={vi.fn()}
          onCommit={vi.fn()}
          onCancel={vi.fn()}
          onSet={vi.fn()}
        />,
      )
      expect(container).toBeEmptyDOMElement()
    },
  )
})
