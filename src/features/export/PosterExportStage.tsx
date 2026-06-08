import { forwardRef } from 'react'
import type Konva from 'konva'
import { Group, Layer, Rect, Stage, Text } from 'react-konva'
import type { Project } from '../../domain/project'
import { resolveTheme } from '../../themes/themeTokens'
import { linearGradientProps } from '../../themes/gradients'
import { ChipArtwork } from '../editor/canvas/ChipArtwork'
import type { ChipLayerVisibility } from '../editor/layerVisibility'
import { POSTER_EXPORT } from './exportLayout'
import { resolvePosterComposition, type PosterFormat } from './posterCompositions'

export const PosterExportStage = forwardRef<
  Konva.Stage,
  { project: Project; format?: PosterFormat; layerVisibility?: ChipLayerVisibility }
>(
  function PosterExportStage({ project, format = 'press-hero', layerVisibility }, ref) {
    const tokens = resolveTheme(project.theme)
    const composition = resolvePosterComposition(project.die, format)
    const chip = composition.chip
    return (
      <Stage ref={ref} width={POSTER_EXPORT.logicalWidth} height={POSTER_EXPORT.logicalHeight}>
        <Layer>
          <Rect
            width={POSTER_EXPORT.logicalWidth}
            height={POSTER_EXPORT.logicalHeight}
            {...linearGradientProps(POSTER_EXPORT.logicalWidth, POSTER_EXPORT.logicalHeight, tokens.background)}
          />
          <Rect
            x={composition.backgroundBand.x}
            y={composition.backgroundBand.y}
            width={composition.backgroundBand.width}
            height={composition.backgroundBand.height}
            fill={tokens.accents[0]}
            opacity={format === 'architecture-slide' ? 0.06 : 0.035}
          />
          {format === 'architecture-slide' ? (
            <>
              <Rect x={390} y={122} width={1} height={650} fill={tokens.gridColor} opacity={0.85} />
              <Rect x={1240} y={122} width={1} height={650} fill={tokens.gridColor} opacity={0.85} />
            </>
          ) : null}
          <Text
            x={composition.title.x}
            y={composition.title.y}
            text={project.spec.brand}
            fontSize={20}
            letterSpacing={8}
            fill={tokens.accents[0]}
          />
          <Text
            x={composition.title.x}
            y={composition.title.y + 36}
            text={project.name}
            width={composition.title.width}
            fontSize={composition.titleSize}
            fontStyle="bold"
            lineHeight={1.08}
            fill={tokens.text}
          />
          <Group x={chip.x} y={chip.y} scaleX={chip.scale} scaleY={chip.scale}>
            <ChipArtwork project={project} layerVisibility={layerVisibility} />
          </Group>
          <Group x={composition.specs.x} y={composition.specs.y}>
            <Text
              text={`${project.spec.series} // ${project.spec.generation}`}
              width={composition.specs.width}
              fontSize={composition.specSize + 4}
              fill={tokens.accents[0]}
            />
            <Text
              y={58}
              text={`PROCESS   ${project.spec.process}`}
              width={composition.specs.width}
              fontSize={composition.specSize}
              fill={tokens.text}
            />
            <Text
              y={98}
              text={`CORES     ${project.spec.cores}`}
              width={composition.specs.width}
              fontSize={composition.specSize}
              fill={tokens.text}
            />
            <Text
              y={138}
              text={`BANDWIDTH ${project.spec.bandwidth}`}
              width={composition.specs.width}
              fontSize={composition.specSize}
              fill={tokens.text}
            />
            <Text
              y={202}
              text={project.spec.features.map((feature) => `+ ${feature}`).join('\n')}
              width={composition.specs.width}
              fontSize={composition.specSize}
              lineHeight={1.7}
              fill={tokens.text}
            />
            <Text
              y={390}
              text={project.spec.description}
              width={composition.specs.width}
              fontSize={composition.specSize - 1}
              lineHeight={1.5}
              fill={tokens.text}
            />
          </Group>
          <Text
            x={composition.footer.x}
            y={composition.footer.y}
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
