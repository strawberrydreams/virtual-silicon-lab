import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { PRESET_CATALOG } from '../../presets/presetCatalog'
import { AiApiError } from '../specs/aiCopyApi'
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
          generateAiChip={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('No local projects yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start from a template' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lab Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('region', { name: 'Preset remix surface' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Local project surface' })).toBeInTheDocument()
  })

  it('starts a first-run template directly from the empty state', async () => {
    const remixPreset = vi.fn().mockResolvedValue(createProject('Starter', 'starter-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={remixPreset}
          generateAiChip={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Start with AURORA M5' }))

    expect(remixPreset).toHaveBeenCalledWith('aurora-m5')
  })

  it('creates a blank project from the dashboard', async () => {
    const createProjectCommand = vi
      .fn()
      .mockResolvedValue(createProject('Dream Chip', 'project-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={createProjectCommand}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          generateAiChip={vi.fn()}
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
          generateAiChip={vi.fn()}
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
          generateAiChip={vi.fn()}
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
          generateAiChip={vi.fn()}
          duplicateProject={duplicateProject}
          removeProject={removeProject}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('1 Local Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Dream Chip render preview')).toBeInTheDocument()
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
          generateAiChip={vi.fn()}
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

  it('generates a chip from a prompt and navigates on success', async () => {
    const generateAiChip = vi.fn().mockResolvedValue(createProject('AI Chip', 'ai-1', 100))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          generateAiChip={generateAiChip}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    const generateButton = screen.getByRole('button', { name: /generate with ai/i })
    expect(generateButton).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText(/describe a chip/i), 'a calm mono chip')
    expect(generateButton).toBeEnabled()
    await userEvent.click(generateButton)

    expect(generateAiChip).toHaveBeenCalledWith('a calm mono chip')
  })

  it('caps the AI prompt input length at 2000 characters', () => {
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          generateAiChip={vi.fn()}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('AI chip prompt')).toHaveAttribute('maxlength', '2000')
  })

  it('shows an inline message and creates no project when generation fails', async () => {
    const generateAiChip = vi
      .fn()
      .mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many'))
    render(
      <MemoryRouter>
        <ProjectDashboard
          projects={[]}
          presets={PRESET_CATALOG}
          createProject={vi.fn()}
          createRandomProject={vi.fn()}
          remixPreset={vi.fn()}
          generateAiChip={generateAiChip}
          duplicateProject={vi.fn()}
          removeProject={vi.fn()}
        />
      </MemoryRouter>,
    )

    await userEvent.type(screen.getByPlaceholderText(/describe a chip/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: /generate with ai/i }))

    expect(await screen.findByText(/daily ai limit/i)).toBeInTheDocument()
    expect(generateAiChip).toHaveBeenCalledTimes(1)
  })
})
