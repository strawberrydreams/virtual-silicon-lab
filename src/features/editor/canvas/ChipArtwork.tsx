import { Fragment } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type Konva from 'konva'
import { Circle, Group, Line, Rect, RegularPolygon, Star, Text } from 'react-konva'
import type { Block, Decoration, Die, Project, StudioSpray, StudioSticker } from '../../../domain/project'
import { resolveTheme, type ThemeTokens } from '../../../themes/themeTokens'
import { dieFillProps } from '../../../themes/gradients'
import { resolveBlockStyle, resolveDecorationStyle } from '../../../themes/resolveStyle'
import { buildChipLayers, type ChipLayerModel } from '../../../visual/chipLayers'
import { resolveMaterialRecipe, type ChipMaterialRecipe } from '../../../visual/materialRecipes'
import { resolveTileDetail, type TileDetail } from '../../../visual/tileDetail'
import { blockMicroLines, blockVisual, memoryCells } from './blockTexture'
import { resolveStickerLayout } from './stickerLayout'
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
  recipe: ChipMaterialRecipe
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

function MaterialMicroLayer({
  die,
  layers,
  recipe,
}: {
  die: Die
  layers: ChipLayerModel
  recipe: ChipMaterialRecipe
}) {
  return (
    <Group clipFunc={(context) => clipForDie(context, die)} listening={false}>
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

function TraceLayer({ die, layers }: { die: Die; layers: ChipLayerModel }) {
  return (
    <Group clipFunc={(context) => clipForDie(context, die)} listening={false}>
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

function GlassGlowOverlay({ die, layers }: { die: Die; layers: ChipLayerModel }) {
  const glow = layers.glowOverlay
  return (
    <Group clipFunc={(context) => clipForDie(context, die)} listening={false}>
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

export function StudioSprayArtwork({
  spray,
  selected = false,
  groupRef,
  groupProps,
}: {
  spray: StudioSpray
  selected?: boolean
  groupRef?: (node: Konva.Group | null) => void
  groupProps?: ComponentProps<typeof Group>
}) {
  return (
    <Group
      ref={groupRef}
      name="studio-spray"
      x={spray.x}
      y={spray.y}
      listening={groupProps !== undefined}
      {...groupProps}
    >
      <Circle
        radius={spray.radius}
        fill={spray.color}
        opacity={Math.min(0.72, spray.intensity * 0.62)}
        shadowColor={spray.color}
        shadowBlur={Math.max(16, spray.radius * 0.34)}
        globalCompositeOperation={spray.blend}
      />
      {selected ? (
        <Circle radius={spray.radius} stroke="#f9f4ff" strokeWidth={2} dash={[6, 6]} opacity={0.86} />
      ) : null}
    </Group>
  )
}

function StudioSprayLayer({
  project,
  renderStudioSpray,
}: {
  project: Project
  renderStudioSpray?: (spray: StudioSpray) => ReactNode
}) {
  if (project.studio.sprays.length === 0) return null
  return (
    <Group clipFunc={(context) => clipForDie(context, project.die)} listening={renderStudioSpray !== undefined}>
      {project.studio.sprays.map((spray) => (
        <Fragment key={spray.id}>{renderStudioSpray?.(spray) ?? <StudioSprayArtwork spray={spray} />}</Fragment>
      ))}
    </Group>
  )
}

export function StudioStickerArtwork({
  sticker,
  selected = false,
  groupRef,
  groupProps,
}: {
  sticker: StudioSticker
  selected?: boolean
  groupRef?: (node: Konva.Group | null) => void
  groupProps?: ComponentProps<typeof Group>
}) {
  const layout = resolveStickerLayout(sticker.kind, sticker.text)
  const stroke = selected ? '#ffffff' : '#0b1020'
  const strokeWidth = selected ? 3 : 2
  const shadow = { shadowColor: '#000000', shadowBlur: 12, shadowOpacity: 0.28 } as const
  return (
    <Group
      ref={groupRef}
      name="studio-sticker"
      x={sticker.x}
      y={sticker.y}
      rotation={sticker.rotation}
      listening={groupProps !== undefined}
      {...groupProps}
    >
      {layout.form === 'circle' ? (
        <Circle radius={26} fill={sticker.color} stroke={stroke} strokeWidth={strokeWidth} {...shadow} />
      ) : layout.form === 'star' ? (
        <Star numPoints={5} innerRadius={12} outerRadius={28} fill={sticker.color} stroke={stroke} strokeWidth={strokeWidth} {...shadow} />
      ) : layout.form === 'triangle' ? (
        <RegularPolygon sides={3} radius={30} fill={sticker.color} stroke={stroke} strokeWidth={strokeWidth} {...shadow} />
      ) : (
        <Rect
          x={-layout.width / 2}
          y={-layout.height / 2}
          width={layout.width}
          height={layout.height}
          cornerRadius={6}
          fill={sticker.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          {...shadow}
        />
      )}
      <Text
        x={-layout.width / 2}
        y={layout.form === 'triangle' ? 4 : -layout.fontSize / 2}
        width={layout.width}
        align="center"
        text={sticker.text}
        fontSize={layout.fontSize}
        fontStyle="bold"
        letterSpacing={layout.letterSpacing}
        fill="#0b1020"
      />
    </Group>
  )
}

function StudioStickerLayer({
  project,
  renderStudioSticker,
}: {
  project: Project
  renderStudioSticker?: (sticker: StudioSticker) => ReactNode
}) {
  if (project.studio.stickers.length === 0) return null
  return (
    <Group clipFunc={(context) => clipForDie(context, project.die)} listening={renderStudioSticker !== undefined}>
      {project.studio.stickers.map((sticker) => (
        <Fragment key={sticker.id}>
          {renderStudioSticker?.(sticker) ?? <StudioStickerArtwork sticker={sticker} />}
        </Fragment>
      ))}
    </Group>
  )
}

function ReadoutLayer({ layers, recipe }: { layers: ChipLayerModel; recipe: ChipMaterialRecipe }) {
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
  detail,
  groupRef,
  groupProps,
}: {
  block: Block
  tokens: ThemeTokens
  selected?: boolean
  detail?: TileDetail
  groupRef?: (node: Konva.Group | null) => void
  groupProps?: ComponentProps<typeof Group>
}) {
  const style = resolveBlockStyle(block, tokens, selected)
  const contactCell = detail?.contactCell ?? 10
  const contactGap = detail?.contactGap ?? 4
  const blockStride = detail?.blockStride ?? 18
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
          {memoryCells(block.w, block.h, contactCell, contactGap).map((cell, index) => (
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
        {blockMicroLines(block.w, block.h, blockStride).map((line, index) => (
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
  renderMode?: 'full' | 'die-only'
  renderBlock?: (block: Block, tokens: ThemeTokens) => ReactNode
  renderStudioSpray?: (spray: StudioSpray) => ReactNode
  renderStudioSticker?: (sticker: StudioSticker) => ReactNode
}

export function ChipArtwork({
  project,
  renderMode = 'full',
  renderBlock,
  renderStudioSpray,
  renderStudioSticker,
}: Props) {
  const tokens = resolveTheme(project.theme)
  const recipe = resolveMaterialRecipe(project.theme)
  const layers = buildChipLayers(project)
  const detail = resolveTileDetail(project.studio.tileSettings)
  return (
    <>
      {renderMode === 'full' ? <PackageShape die={project.die} layers={layers} recipe={recipe} /> : null}
      <DieShape die={project.die} tokens={tokens} />
      <MaterialMicroLayer die={project.die} layers={layers} recipe={recipe} />
      <GridLines die={project.die} tokens={tokens} />
      <TraceLayer die={project.die} layers={layers} />
      {blocksByZIndex(project.blocks).map((block) => (
        <Fragment key={block.id}>
          {renderBlock?.(block, tokens) ?? <BlockArtwork block={block} tokens={tokens} detail={detail} />}
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
      <StudioSprayLayer project={project} renderStudioSpray={renderStudioSpray} />
      <StudioStickerLayer project={project} renderStudioSticker={renderStudioSticker} />
      <ReadoutLayer layers={layers} recipe={recipe} />
      <GlassGlowOverlay die={project.die} layers={layers} />
    </>
  )
}
