import { Fragment } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type Konva from 'konva'
import { Circle, Group, Line, Rect, RegularPolygon, Text } from 'react-konva'
import type { Block, Decoration, Die, Project } from '../../../domain/project'
import { resolveTheme, type ThemeTokens } from '../../../themes/themeTokens'
import { dieFillProps } from '../../../themes/gradients'
import { resolveBlockStyle, resolveDecorationStyle } from '../../../themes/resolveStyle'
import { buildChipLayers, type ChipLayerModel } from '../../../visual/chipLayers'
import { resolveMaterialRecipe } from '../../../visual/materialRecipes'
import { blockMicroLines, blockVisual, memoryCells } from './blockTexture'
import { blocksByZIndex } from './artworkLayout'

const GRID = 16

function clipForDie(context: Konva.Context, die: Die) {
  const centerX = die.width / 2
  const centerY = die.height / 2
  if (die.shape === 'circle') {
    context.arc(centerX, centerY, die.width / 2, 0, Math.PI * 2)
    return
  }
  if (die.shape === 'hexagon') {
    const radius = die.width / 2
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      if (i === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.closePath()
    return
  }
  context.rect(0, 0, die.width, die.height)
}

function DieShape({ die, tokens }: { die: Die; tokens: ThemeTokens }) {
  const gradient = dieFillProps(die.shape, die.width, die.height, tokens.dieFill)
  const common = {
    ...gradient,
    stroke: tokens.dieStroke,
    strokeWidth: tokens.dieStrokeWidth,
    shadowColor: tokens.glow.shadowColor,
    shadowBlur: tokens.dieStrokeWidth * 6,
    shadowOpacity: 0.25,
  }
  if (die.shape === 'circle') {
    return <Circle x={die.width / 2} y={die.height / 2} radius={die.width / 2} {...common} />
  }
  if (die.shape === 'hexagon') {
    return <RegularPolygon x={die.width / 2} y={die.height / 2} sides={6} radius={die.width / 2} {...common} />
  }
  return <Rect width={die.width} height={die.height} {...common} />
}

function PackageShape({
  die,
  layers,
  recipe,
}: {
  die: Die
  layers: ChipLayerModel
  recipe: ReturnType<typeof resolveMaterialRecipe>
}) {
  const { bounds, radius } = layers.package
  if (die.shape === 'circle') {
    return (
      <Circle
        x={die.width / 2}
        y={die.height / 2}
        radius={radius}
        fill={recipe.package.fill}
        stroke={recipe.package.stroke}
        strokeWidth={1}
        shadowColor={recipe.package.shadowColor}
        shadowBlur={recipe.package.shadowBlur}
        shadowOpacity={recipe.package.shadowOpacity}
        listening={false}
      />
    )
  }
  return (
    <Rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      cornerRadius={radius}
      fill={recipe.package.fill}
      stroke={recipe.package.stroke}
      strokeWidth={1}
      shadowColor={recipe.package.shadowColor}
      shadowBlur={recipe.package.shadowBlur}
      shadowOpacity={recipe.package.shadowOpacity}
      listening={false}
    />
  )
}

function GridLines({ die, tokens }: { die: Die; tokens: ThemeTokens }) {
  const lines = []
  for (let x = GRID; x < die.width; x += GRID) {
    lines.push(<Line key={`v-${x}`} points={[x, 0, x, die.height]} stroke={tokens.gridColor} strokeWidth={1} />)
  }
  for (let y = GRID; y < die.height; y += GRID) {
    lines.push(<Line key={`h-${y}`} points={[0, y, die.width, y]} stroke={tokens.gridColor} strokeWidth={1} />)
  }
  return <Group clipFunc={(context) => clipForDie(context, die)}>{lines}</Group>
}

function MaterialMicroLayer({ project, layers }: { project: Project; layers: ChipLayerModel }) {
  const recipe = resolveMaterialRecipe(project.theme)
  return (
    <Group clipFunc={(context) => clipForDie(context, project.die)} listening={false}>
      {layers.microTiles.map((tile) => (
        <Rect
          key={tile.id}
          x={tile.bounds.x}
          y={tile.bounds.y}
          width={tile.bounds.width}
          height={tile.bounds.height}
          fill={recipe.microTile.fill}
          stroke={recipe.microTile.stroke}
          strokeWidth={0.5}
          opacity={tile.opacity}
        />
      ))}
    </Group>
  )
}

function TraceLayer({ project, layers }: { project: Project; layers: ChipLayerModel }) {
  return (
    <Group clipFunc={(context) => clipForDie(context, project.die)} listening={false}>
      {layers.traces.map((trace) => (
        <Line
          key={trace.id}
          points={trace.points}
          stroke={trace.color}
          strokeWidth={trace.width}
          opacity={trace.opacity}
          lineCap="round"
          shadowColor={trace.color}
          shadowBlur={6}
          globalCompositeOperation="lighter"
        />
      ))}
    </Group>
  )
}

function GlassGlowOverlay({ project, layers }: { project: Project; layers: ChipLayerModel }) {
  const glow = layers.glowOverlay
  return (
    <Group clipFunc={(context) => clipForDie(context, project.die)} listening={false}>
      <Rect
        x={glow.bounds.x}
        y={glow.bounds.y}
        width={glow.bounds.width}
        height={glow.bounds.height}
        fill={glow.color}
        opacity={glow.opacity}
        shadowColor={glow.color}
        shadowBlur={glow.blur}
        globalCompositeOperation="screen"
      />
    </Group>
  )
}

function ReadoutLayer({ project, layers }: { project: Project; layers: ChipLayerModel }) {
  const recipe = resolveMaterialRecipe(project.theme)
  return (
    <Group listening={false}>
      {layers.readoutLabels.map((label) => (
        <Text
          key={label.id}
          x={label.x}
          y={label.y}
          text={label.text}
          fontSize={11}
          letterSpacing={1}
          fill={recipe.readoutLabel.subduedColor}
        />
      ))}
    </Group>
  )
}

function DecorationNode({ decoration, tokens }: { decoration: Decoration; tokens: ThemeTokens }) {
  const style = resolveDecorationStyle(decoration, tokens)
  switch (decoration.kind) {
    case 'neonLine':
      return (
        <Line
          points={decoration.points}
          stroke={style.color}
          strokeWidth={style.strokeWidth}
          shadowColor={style.shadowColor}
          shadowBlur={style.shadowBlur}
          lineCap="round"
          globalCompositeOperation={style.blend}
          listening={false}
        />
      )
    case 'warningMark':
      return (
        <Group x={decoration.x} y={decoration.y} listening={false}>
          <RegularPolygon
            sides={3}
            radius={18}
            stroke={style.color}
            strokeWidth={style.strokeWidth}
            shadowColor={style.shadowColor}
            shadowBlur={style.shadowBlur}
          />
          <Text x={-3} y={-6} text="!" fontStyle="bold" fontSize={16} fill={style.color} />
        </Group>
      )
    case 'label':
      return (
        <Text
          x={decoration.x}
          y={decoration.y}
          text={decoration.text}
          fontSize={18}
          fontStyle="bold"
          letterSpacing={2}
          fill={style.color}
          listening={false}
        />
      )
    case 'sciFiObject':
      return (
        <Circle
          x={decoration.x}
          y={decoration.y}
          radius={10}
          stroke={style.color}
          strokeWidth={style.strokeWidth}
          listening={false}
        />
      )
  }
}

export function BlockArtwork({
  block,
  tokens,
  selected = false,
  groupRef,
  groupProps,
}: {
  block: Block
  tokens: ThemeTokens
  selected?: boolean
  groupRef?: (node: Konva.Group | null) => void
  groupProps?: ComponentProps<typeof Group>
}) {
  const style = resolveBlockStyle(block, tokens, selected)
  return (
    <Group
      ref={groupRef}
      x={block.x}
      y={block.y}
      rotation={block.rotation}
      listening={groupProps !== undefined}
      {...groupProps}
    >
      <Rect
        width={block.w}
        height={block.h}
        cornerRadius={6}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        shadowColor={style.shadowColor}
        shadowBlur={style.shadowBlur}
        shadowOpacity={style.shadowOpacity}
      />
      {blockVisual(block.type) === 'memory' ? (
        <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)}>
          {memoryCells(block.w, block.h).map((cell, index) => (
            <Rect
              key={index}
              x={cell.x}
              y={cell.y}
              width={cell.w}
              height={cell.h}
              fill={tokens.accents[0]}
              opacity={0.18}
            />
          ))}
        </Group>
      ) : null}
      <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)} listening={false}>
        {blockMicroLines(block.w, block.h).map((line, index) => (
          <Line
            key={index}
            points={line.points}
            stroke={style.stroke}
            strokeWidth={0.75}
            opacity={line.opacity}
          />
        ))}
      </Group>
      <Rect x={1} y={1} width={block.w - 2} height={1} fill="#ffffff" opacity={0.16} listening={false} />
      <Text x={12} y={12} text={block.label ?? block.type} fontSize={13} fill={tokens.text} />
    </Group>
  )
}

type Props = {
  project: Project
  renderBlock?: (block: Block, tokens: ThemeTokens) => ReactNode
}

export function ChipArtwork({ project, renderBlock }: Props) {
  const tokens = resolveTheme(project.theme)
  const recipe = resolveMaterialRecipe(project.theme)
  const layers = buildChipLayers(project)
  return (
    <>
      <PackageShape die={project.die} layers={layers} recipe={recipe} />
      <DieShape die={project.die} tokens={tokens} />
      <MaterialMicroLayer project={project} layers={layers} />
      <GridLines die={project.die} tokens={tokens} />
      <TraceLayer project={project} layers={layers} />
      {blocksByZIndex(project.blocks).map((block) => (
        <Fragment key={block.id}>
          {renderBlock?.(block, tokens) ?? <BlockArtwork block={block} tokens={tokens} />}
        </Fragment>
      ))}
      {/*
        Decorations (labels, warning marks, neon routing lines) are an intentional
        overlay: they always render ABOVE every block and are z-sorted only among
        themselves. This is by design for v1 so annotations stay legible on top of
        the die. The editor and both export stages share this component, so posters
        match the editor exactly.
      */}
      {project.decorations
        .slice()
        .sort((left, right) => left.zIndex - right.zIndex)
        .map((decoration) => (
          <DecorationNode key={decoration.id} decoration={decoration} tokens={tokens} />
        ))}
      <ReadoutLayer project={project} layers={layers} />
      <GlassGlowOverlay project={project} layers={layers} />
    </>
  )
}
