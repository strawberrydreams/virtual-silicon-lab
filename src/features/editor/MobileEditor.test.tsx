import { act, fireEvent, render, screen } from '@testing-library/react'
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
  default: ({
    authoringMode,
    onApplyScene3DLook,
    onSetScene3DLighting,
    onSetScene3DCamera,
    onResetScene3DCamera,
  }: {
    authoringMode?: string
    onApplyScene3DLook?: (look: {
      camera: { azimuthRadians: number; elevationRadians: number; zoom: number; fov: number }
      lighting: { preset: 'dramatic'; intensity: number }
      environment: {
        topColor: string
        bottomColor: string
        exposure: number
        bloom: { threshold: number; strength: number; radius: number }
      }
    }) => void
    onSetScene3DLighting?: (lighting: { preset: 'neon-noir'; intensity: number }) => void
    onSetScene3DCamera?: (camera: {
      azimuthRadians: number
      elevationRadians: number
      zoom: number
      fov: number
    }) => void
    onResetScene3DCamera?: () => void
  }) => (
    <div>
      <button type="button">Open 3D showcase</button>
      <span>{authoringMode}</span>
      <button
        type="button"
        onClick={() =>
          onApplyScene3DLook?.({
            camera: { azimuthRadians: 0.25, elevationRadians: 0.55, zoom: 0.4, fov: 42 },
            lighting: { preset: 'dramatic', intensity: 1.1 },
            environment: {
              topColor: '#111827',
              bottomColor: '#030712',
              exposure: 1.15,
              bloom: { threshold: 0.4, strength: 0.8, radius: 0.5 },
            },
          })
        }
      >
        Mock apply mobile look
      </button>
      <button
        type="button"
        onClick={() => onSetScene3DLighting?.({ preset: 'neon-noir', intensity: 1.1 })}
      >
        Mock set mobile lighting
      </button>
      <button
        type="button"
        onClick={() =>
          onSetScene3DCamera?.({
            azimuthRadians: 0.35,
            elevationRadians: 0.45,
            zoom: 0.55,
            fov: 44,
          })
        }
      >
        Mock save mobile camera
      </button>
      <button type="button" onClick={onResetScene3DCamera}>
        Mock reset mobile camera
      </button>
    </div>
  ),
}))

describe('MobileEditor', () => {
  beforeEach(() => {
    vi.stubGlobal('WebGLRenderingContext', class WebGLRenderingContext {})
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('dispatches mobile look and lighting preset commands through the editor store', () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    const persist = vi.fn()

    render(<MobileEditor project={createProject('Pocket Chip')} persist={persist} />)

    expect(screen.getByText('mobile-presets')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mock apply mobile look' }))
    act(() => vi.advanceTimersByTime(600))

    expect(persist).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scene3d: expect.objectContaining({
          camera: expect.objectContaining({ fov: 42 }),
          lighting: { preset: 'dramatic', intensity: 1.1 },
          environment: expect.objectContaining({ exposure: 1.15 }),
        }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mock set mobile lighting' }))
    act(() => vi.advanceTimersByTime(600))

    expect(persist).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scene3d: expect.objectContaining({
          lighting: { preset: 'neon-noir', intensity: 1.1 },
          environment: expect.objectContaining({ exposure: 1.15 }),
        }),
      }),
    )
  })

  it('dispatches mobile camera save and reset commands through the editor store', () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    const persist = vi.fn()

    render(<MobileEditor project={createProject('Pocket Chip')} persist={persist} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mock save mobile camera' }))
    act(() => vi.advanceTimersByTime(600))

    expect(persist).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scene3d: expect.objectContaining({
          camera: {
            azimuthRadians: 0.35,
            elevationRadians: 0.45,
            zoom: 0.55,
            fov: 44,
          },
        }),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mock reset mobile camera' }))
    act(() => vi.advanceTimersByTime(600))

    expect(persist).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        scene3d: expect.anything(),
      }),
    )
  })
})
