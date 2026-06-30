import { useState } from 'react'
import type { Project } from '../../domain/project'
import type {
  Scene3DAnimationSettings,
  Scene3DCameraSettings,
  Scene3DEnvironmentSettings,
  Scene3DLightingSettings,
  Scene3DLookSettings,
} from '../../domain/scene3d/scene3d'
import { Chip3DShowcase } from '../../three/Chip3DShowcase'
import { VideoExportPanel } from '../export/VideoExportPanel'

export default function Chip3DPreviewToggle({
  project,
  authoringMode = 'desktop',
  onSetScene3DCamera,
  onResetScene3DCamera,
  onSetScene3DLighting,
  onResetScene3DLighting,
  onSetScene3DEnvironment,
  onResetScene3DEnvironment,
  onApplyScene3DLook,
  onSetScene3DAnimation,
  onResetScene3DAnimation,
}: {
  project: Project
  authoringMode?: 'desktop' | 'mobile-presets'
  onSetScene3DCamera?: (camera: Scene3DCameraSettings) => void
  onResetScene3DCamera?: () => void
  onSetScene3DLighting?: (lighting: Scene3DLightingSettings) => void
  onResetScene3DLighting?: () => void
  onSetScene3DEnvironment?: (environment: Scene3DEnvironmentSettings) => void
  onResetScene3DEnvironment?: () => void
  onApplyScene3DLook?: (look: Scene3DLookSettings) => void
  onSetScene3DAnimation?: (animation: Scene3DAnimationSettings) => void
  onResetScene3DAnimation?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="editor-showcase-button" type="button" onClick={() => setOpen(true)}>
        Open 3D showcase
      </button>
      {open ? (
        <Chip3DShowcase
          project={project}
          authoringMode={authoringMode}
          onClose={() => setOpen(false)}
          renderExtras={(model) => <VideoExportPanel model={model} name={project.name} />}
          onSaveCamera={onSetScene3DCamera}
          onResetCamera={onResetScene3DCamera}
          onSetLighting={onSetScene3DLighting}
          onResetLighting={onResetScene3DLighting}
          onSetEnvironment={onSetScene3DEnvironment}
          onResetEnvironment={onResetScene3DEnvironment}
          onApplyLook={onApplyScene3DLook}
          onSetAnimation={onSetScene3DAnimation}
          onResetAnimation={onResetScene3DAnimation}
        />
      ) : null}
    </>
  )
}
