import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AmbientMotionPanel } from './AmbientMotionPanel'

describe('AmbientMotionPanel', () => {
  it('renders an editor-only switch with status copy', async () => {
    const onChange = vi.fn()

    render(
      <AmbientMotionPanel
        enabled={true}
        prefersReducedMotion={false}
        budget={{ tier: 'full', animateGlow: true, animateTraces: true, reason: null }}
        onChange={onChange}
      />,
    )

    const control = screen.getByRole('switch', { name: 'Ambient motion' })
    expect(control).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Glow pulse and trace shimmer are editor-only.')).toBeInTheDocument()

    await userEvent.click(control)

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('explains reduced-motion default while allowing explicit opt-in', () => {
    render(
      <AmbientMotionPanel
        enabled={false}
        prefersReducedMotion={true}
        budget={{ tier: 'full', animateGlow: true, animateTraces: true, reason: null }}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('switch', { name: 'Ambient motion' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(
      screen.getByText('Reduced motion is on; ambient motion starts disabled.'),
    ).toBeInTheDocument()
  })

  it('shows graceful-degradation copy for dense projects', () => {
    render(
      <AmbientMotionPanel
        enabled={true}
        prefersReducedMotion={false}
        budget={{
          tier: 'glow-only',
          animateGlow: true,
          animateTraces: false,
          reason: 'Trace shimmer paused on dense projects to protect canvas frame rate.',
        }}
        onChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Trace shimmer paused on dense projects to protect canvas frame rate.'),
    ).toBeInTheDocument()
  })
})
