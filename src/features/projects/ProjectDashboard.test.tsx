import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { ProjectDashboard } from './ProjectDashboard'

describe('ProjectDashboard', () => {
  it('shows an empty local-project state', () => {
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('No local projects yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Lab' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('region', { name: 'Preset remix surface' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Local project surface' })).toBeInTheDocument()
  })

  it('creates a blank project from the dashboard', async () => {
    const createProjectCommand = vi.fn().mockResolvedValue(createProject('Dream Chip', 'project-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={createProjectCommand}
          createRandomProject={vi.fn()}
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
          createRandomProject={vi.fn()}
          remixPreset={remixPreset}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('button', { name: /^Remix / })).toHaveLength(16)
    await userEvent.click(screen.getByRole('button', { name: 'Remix NEON DISTRICT N-9' }))
    expect(remixPreset).toHaveBeenCalledWith('neon-district-n9')
  })

  it('creates a random chip project from the dashboard', async () => {
    const createRandomProject = vi.fn().mockResolvedValue(createProject('Random', 'random-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={createRandomProject}
          remixPreset={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Random Chip' }))

    expect(createRandomProject).toHaveBeenCalled()
  })

  it('keeps existing project actions available', async () => {
    const duplicateProject = vi.fn().mockResolvedValue(createProject('Copy', 'copy-1', 100))
    const removeProject = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const project = createProject('Dream Chip', 'project-1', 100)
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[project]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          duplicateProject={duplicateProject}
          removeProject={removeProject}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('1 Local Project')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate Dream Chip' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Dream Chip' }))

    expect(duplicateProject).toHaveBeenCalledWith('project-1')
    expect(removeProject).toHaveBeenCalledWith('project-1')
    confirmSpy.mockRestore()
  })

  it('does not delete a project when the confirmation is declined', async () => {
    const removeProject = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = createProject('Dream Chip', 'project-1', 100)
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[project]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={removeProject}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Delete Dream Chip' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(removeProject).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
