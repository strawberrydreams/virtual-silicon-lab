import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChipFinishPanel } from './ChipFinishPanel'

describe('ChipFinishPanel', () => {
  it('renders every finish and marks the active finish', () => {
    render(<ChipFinishPanel finish="gloss" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Chip finish controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Matte ceramic' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Gloss glass' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Satin polymer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brushed metal' })).toBeInTheDocument()
  })

  it('emits the selected finish', async () => {
    const onChange = vi.fn()
    render(<ChipFinishPanel finish="gloss" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Brushed metal' }))

    expect(onChange).toHaveBeenCalledWith('metallic')
  })
})
