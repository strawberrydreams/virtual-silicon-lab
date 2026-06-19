import { useState } from 'react'
import type { Project } from '../../domain/project'
import { Chip3DShowcase } from '../../three/Chip3DShowcase'
import { VideoExportPanel } from '../export/VideoExportPanel'

export default function Chip3DPreviewToggle({ project }: { project: Project }) {
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
        />
      ) : null}
    </>
  )
}
