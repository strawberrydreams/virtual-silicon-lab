import { Component, lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { Project } from '../domain/project'
import {
  SCENE_3D_LIGHTING_INTENSITY_RANGE,
  SCENE_3D_LIGHTING_PRESETS,
  type Scene3DCameraSettings,
  type Scene3DLightingPreset,
  type Scene3DLightingSettings,
} from '../domain/scene3d/scene3d'
import { PosterExportStage } from '../features/export/PosterExportStage'
import { resolveChip3DRenderMode } from '../visual/chip3d/chip3dBudget'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import {
  buildChip3DShowcaseModel,
  isChip3DShapeSupported,
  webglAvailable,
} from './chip3dAvailability'

const Chip3DViewer = lazy(() => import('./Chip3DViewer'))

const LIGHTING_LABELS: Record<Scene3DLightingPreset, string> = {
  studio: 'Studio',
  'neon-noir': 'Neon noir',
  daylight: 'Daylight',
  dramatic: 'Dramatic',
}

class ShowcaseErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The modal remains usable; a future telemetry layer can report this.
  }

  render() {
    return this.state.failed ? <p>3D showcase failed to load.</p> : this.props.children
  }
}

export function Chip3DShowcase({
  project,
  onClose,
  renderExtras,
  onSaveCamera,
  onResetCamera,
  onSetLighting,
  onResetLighting,
}: {
  project: Project
  onClose: () => void
  renderExtras?: (model: Chip3DModel) => ReactNode
  onSaveCamera?: (camera: Scene3DCameraSettings) => void
  onResetCamera?: () => void
  onSetLighting?: (lighting: Scene3DLightingSettings) => void
  onResetLighting?: () => void
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const model = useMemo(() => buildChip3DShowcaseModel(project), [project])
  const shapeSupported = isChip3DShapeSupported(project.die.shape)
  const interactive =
    shapeSupported &&
    resolveChip3DRenderMode({
      pieceCount: model.pieces.length,
      webglAvailable: webglAvailable(),
    }) === 'interactive'
  const lighting = project.scene3d?.lighting ?? { preset: 'studio', intensity: 1 }
  const showLightingControls = onSetLighting !== undefined || onResetLighting !== undefined

  return (
    <section
      aria-label={`${project.name} 3D showcase`}
      aria-modal="true"
      className="chip-3d-showcase"
      role="dialog"
    >
      <header className="chip-3d-showcase__header">
        <div>
          <p className="editor-kicker">Derived from the active 2D project</p>
          <h2>{project.name}</h2>
        </div>
        {interactive && renderExtras ? renderExtras(model) : null}
        {showLightingControls ? (
          <div className="chip-3d-lighting" aria-label="3D lighting controls">
            <div className="chip-3d-lighting__presets">
              {SCENE_3D_LIGHTING_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={lighting.preset === preset}
                  onClick={() => onSetLighting?.({ preset, intensity: lighting.intensity })}
                >
                  {LIGHTING_LABELS[preset]}
                </button>
              ))}
            </div>
            <label className="chip-3d-lighting__intensity">
              <span>Lighting intensity</span>
              <input
                type="range"
                min={SCENE_3D_LIGHTING_INTENSITY_RANGE.min}
                max={SCENE_3D_LIGHTING_INTENSITY_RANGE.max}
                step="0.05"
                value={lighting.intensity}
                onChange={(event) =>
                  onSetLighting?.({
                    preset: lighting.preset,
                    intensity: Number(event.currentTarget.value),
                  })
                }
              />
            </label>
            <button type="button" onClick={onResetLighting}>
              Reset lighting
            </button>
          </div>
        ) : null}
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          Close 3D showcase
        </button>
      </header>
      {interactive ? (
        <ShowcaseErrorBoundary>
          <Suspense fallback={<p>Loading 3D showcase…</p>}>
            <Chip3DViewer
              model={model}
              onSaveCamera={onSaveCamera}
              onResetCamera={onResetCamera}
            />
          </Suspense>
        </ShowcaseErrorBoundary>
      ) : (
        <div className="chip-3d-showcase__fallback">
          <p>3D is not available in this browser.</p>
          <div
            aria-label={`${project.name} 2D poster fallback`}
            className="chip-3d-showcase__poster"
            role="img"
          >
            <PosterExportStage project={project} />
          </div>
        </div>
      )}
    </section>
  )
}
