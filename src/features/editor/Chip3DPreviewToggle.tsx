import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { Project } from '../../domain/project'
import { resolveTheme } from '../../themes/themeTokens'
import { buildChip3DModel, type Chip3DPalette } from '../../visual/chip3d/chip3dModel'
import { buildChipLayers } from '../../visual/chipLayers'

const Chip3DViewer = lazy(() => import('../../three/Chip3DViewer'))

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

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function Chip3DShowcase({ project, onClose }: { project: Project; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
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

  const model = useMemo(() => {
    const tokens = resolveTheme(project.theme)
    const palette: Chip3DPalette = {
      die: tokens.dieFill[0].color,
      blockReal: tokens.blockFill.real,
      blockFantasy: tokens.blockFill.fantasy,
    }
    return buildChip3DModel(buildChipLayers(project), project.die, palette)
  }, [project])

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
        <button ref={closeButtonRef} type="button" onClick={onClose}>
          Close 3D showcase
        </button>
      </header>
      {webglAvailable() ? (
        <ShowcaseErrorBoundary>
          <Suspense fallback={<p>Loading 3D showcase…</p>}>
            <Chip3DViewer model={model} />
          </Suspense>
        </ShowcaseErrorBoundary>
      ) : (
        <p>3D is not available in this browser.</p>
      )}
    </section>
  )
}

export default function Chip3DPreviewToggle({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="editor-showcase-button" type="button" onClick={() => setOpen(true)}>
        Open 3D showcase
      </button>
      {open ? <Chip3DShowcase project={project} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
