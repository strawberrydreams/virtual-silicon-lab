import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { MobileEditor } from './MobileEditor'

// Keep the heavy read-only surface and 3D tree out of this test; assert only the
// store-backed wrapper's gating and slot wiring.
vi.mock('./MobileEditorPreview', () => ({
  MobileEditorPreview: ({
    project,
    chip3dSlot,
  }: {
    project: { name: string }
    chip3dSlot?: ReactNode
  }) => (
    <main aria-label="Chip preview">
      <span>{project.name}</span>
      {chip3dSlot}
    </main>
  ),
}))

vi.mock('./Chip3DPreviewToggle', () => ({
  default: () => <button type="button">Open 3D showcase</button>,
}))

describe('MobileEditor', () => {
  beforeEach(() => {
    vi.stubGlobal('WebGLRenderingContext', class WebGLRenderingContext {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the 3D entry when the chip qualifies for the interactive showcase', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)

    render(<MobileEditor project={createProject('Pocket Chip')} persist={vi.fn()} />)

    expect(screen.getByRole('main', { name: 'Chip preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open 3D showcase' })).toBeInTheDocument()
  })

  it('falls back to the read-only preview without a 3D entry when WebGL is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    render(<MobileEditor project={createProject('Pocket Chip')} persist={vi.fn()} />)

    expect(screen.getByRole('main', { name: 'Chip preview' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open 3D showcase' })).not.toBeInTheDocument()
  })
})
