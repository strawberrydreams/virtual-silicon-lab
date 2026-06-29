import { Component, lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { Project } from '../domain/project'
import {
  SCENE_3D_ANIMATION_RANGES,
  SCENE_3D_DEFAULT_ANIMATION,
  SCENE_3D_ENVIRONMENT_RANGES,
  SCENE_3D_LIGHTING_INTENSITY_RANGE,
  SCENE_3D_LIGHTING_PRESETS,
  SCENE_3D_LOOK_PRESETS,
  resolveScene3DLookPreset,
  type Scene3DAnimationSettings,
  type Scene3DCameraSettings,
  type Scene3DEnvironmentSettings,
  type Scene3DLightingPreset,
  type Scene3DLightingSettings,
  type Scene3DLookSettings,
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

const ENVIRONMENT_PRESETS = [
  { id: 'midnight', label: 'Midnight post', topColor: '#111827', bottomColor: '#030712' },
  { id: 'aurora', label: 'Aurora post', topColor: '#101a33', bottomColor: '#060816' },
  { id: 'clean', label: 'Clean post', topColor: '#e8edf7', bottomColor: '#8994a8' },
] as const

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
  onSetEnvironment,
  onResetEnvironment,
  onApplyLook,
  onSetAnimation,
  onResetAnimation,
}: {
  project: Project
  onClose: () => void
  renderExtras?: (model: Chip3DModel) => ReactNode
  onSaveCamera?: (camera: Scene3DCameraSettings) => void
  onResetCamera?: () => void
  onSetLighting?: (lighting: Scene3DLightingSettings) => void
  onResetLighting?: () => void
  onSetEnvironment?: (environment: Scene3DEnvironmentSettings) => void
  onResetEnvironment?: () => void
  onApplyLook?: (look: Scene3DLookSettings) => void
  onSetAnimation?: (animation: Scene3DAnimationSettings) => void
  onResetAnimation?: () => void
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
  const environment = project.scene3d?.environment ?? model.environment
  const animation = project.scene3d?.animation ?? SCENE_3D_DEFAULT_ANIMATION
  const showLightingControls = onSetLighting !== undefined || onResetLighting !== undefined
  const showEnvironmentControls = onSetEnvironment !== undefined || onResetEnvironment !== undefined
  const showLookControls = onApplyLook !== undefined
  const showAnimationControls = onSetAnimation !== undefined || onResetAnimation !== undefined

  const setEnvironment = (patch: Partial<Scene3DEnvironmentSettings>) => {
    onSetEnvironment?.({
      ...environment,
      ...patch,
      bloom: {
        ...environment.bloom,
        ...patch.bloom,
      },
    })
  }
  const setAnimation = (patch: {
    turntable?: Partial<Scene3DAnimationSettings['turntable']>
    glow?: Partial<Scene3DAnimationSettings['glow']>
  }) => {
    onSetAnimation?.({
      turntable: {
        ...animation.turntable,
        ...patch.turntable,
      },
      glow: {
        ...animation.glow,
        ...patch.glow,
      },
    })
  }

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
        {showLookControls ? (
          <div className="chip-3d-look-presets" aria-label="3D look presets">
            {SCENE_3D_LOOK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyLook?.(resolveScene3DLookPreset(preset.id))}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
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
        {showEnvironmentControls ? (
          <div className="chip-3d-environment" aria-label="3D environment controls">
            <div className="chip-3d-environment__presets">
              {ENVIRONMENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={
                    environment.topColor === preset.topColor &&
                    environment.bottomColor === preset.bottomColor
                  }
                  onClick={() =>
                    setEnvironment({
                      topColor: preset.topColor,
                      bottomColor: preset.bottomColor,
                    })
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="chip-3d-environment__range">
              <span>Exposure</span>
              <input
                type="range"
                min={SCENE_3D_ENVIRONMENT_RANGES.exposure.min}
                max={SCENE_3D_ENVIRONMENT_RANGES.exposure.max}
                step="0.05"
                value={environment.exposure}
                onChange={(event) => setEnvironment({ exposure: Number(event.currentTarget.value) })}
              />
            </label>
            <label className="chip-3d-environment__range">
              <span>Bloom strength</span>
              <input
                type="range"
                min={SCENE_3D_ENVIRONMENT_RANGES.bloomStrength.min}
                max={SCENE_3D_ENVIRONMENT_RANGES.bloomStrength.max}
                step="0.05"
                value={environment.bloom.strength}
                onChange={(event) =>
                  setEnvironment({ bloom: { ...environment.bloom, strength: Number(event.currentTarget.value) } })
                }
              />
            </label>
            <button type="button" onClick={onResetEnvironment}>
              Reset environment
            </button>
          </div>
        ) : null}
        {showAnimationControls ? (
          <div className="chip-3d-animation" aria-label="3D animation controls">
            <label className="chip-3d-animation__toggle">
              <input
                type="checkbox"
                checked={animation.turntable.enabled}
                onChange={(event) => setAnimation({ turntable: { enabled: event.currentTarget.checked } })}
              />
              <span>Turntable</span>
            </label>
            <label className="chip-3d-animation__range">
              <span>Turntable period</span>
              <input
                type="range"
                min={SCENE_3D_ANIMATION_RANGES.turntablePeriodSeconds.min}
                max={SCENE_3D_ANIMATION_RANGES.turntablePeriodSeconds.max}
                step="1"
                value={animation.turntable.periodSeconds}
                onChange={(event) =>
                  setAnimation({ turntable: { periodSeconds: Number(event.currentTarget.value) } })
                }
              />
            </label>
            <label className="chip-3d-animation__toggle">
              <input
                type="checkbox"
                checked={animation.glow.enabled}
                onChange={(event) => setAnimation({ glow: { enabled: event.currentTarget.checked } })}
              />
              <span>Glow</span>
            </label>
            <label className="chip-3d-animation__range">
              <span>Glow period</span>
              <input
                type="range"
                min={SCENE_3D_ANIMATION_RANGES.glowPeriodSeconds.min}
                max={SCENE_3D_ANIMATION_RANGES.glowPeriodSeconds.max}
                step="0.5"
                value={animation.glow.periodSeconds}
                onChange={(event) => setAnimation({ glow: { periodSeconds: Number(event.currentTarget.value) } })}
              />
            </label>
            <label className="chip-3d-animation__range">
              <span>Glow min</span>
              <input
                type="range"
                min={SCENE_3D_ANIMATION_RANGES.glowMin.min}
                max={SCENE_3D_ANIMATION_RANGES.glowMin.max}
                step="0.05"
                value={animation.glow.min}
                onChange={(event) => setAnimation({ glow: { min: Number(event.currentTarget.value) } })}
              />
            </label>
            <label className="chip-3d-animation__range">
              <span>Glow max</span>
              <input
                type="range"
                min={SCENE_3D_ANIMATION_RANGES.glowMax.min}
                max={SCENE_3D_ANIMATION_RANGES.glowMax.max}
                step="0.05"
                value={animation.glow.max}
                onChange={(event) => setAnimation({ glow: { max: Number(event.currentTarget.value) } })}
              />
            </label>
            <button type="button" onClick={onResetAnimation}>
              Reset animation
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
