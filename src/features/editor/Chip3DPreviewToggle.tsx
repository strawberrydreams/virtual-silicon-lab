import { useState } from 'react'
import type { Project } from '../../domain/project'
import type { Scene3DCameraSettings } from '../../domain/scene3d/scene3d'
import { Chip3DShowcase } from '../../three/Chip3DShowcase'
import { VideoExportPanel } from '../export/VideoExportPanel'

export default function Chip3DPreviewToggle({
  project,
  onSetScene3DCamera,
  onResetScene3DCamera,
}: {
  project: Project
  onSetScene3DCamera?: (camera: Scene3DCameraSettings) => void
  onResetScene3DCamera?: () => void
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
        />
      ) : null}
    </>
  )
}
