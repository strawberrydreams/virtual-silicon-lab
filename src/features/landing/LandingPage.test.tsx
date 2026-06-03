import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('starts a blank project without login', async () => {
    const createProjectCommand = vi.fn().mockResolvedValue(createProject('Blank', 'blank-1', 100))
    render(
      <MemoryRouter>
        <LandingPage
          projectsCount={0}
          presets={PRESET_CATALOG}
          createProject={createProjectCommand}
          remixPreset={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start Blank' }))

    expect(createProjectCommand).toHaveBeenCalledWith('Untitled Dream Chip')
  })

  it('starts from a featured preset', async () => {
    const remixPreset = vi.fn().mockResolvedValue(createProject('AURORA', 'aurora-1', 100))
    render(
      <MemoryRouter>
        <LandingPage
          projectsCount={2}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          remixPreset={remixPreset}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start from AURORA M5' }))

    expect(remixPreset).toHaveBeenCalledWith('aurora-m5')
    expect(screen.getByRole('link', { name: 'Open Projects (2)' })).toHaveAttribute('href', '/dashboard')
  })

  it('shows a first-viewport chip product signal', () => {
    render(
      <MemoryRouter>
        <LandingPage
          projectsCount={0}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          remixPreset={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('region', { name: 'Hero chip preview' })).toBeInTheDocument()
    expect(screen.getByText('Press Image Lab')).toBeInTheDocument()
  })
})
