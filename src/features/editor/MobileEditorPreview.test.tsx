import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { MobileEditorPreview } from './MobileEditorPreview'

// Konva stage + the publish/export panels are environment-heavy; mock them so the
// test asserts the read-only surface structure (spec + CTA), not canvas rendering.
vi.mock('./MobileChipPreview', () => ({
  MobileChipPreview: () => <div data-testid="mobile-chip-preview" />,
}))
vi.mock('../publish/PublishPanel', () => ({
  PublishPanel: () => <div data-testid="publish-panel" />,
}))
vi.mock('../export/ExportPanel', () => ({
  ExportPanel: () => <div data-testid="export-panel" />,
}))

describe('MobileEditorPreview', () => {
  it('renders the read-only preview, spec, panels, and an edit-on-desktop CTA', () => {
    const project = createProject('Pocket Chip')
    render(
      <MemoryRouter>
        <MobileEditorPreview project={project} />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('mobile-chip-preview')).toBeInTheDocument()
    expect(screen.getByTestId('publish-panel')).toBeInTheDocument()
    expect(screen.getByTestId('export-panel')).toBeInTheDocument()
    expect(screen.getByText(/edit on desktop/i)).toBeInTheDocument()
    // Spec brand surfaced from project.spec
    expect(screen.getByText(project.spec.brand, { exact: false })).toBeInTheDocument()
  })

  it('renders a provided 3D slot under the chip preview', () => {
    const project = createProject('Pocket Chip')
    render(
      <MemoryRouter>
        <MobileEditorPreview
          project={project}
          chip3dSlot={<button type="button">Open 3D showcase</button>}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Open 3D showcase' })).toBeInTheDocument()
  })

  it('omits the 3D slot region when none is provided', () => {
    const project = createProject('Pocket Chip')
    render(
      <MemoryRouter>
        <MobileEditorPreview project={project} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Open 3D showcase' })).not.toBeInTheDocument()
  })
})
