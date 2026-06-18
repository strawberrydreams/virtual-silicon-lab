import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import Chip3DPreviewToggle from './Chip3DPreviewToggle'

const { viewerState } = vi.hoisted(() => ({ viewerState: { throws: false } }))

vi.mock('../../three/Chip3DViewer', () => ({
  default: ({ model }: { model: { pieces: unknown[] } }) => {
    if (viewerState.throws) throw new Error('viewer failed')
    return <div data-testid="mock-viewer">pieces:{model.pieces.length}</div>
  },
}))

describe('Chip3DPreviewToggle', () => {
  beforeEach(() => {
    viewerState.throws = false
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
  })

  it('lazy-mounts the viewer inside a modal showcase when opened', async () => {
    render(<Chip3DPreviewToggle project={createProject('T')} />)

    expect(screen.queryByTestId('mock-viewer')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(await screen.findByRole('dialog', { name: 'T 3D showcase' })).toBeInTheDocument()
    expect(await screen.findByTestId('mock-viewer')).toBeInTheDocument()
  })

  it('unmounts the showcase when closed', async () => {
    render(<Chip3DPreviewToggle project={createProject('T')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    expect(await screen.findByRole('dialog', { name: 'T 3D showcase' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close 3D showcase' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the showcase with Escape', async () => {
    render(<Chip3DPreviewToggle project={createProject('T')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows a fallback without mounting the viewer when WebGL is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<Chip3DPreviewToggle project={createProject('T')} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(
      await screen.findByText('3D is not available in this browser.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('mock-viewer')).toBeNull()
  })

  it('keeps the modal recoverable when the viewer fails to load', async () => {
    viewerState.throws = true
    render(<Chip3DPreviewToggle project={createProject('T')} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(await screen.findByText('3D showcase failed to load.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close 3D showcase' })).toBeEnabled()
  })
})
