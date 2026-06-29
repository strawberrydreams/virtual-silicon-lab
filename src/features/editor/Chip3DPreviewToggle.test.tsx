import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { resolveScene3DLookPreset } from '../../domain/scene3d/scene3d'
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

  it('passes look preset controls through the editor showcase only when provided', async () => {
    const onApplyScene3DLook = vi.fn()
    render(
      <Chip3DPreviewToggle
        project={createProject('Looks')}
        onApplyScene3DLook={onApplyScene3DLook}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    await screen.findByRole('dialog', { name: 'Looks 3D showcase' })
    fireEvent.click(screen.getByRole('button', { name: 'Inspection' }))

    expect(onApplyScene3DLook).toHaveBeenCalledWith(resolveScene3DLookPreset('inspection'))
  })

  it('hides look preset controls from viewer-only showcases', async () => {
    render(<Chip3DPreviewToggle project={createProject('Viewer')} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    await screen.findByRole('dialog', { name: 'Viewer 3D showcase' })

    expect(screen.queryByRole('button', { name: 'Inspection' })).toBeNull()
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

  it('passes environment controls through the editor showcase', async () => {
    const onSetScene3DEnvironment = vi.fn()
    const onResetScene3DEnvironment = vi.fn()
    const project = createProject('Post')
    project.scene3d = {
      environment: {
        topColor: '#111827',
        bottomColor: '#030712',
        exposure: 1.1,
        bloom: { threshold: 0.45, strength: 0.9, radius: 0.55 },
      },
    }
    render(
      <Chip3DPreviewToggle
        project={project}
        onSetScene3DEnvironment={onSetScene3DEnvironment}
        onResetScene3DEnvironment={onResetScene3DEnvironment}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    await screen.findByRole('dialog', { name: 'Post 3D showcase' })
    fireEvent.click(screen.getByRole('button', { name: 'Aurora post' }))
    fireEvent.change(screen.getByLabelText('Exposure'), { target: { value: '1.4' } })
    fireEvent.change(screen.getByLabelText('Bloom strength'), { target: { value: '1.6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset environment' }))

    expect(onSetScene3DEnvironment).toHaveBeenNthCalledWith(1, {
      topColor: '#101a33',
      bottomColor: '#060816',
      exposure: 1.1,
      bloom: { threshold: 0.45, strength: 0.9, radius: 0.55 },
    })
    expect(onSetScene3DEnvironment).toHaveBeenNthCalledWith(2, {
      topColor: '#111827',
      bottomColor: '#030712',
      exposure: 1.4,
      bloom: { threshold: 0.45, strength: 0.9, radius: 0.55 },
    })
    expect(onSetScene3DEnvironment).toHaveBeenNthCalledWith(3, {
      topColor: '#111827',
      bottomColor: '#030712',
      exposure: 1.1,
      bloom: { threshold: 0.45, strength: 1.6, radius: 0.55 },
    })
    expect(onResetScene3DEnvironment).toHaveBeenCalledTimes(1)
  })

  it('passes animation controls through the editor showcase', async () => {
    const onSetScene3DAnimation = vi.fn()
    const onResetScene3DAnimation = vi.fn()
    const project = createProject('Motion')
    project.scene3d = {
      animation: {
        turntable: { enabled: true, periodSeconds: 18 },
        glow: { enabled: true, periodSeconds: 4, min: 0.75, max: 1.25 },
      },
    }
    render(
      <Chip3DPreviewToggle
        project={project}
        onSetScene3DAnimation={onSetScene3DAnimation}
        onResetScene3DAnimation={onResetScene3DAnimation}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open 3D showcase' }))
    await screen.findByRole('dialog', { name: 'Motion 3D showcase' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Turntable' }))
    fireEvent.change(screen.getByLabelText('Turntable period'), { target: { value: '24' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Glow' }))
    fireEvent.change(screen.getByLabelText('Glow period'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Glow min'), { target: { value: '0.6' } })
    fireEvent.change(screen.getByLabelText('Glow max'), { target: { value: '1.4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset animation' }))

    expect(onSetScene3DAnimation).toHaveBeenNthCalledWith(1, {
      turntable: { enabled: false, periodSeconds: 18 },
      glow: { enabled: true, periodSeconds: 4, min: 0.75, max: 1.25 },
    })
    expect(onSetScene3DAnimation).toHaveBeenNthCalledWith(2, {
      turntable: { enabled: true, periodSeconds: 24 },
      glow: { enabled: true, periodSeconds: 4, min: 0.75, max: 1.25 },
    })
    expect(onSetScene3DAnimation).toHaveBeenNthCalledWith(3, {
      turntable: { enabled: true, periodSeconds: 18 },
      glow: { enabled: false, periodSeconds: 4, min: 0.75, max: 1.25 },
    })
    expect(onSetScene3DAnimation).toHaveBeenNthCalledWith(4, {
      turntable: { enabled: true, periodSeconds: 18 },
      glow: { enabled: true, periodSeconds: 6, min: 0.75, max: 1.25 },
    })
    expect(onSetScene3DAnimation).toHaveBeenNthCalledWith(5, {
      turntable: { enabled: true, periodSeconds: 18 },
      glow: { enabled: true, periodSeconds: 4, min: 0.6, max: 1.25 },
    })
    expect(onSetScene3DAnimation).toHaveBeenNthCalledWith(6, {
      turntable: { enabled: true, periodSeconds: 18 },
      glow: { enabled: true, periodSeconds: 4, min: 0.75, max: 1.4 },
    })
    expect(onResetScene3DAnimation).toHaveBeenCalledTimes(1)
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
