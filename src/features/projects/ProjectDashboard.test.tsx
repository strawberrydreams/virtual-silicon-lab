import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { ProjectDashboard } from './ProjectDashboard'

describe('ProjectDashboard', () => {
  it('creates a blank project from the dashboard', async () => {
    const createProjectCommand = vi.fn().mockResolvedValue(createProject('Dream Chip', 'project-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={createProjectCommand}
          remixPreset={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New Project' }))

    expect(createProjectCommand).toHaveBeenCalledWith('Untitled Dream Chip')
  })

  it('shows all presets and remixes the selected one', async () => {
    const remixPreset = vi.fn().mockResolvedValue(createProject('Remix', 'remix-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          remixPreset={remixPreset}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('button', { name: /^Remix / })).toHaveLength(6)
    await userEvent.click(screen.getByRole('button', { name: 'Remix NEON DISTRICT N-9' }))
    expect(remixPreset).toHaveBeenCalledWith('neon-district-n9')
  })
})
