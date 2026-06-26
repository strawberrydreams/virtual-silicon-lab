import { useState } from 'react'
import type { Project } from '../../domain/project'
import type {
  Scene3DCameraSettings,
  Scene3DEnvironmentSettings,
  Scene3DLightingSettings,
} from '../../domain/scene3d/scene3d'
import { Chip3DShowcase } from '../../three/Chip3DShowcase'
import { VideoExportPanel } from '../export/VideoExportPanel'

export default function Chip3DPreviewToggle({
  project,
  onSetScene3DCamera,
  onResetScene3DCamera,
  onSetScene3DLighting,
  onResetScene3DLighting,
  onSetScene3DEnvironment,
  onResetScene3DEnvironment,
}: {
  project: Project
  onSetScene3DCamera?: (camera: Scene3DCameraSettings) => void
  onResetScene3DCamera?: () => void
  onSetScene3DLighting?: (lighting: Scene3DLightingSettings) => void
  onResetScene3DLighting?: () => void
  onSetScene3DEnvironment?: (environment: Scene3DEnvironmentSettings) => void
  onResetScene3DEnvironment?: () => void
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
          onClose={() => setOpen(false)}
          renderExtras={(model) => <VideoExportPanel model={model} name={project.name} />}
          onSaveCamera={onSetScene3DCamera}
          onResetCamera={onResetScene3DCamera}
          onSetLighting={onSetScene3DLighting}
          onResetLighting={onResetScene3DLighting}
          onSetEnvironment={onSetScene3DEnvironment}
          onResetEnvironment={onResetScene3DEnvironment}
        />
      ) : null}
    </>
  )
}
