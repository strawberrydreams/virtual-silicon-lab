import { forwardRef } from 'react'
import type Konva from 'konva'
import { Layer, Stage } from 'react-konva'
import type { Project } from '../../domain/project'
import { ChipArtwork } from '../editor/canvas/ChipArtwork'

// Export stages composite the full artwork from serializable project data only;
// editor-ephemeral layer toggles deliberately have no input here.
export const DieExportStage = forwardRef<Konva.Stage, { project: Project }>(function DieExportStage(
  { project },
  ref,
) {
  return (
    <Stage ref={ref} width={project.die.width} height={project.die.height}>
      <Layer>
        <ChipArtwork project={project} renderMode="die-only" />
      </Layer>
    </Stage>
  )
})
