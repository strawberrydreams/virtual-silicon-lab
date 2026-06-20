import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Project } from '../../domain/project'
import { createProject } from '../../domain/projectFactory'
import { AiApiError, type AiVariationsApi } from './aiVariationsApi'
import { AiVariationsPanel } from './AiVariationsPanel'

vi.mock('./MobileChipPreview', () => ({
  MobileChipPreview: () => <div data-testid="thumb" />,
}))

function variation(name: string): Project {
  return { ...createProject(name, name, 0), theme: 'retro' }
}

const VARIATIONS: Project[] = [variation('Alpha'), variation('Beta'), variation('Gamma')]

function renderPanel(api: AiVariationsApi, onSaveVariation = vi.fn().mockResolvedValue(undefined)) {
  const project = createProject('Source', 'src', 0)
  render(
    <AiVariationsPanel
      project={project}
      onSaveVariation={onSaveVariation}
      api={api}
    />,
  )
  return { onSaveVariation, project }
}

describe('AiVariationsPanel', () => {
  it('generates with the selected count and renders a card per variation', async () => {
    const api: AiVariationsApi = { generateVariations: vi.fn().mockResolvedValue(VARIATIONS) }
    renderPanel(api)

    fireEvent.change(screen.getByLabelText(/variation count/i), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /generate variations/i }))

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    expect(screen.getAllByTestId('thumb')).toHaveLength(3)
    expect(api.generateVariations).toHaveBeenCalledWith(expect.anything(), 4)
  })

  it('saves one variation, marks its card saved, and leaves the source unchanged', async () => {
    const api: AiVariationsApi = { generateVariations: vi.fn().mockResolvedValue(VARIATIONS) }
    const { onSaveVariation, project } = renderPanel(api)
    const sourceBefore = structuredClone(project)

    fireEvent.click(screen.getByRole('button', { name: /generate variations/i }))
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /save as new project/i })[0])

    expect(onSaveVariation).toHaveBeenCalledWith(VARIATIONS[0])
    await waitFor(() => expect(screen.getByText(/saved/i)).toBeInTheDocument())
    expect(project).toEqual(sourceBefore)
  })

  it('shows a friendly message on a quota error and saves nothing', async () => {
    const api: AiVariationsApi = {
      generateVariations: vi.fn().mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many')),
    }
    const { onSaveVariation } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate variations/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/daily ai limit/i))
    expect(onSaveVariation).not.toHaveBeenCalled()
  })
})
