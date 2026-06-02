import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { ProjectDashboard } from './ProjectDashboard'

describe('ProjectDashboard', () => {
  it('creates a project from the dashboard', async () => {
    const createProjectCommand = vi.fn().mockResolvedValue(createProject('Dream Chip', 'project-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          createProject={createProjectCommand}
          createHeroChip={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'New Project' }))

    expect(createProjectCommand).toHaveBeenCalledWith('Untitled Dream Chip')
  })

  it('loads the hero chip from the dashboard', async () => {
    const createHeroChipCommand = vi.fn().mockResolvedValue(createProject('Hero', 'hero-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          createProject={vi.fn()}
          createHeroChip={createHeroChipCommand}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Load Hero Chip' }))

    expect(createHeroChipCommand).toHaveBeenCalledTimes(1)
  })
})
