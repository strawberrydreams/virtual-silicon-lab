import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { TileSettingsPanel } from './TileSettingsPanel'

const tileSettings = createProject('p', 'p1', 0).studio.tileSettings

describe('TileSettingsPanel', () => {
  it('renders the semi-auto tile detail controls', () => {
    render(<TileSettingsPanel tileSettings={tileSettings} onChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Tile Detail' })).toBeInTheDocument()
    expect(screen.getByLabelText('Detail density')).toBeInTheDocument()
    expect(screen.getByLabelText('Route intensity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Minimal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dense' })).toBeInTheDocument()
  })

  it('emits a contact style change', async () => {
    const onChange = vi.fn()
    render(<TileSettingsPanel tileSettings={tileSettings} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dense' }))

    expect(onChange).toHaveBeenCalledWith({ contactStyle: 'dense' })
  })

  it('emits a detail density change from the slider', () => {
    const onChange = vi.fn()
    render(<TileSettingsPanel tileSettings={tileSettings} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Detail density'), { target: { value: '0.3' } })

    expect(onChange).toHaveBeenCalledWith({ detailDensity: 0.3 })
  })
})
