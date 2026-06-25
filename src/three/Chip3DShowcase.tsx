import { Component, lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { Project } from '../domain/project'
import type { Scene3DCameraSettings } from '../domain/scene3d/scene3d'
import { PosterExportStage } from '../features/export/PosterExportStage'
import { resolveChip3DRenderMode } from '../visual/chip3d/chip3dBudget'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import {
  buildChip3DShowcaseModel,
  isChip3DShapeSupported,
  webglAvailable,
} from './chip3dAvailability'

const Chip3DViewer = lazy(() => import('./Chip3DViewer'))

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
}: {
  project: Project
  onClose: () => void
  renderExtras?: (model: Chip3DModel) => ReactNode
  onSaveCamera?: (camera: Scene3DCameraSettings) => void
  onResetCamera?: () => void
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
