import { forwardRef } from 'react'
import type Konva from 'konva'
import { Group, Layer, Rect, Stage, Text } from 'react-konva'
import type { Project } from '../../domain/project'
import { resolveTheme } from '../../themes/themeTokens'
import { linearGradientProps } from '../../themes/gradients'
import { ChipArtwork } from '../editor/canvas/ChipArtwork'
import { POSTER_EXPORT, posterChipPlacement } from './exportLayout'

export const PosterExportStage = forwardRef<Konva.Stage, { project: Project }>(
  function PosterExportStage({ project }, ref) {
    const tokens = resolveTheme(project.theme)
    const chip = posterChipPlacement(project.die)
    return (
      <Stage ref={ref} width={POSTER_EXPORT.logicalWidth} height={POSTER_EXPORT.logicalHeight}>
        <Layer>
          <Rect width={1600} height={900} {...linearGradientProps(1600, 900, tokens.background)} />
          <Text x={80} y={72} text={project.spec.brand} fontSize={22} letterSpacing={8} fill={tokens.text} />
          <Text x={80} y={108} text={project.name} fontSize={42} fontStyle="bold" fill={tokens.text} />
          <Group x={chip.x} y={chip.y} scaleX={chip.scale} scaleY={chip.scale}>
            <ChipArtwork project={project} />
          </Group>
          <Group x={1060} y={210}>
            <Text text={`${project.spec.series} // ${project.spec.generation}`} fontSize={22} fill={tokens.accents[0]} />
            <Text y={58} text={`PROCESS  ${project.spec.process}`} width={450} fontSize={18} fill={tokens.text} />
            <Text y={98} text={`CORES    ${project.spec.cores}`} width={450} fontSize={18} fill={tokens.text} />
            <Text y={138} text={`BANDWIDTH ${project.spec.bandwidth}`} width={450} fontSize={18} fill={tokens.text} />
            <Text
              y={202}
              text={project.spec.features.map((feature) => `+ ${feature}`).join('\n')}
              width={450}
              fontSize={18}
              lineHeight={1.7}
              fill={tokens.text}
            />
            <Text y={390} text={project.spec.description} width={450} fontSize={17} lineHeight={1.5} fill={tokens.text} />
          </Group>
          <Text
            x={80}
            y={840}
            text="VIRTUAL SILICON LAB // CONCEPT FABRICATION TERMINAL"
            fontSize={14}
            letterSpacing={3}
            fill={tokens.text}
            opacity={0.65}
          />
        </Layer>
      </Stage>
    )
  },
)
