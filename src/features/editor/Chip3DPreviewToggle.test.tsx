import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import type { Chip3DModel } from '../../visual/chip3d/chip3dModel'
import Chip3DPreviewToggle from './Chip3DPreviewToggle'

const { viewerState } = vi.hoisted(() => ({ viewerState: { throws: false } }))

vi.mock('../../three/Chip3DViewer', () => ({
  default: ({
    model,
    onSaveCamera,
    onResetCamera,
  }: {
    model: { pieces: unknown[] }
    onSaveCamera?: (camera: {
      azimuthRadians: number
      elevationRadians: number
      zoom: number
      fov: number
    }) => void
    onResetCamera?: () => void
  }) => {
    if (viewerState.throws) throw new Error('viewer failed')
    return (
      <div>
        <div data-testid="mock-viewer">pieces:{model.pieces.length}</div>
        {onSaveCamera ? (
          <button
            type="button"
            onClick={() =>
              onSaveCamera({
                azimuthRadians: 0.4,
                elevationRadians: 0.5,
                zoom: 0.6,
                fov: 48,
              })
            }
          >
            Mock save current view
          </button>
        ) : null}
        {onResetCamera ? (
          <button type="button" onClick={onResetCamera}>
            Mock reset 3D default
          </button>
        ) : null}
      </div>
    )
  },
}))

vi.mock('../export/PosterExportStage', () => ({
  PosterExportStage: () => <div data-testid="poster-export-stage" />,
}))

vi.mock('../export/VideoExportPanel', () => ({
  VideoExportPanel: ({ model }: { model: Chip3DModel }) => {
    const die = model.pieces.find((piece) => piece.kind === 'dieBase')
    return <div data-testid="video-export-model">{die?.footprint.type}</div>
  },
}))

describe('Chip3DPreviewToggle', () => {
  beforeEach(() => {
    viewerState.throws = false
    vi.stubGlobal('WebGLRenderingContext', class WebGLRenderingContext {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

    expect(await screen.findByText('3D is not available in this browser.')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-viewer')).toBeNull()
  })

  it('shows the poster fallback when the derived model exceeds the piece budget', async () => {
    const project = createProject('Heavy')
    project.blocks = Array.from({ length: 399 }, (_, index) => ({
      id: `block-${index}`,
      type: 'CPU' as const,
      category: 'real' as const,
      x: index % 20,
      y: Math.floor(index / 20),
      w: 1,
      h: 1,
      rotation: 0,
      zIndex: index,
    }))
    render(<Chip3DPreviewToggle project={project} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(await screen.findByText('3D is not available in this browser.')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-viewer')).toBeNull()
  })

  it('opens a parametric shape in the interactive 3D showcase', async () => {
    const project = createProject('Parametric')
    project.die = {
      ...project.die,
      shape: 'rounded-rect',
      dieShapeParams: { cornerRadius: 0.24 },
    }
    render(<Chip3DPreviewToggle project={project} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(await screen.findByTestId('mock-viewer')).toBeInTheDocument()
    expect(screen.queryByText('Parametric 3D geometry arrives in M3.')).toBeNull()
    expect(screen.queryByRole('img', { name: 'Parametric 2D poster fallback' })).toBeNull()
  })

  it('gives MP4 export the same parametric polygon model shown in 3D', async () => {
    const project = createProject('Parametric MP4')
    project.die = {
      ...project.die,
      shape: 'rounded-rect',
      dieShapeParams: { cornerRadius: 0.24 },
    }
    render(<Chip3DPreviewToggle project={project} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(await screen.findByTestId('mock-viewer')).toBeInTheDocument()
    expect(screen.getByTestId('video-export-model')).toHaveTextContent('polygon')
  })

  it('passes camera save and reset callbacks to the viewer when provided', async () => {
    const onSetScene3DCamera = vi.fn()
    const onResetScene3DCamera = vi.fn()
    render(
      <Chip3DPreviewToggle
        project={createProject('T')}
        onSetScene3DCamera={onSetScene3DCamera}
        onResetScene3DCamera={onResetScene3DCamera}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Mock save current view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mock reset 3D default' }))

    expect(onSetScene3DCamera).toHaveBeenCalledWith({
      azimuthRadians: 0.4,
      elevationRadians: 0.5,
      zoom: 0.6,
      fov: 48,
    })
    expect(onResetScene3DCamera).toHaveBeenCalledTimes(1)
  })

  it('passes lighting controls through the editor showcase', async () => {
    const onSetScene3DLighting = vi.fn()
    const onResetScene3DLighting = vi.fn()
    const project = createProject('Lit')
    project.scene3d = { lighting: { preset: 'daylight', intensity: 1.25 } }
    render(
      <Chip3DPreviewToggle
        project={project}
        onSetScene3DLighting={onSetScene3DLighting}
        onResetScene3DLighting={onResetScene3DLighting}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    await screen.findByRole('dialog', { name: 'Lit 3D showcase' })
    fireEvent.click(screen.getByRole('button', { name: 'Neon noir' }))
    fireEvent.change(screen.getByLabelText('Lighting intensity'), { target: { value: '0.8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset lighting' }))

    expect(onSetScene3DLighting).toHaveBeenNthCalledWith(1, {
      preset: 'neon-noir',
      intensity: 1.25,
    })
    expect(onSetScene3DLighting).toHaveBeenNthCalledWith(2, {
      preset: 'daylight',
      intensity: 0.8,
    })
    expect(onResetScene3DLighting).toHaveBeenCalledTimes(1)
  })

  it('keeps the modal recoverable when the viewer fails to load', async () => {
    viewerState.throws = true
    render(<Chip3DPreviewToggle project={createProject('T')} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))

    expect(await screen.findByText('3D showcase failed to load.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close 3D showcase' })).toBeEnabled()
  })

  it('moves focus into the modal and restores it to the opener', async () => {
    render(<Chip3DPreviewToggle project={createProject('T')} />)
    const opener = screen.getByRole('button', { name: 'Open 3D showcase' })

    opener.focus()
    fireEvent.click(opener)
    const close = await screen.findByRole('button', { name: 'Close 3D showcase' })
    expect(close).toHaveFocus()

    fireEvent.click(close)
    expect(opener).toHaveFocus()
  })
})
