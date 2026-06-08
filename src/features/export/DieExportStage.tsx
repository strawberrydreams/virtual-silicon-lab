import { forwardRef } from 'react'
import type Konva from 'konva'
import { Layer, Stage } from 'react-konva'
import type { Project } from '../../domain/project'
import { ChipArtwork } from '../editor/canvas/ChipArtwork'
import type { ChipLayerVisibility } from '../editor/layerVisibility'

export const DieExportStage = forwardRef<Konva.Stage, { project: Project; layerVisibility?: ChipLayerVisibility }>(
  function DieExportStage({ project, layerVisibility }, ref) {
    return (
      <Stage ref={ref} width={project.die.width} height={project.die.height}>
        <Layer>
          <ChipArtwork project={project} renderMode="die-only" layerVisibility={layerVisibility} />
        </Layer>
      </Stage>
    )
  },
)
