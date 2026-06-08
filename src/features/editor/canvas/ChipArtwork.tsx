import { Fragment, useEffect, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type Konva from 'konva'
import { Circle, Group, Image as KonvaImage, Line, Rect, RegularPolygon, Shape, Star, Text } from 'react-konva'
import type { Block, Decoration, Die, Project, StudioColorPaint, StudioColorSettings, StudioSpray, StudioSticker } from '../../../domain/project'
import { resolveTheme, type ThemeTokens } from '../../../themes/themeTokens'
import { dieFillProps } from '../../../themes/gradients'
import { resolveBlockStyle, resolveDecorationStyle } from '../../../themes/resolveStyle'
import { buildChipLayers, type ChipLayerModel } from '../../../visual/chipLayers'
import { resolveMaterialRecipe, type ChipMaterialRecipe } from '../../../visual/materialRecipes'
import { resolveTileDetail, type TileDetail } from '../../../visual/tileDetail'
import {
  blockMicroLines,
  blockTexture,
  memoryCells,
  routingChannels,
  standardCellRows,
  type Cell,
  type MicroLine,
} from './blockTexture'
import { resolveStickerLayout } from './stickerLayout'
import { busBundle } from './busRouting'
import { blocksByZIndex } from './artworkLayout'
import { DEFAULT_LAYER_VISIBILITY, type ChipLayerVisibility } from '../layerVisibility'

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

function paintColor(paint: StudioColorPaint): string {
  return paint.mode === 'solid' ? paint.color : paint.from
}

function paintRectProps(paint: StudioColorPaint, width: number, height: number) {
  if (paint.mode === 'solid') return { fill: paint.color }
  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: width, y: height },
    fillLinearGradientColorStops: [0, paint.from, 1, paint.to],
  }
}

function DieShape({ die, tokens, colors }: { die: Die; tokens: ThemeTokens; colors: StudioColorSettings }) {
  const gradient =
    colors.die.mode === 'solid'
      ? { fill: colors.die.color }
      : dieFillProps(die.shape, die.width, die.height, [
          { offset: 0, color: colors.die.from },
          { offset: 1, color: colors.die.to },
        ])
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
  colors,
}: {
  die: Die
  layers: ChipLayerModel
  recipe: ChipMaterialRecipe
  colors: StudioColorSettings
}) {
  const { bounds, radius } = layers.package
  const packageFill = paintColor(colors.package)
  if (die.shape === 'circle') {
    return (
      <Circle
        x={die.width / 2}
        y={die.height / 2}
        radius={radius}
        fill={packageFill}
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
      {...paintRectProps(colors.package, bounds.width, bounds.height)}
      stroke={recipe.package.stroke}
      strokeWidth={1}
      shadowColor={recipe.package.shadowColor}
      shadowBlur={recipe.package.shadowBlur}
      shadowOpacity={recipe.package.shadowOpacity}
      listening={false}
    />
  )
}

// A bright thin seal ring just inside the die edge (plus corner fiducials / scribe
// ticks) is the single strongest "this is a die" cue. Mirrors DieShape per shape.
function SealRingLayer({ die, color }: { die: Die; color: string }) {
  const inset = 14
  const gap = 5
  const ring = { stroke: color, listening: false as const, shadowColor: color, shadowBlur: 4 }
  if (die.shape === 'circle') {
    const r = die.width / 2
    return (
      <Group listening={false}>
        <Circle x={r} y={die.height / 2} radius={r - inset} strokeWidth={2} opacity={0.72} {...ring} />
        <Circle x={r} y={die.height / 2} radius={r - inset - gap} strokeWidth={1} opacity={0.4} {...ring} />
      </Group>
    )
  }
  if (die.shape === 'hexagon') {
    const r = die.width / 2
    return (
      <Group listening={false}>
        <RegularPolygon x={r} y={die.height / 2} sides={6} radius={r - inset} strokeWidth={2} opacity={0.72} {...ring} />
        <RegularPolygon x={r} y={die.height / 2} sides={6} radius={r - inset - gap} strokeWidth={1} opacity={0.4} {...ring} />
      </Group>
    )
  }
  const fid = 11
  const corners: [number, number][] = [
    [inset, inset],
    [die.width - inset, inset],
    [inset, die.height - inset],
    [die.width - inset, die.height - inset],
  ]
  return (
    <Group listening={false}>
      <Rect x={inset} y={inset} width={die.width - inset * 2} height={die.height - inset * 2} strokeWidth={2} opacity={0.72} {...ring} />
      <Rect x={inset + gap} y={inset + gap} width={die.width - (inset + gap) * 2} height={die.height - (inset + gap) * 2} strokeWidth={1} opacity={0.4} {...ring} />
      {corners.map(([cx, cy], index) => (
        <Fragment key={index}>
          <Line points={[cx - fid, cy, cx + fid, cy]} strokeWidth={1.3} opacity={0.8} {...ring} />
          <Line points={[cx, cy - fid, cx, cy + fid]} strokeWidth={1.3} opacity={0.8} {...ring} />
        </Fragment>
      ))}
    </Group>
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
  return (
    <Group name="chip-layer-grid" clipFunc={(context) => clipForDie(context, die)}>
      {lines}
    </Group>
  )
}

function MaterialMicroLayer({
  die,
  layers,
  colors,
}: {
  die: Die
  layers: ChipLayerModel
  colors: StudioColorSettings
}) {
  const tileColor = paintColor(colors.tile)
  return (
    <Group name="chip-layer-micro" clipFunc={(context) => clipForDie(context, die)} listening={false}>
      {layers.microTiles.map((tile) => (
        <Rect
          key={tile.id}
          x={tile.bounds.x}
          y={tile.bounds.y}
          width={tile.bounds.width}
          height={tile.bounds.height}
          fill={tileColor}
          stroke={tileColor}
          strokeWidth={0.5}
          opacity={tile.opacity}
        />
      ))}
    </Group>
  )
}

function TraceLayer({ die, layers, colors }: { die: Die; layers: ChipLayerModel; colors: StudioColorSettings }) {
  const traceColor = paintColor(colors.trace)
  return (
    <Group name="chip-layer-traces" clipFunc={(context) => clipForDie(context, die)} listening={false}>
      {layers.traces.map((trace) => (
        <Line
          key={trace.id}
          points={trace.points}
          stroke={traceColor}
          strokeWidth={trace.width}
          opacity={trace.opacity}
          lineCap="round"
          shadowColor={traceColor}
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

function SoCPeripheryLayer({ project, colors }: { project: Project; colors: StudioColorSettings }) {
  const markColor = paintColor(colors.mark)
  const traceColor = paintColor(colors.trace)
  const blockBounds = project.blocks.length
    ? project.blocks.reduce(
        (bounds, block) => ({
          minX: Math.min(bounds.minX, block.x),
          minY: Math.min(bounds.minY, block.y),
          maxX: Math.max(bounds.maxX, block.x + block.w),
          maxY: Math.max(bounds.maxY, block.y + block.h),
        }),
        { minX: project.die.width, minY: project.die.height, maxX: 0, maxY: 0 },
      )
    : { minX: project.die.width * 0.36, minY: project.die.height * 0.36, maxX: project.die.width * 0.64, maxY: project.die.height * 0.64 }

  const devices = []
  const rows = 5
  const cols = 12
  const pad = 18
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const topX = pad + col * ((project.die.width - pad * 2) / Math.max(1, cols - 1))
      const topY = pad + row * 14
      const bottomY = project.die.height - pad - row * 14
      devices.push(<Rect key={`top-${row}-${col}`} x={topX} y={topY} width={8} height={4} fill={markColor} opacity={0.22} listening={false} />)
      devices.push(<Rect key={`bottom-${row}-${col}`} x={topX} y={bottomY} width={8} height={4} fill={markColor} opacity={0.18} listening={false} />)
    }
  }

  const rails = [
    [16, Math.max(24, blockBounds.minY - 20), project.die.width - 16, Math.max(24, blockBounds.minY - 20)],
    [16, Math.min(project.die.height - 24, blockBounds.maxY + 20), project.die.width - 16, Math.min(project.die.height - 24, blockBounds.maxY + 20)],
    [Math.max(24, blockBounds.minX - 20), 16, Math.max(24, blockBounds.minX - 20), project.die.height - 16],
    [Math.min(project.die.width - 24, blockBounds.maxX + 20), 16, Math.min(project.die.width - 24, blockBounds.maxX + 20), project.die.height - 16],
  ]

  return (
    <Group name="chip-layer-periphery" clipFunc={(context) => clipForDie(context, project.die)} listening={false}>
      {devices}
      {rails.map((points, index) => (
        <Line key={`soc-rail-${index}`} points={points} stroke={traceColor} strokeWidth={1.1} opacity={0.26} dash={[10, 6]} />
      ))}
      {Array.from({ length: 28 }, (_, index) => {
        const x = 24 + (index % 14) * ((project.die.width - 48) / 13)
        const y = index < 14 ? 74 : project.die.height - 84
        return (
          <Group key={`transistor-${index}`} x={x} y={y} listening={false} opacity={0.32}>
            <Line points={[-6, 0, 6, 0]} stroke={markColor} strokeWidth={0.8} />
            <Line points={[0, -6, 0, 6]} stroke={markColor} strokeWidth={0.8} />
            <Circle radius={2} fill={traceColor} opacity={0.5} />
          </Group>
        )
      })}
    </Group>
  )
}

function BusInterconnectLayer({ project, colors }: { project: Project; colors: StudioColorSettings }) {
  const traceColor = paintColor(colors.trace)
  const compute = project.blocks.filter((block) => ['CPU', 'GPU', 'DSP', 'ConsciousnessProcessor'].includes(block.type))
  const memory = project.blocks.filter((block) => ['SRAM', 'Cache', 'QuantumMemory'].includes(block.type))
  const io = project.blocks.filter((block) => ['IO', 'USB', 'DAC', 'ADC', 'PLL'].includes(block.type))
  const source = compute[0] ?? project.blocks[0]
  if (!source) return null
  const from = { x: source.x + source.w / 2, y: source.y + source.h / 2 }
  const targets = [
    ...memory.slice(0, 3).map((target) => ({ target, kind: 'memory' as const })),
    ...io.slice(0, 3).map((target) => ({ target, kind: 'io' as const })),
  ]
  return (
    <Group name="chip-layer-bus" clipFunc={(context) => clipForDie(context, project.die)} listening={false}>
      {targets.map(({ target, kind }) => {
        const to = { x: target.x + target.w / 2, y: target.y + target.h / 2 }
        // Memory buses are wide multi-wire bundles; IO links are thin.
        const bundle = busBundle(from, to, { wires: kind === 'memory' ? 5 : 2, spacing: kind === 'memory' ? 3 : 4 })
        const width = kind === 'memory' ? 1.4 : 1.1
        const opacity = kind === 'memory' ? 0.6 : 0.42
        const viaCells = bundle.vias.map((via) => ({ x: via.x - 1.5, y: via.y - 1.5, w: 3, h: 3 }))
        return (
          <Fragment key={`bus-${source.id}-${target.id}`}>
            <LinePattern
              lines={bundle.wires.map((points) => ({ points, opacity }))}
              color={traceColor}
              opacity={opacity}
              width={width}
            />
            <CellPattern cells={viaCells} color={traceColor} opacity={Math.min(0.85, opacity + 0.2)} />
          </Fragment>
        )
      })}
    </Group>
  )
}

function ReadoutLayer({ layers, recipe, colors }: { layers: ChipLayerModel; recipe: ChipMaterialRecipe; colors: StudioColorSettings }) {
  const labelColor = paintColor(colors.label)
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
          fill={labelColor || recipe.readoutLabel.subduedColor}
        />
      ))}
    </Group>
  )
}

function DecorationNode({ decoration, tokens, colors }: { decoration: Decoration; tokens: ThemeTokens; colors: StudioColorSettings }) {
  const style = resolveDecorationStyle(decoration, tokens)
  const markColor = paintColor(decoration.kind === 'label' ? colors.label : colors.mark)
  switch (decoration.kind) {
    case 'neonLine': {
      const traceColor = paintColor(colors.trace)
      return (
        <Line
          points={decoration.points}
          stroke={traceColor}
          strokeWidth={style.strokeWidth}
          shadowColor={traceColor}
          shadowBlur={style.shadowBlur}
          lineCap="round"
          globalCompositeOperation={style.blend}
          listening={false}
        />
      )
    }
    case 'warningMark':
      return (
        <Group x={decoration.x} y={decoration.y} listening={false}>
          <RegularPolygon
            sides={3}
            radius={18}
            stroke={markColor}
            strokeWidth={style.strokeWidth}
            shadowColor={markColor}
            shadowBlur={style.shadowBlur}
          />
          <Text x={-3} y={-6} text="!" fontStyle="bold" fontSize={16} fill={markColor} />
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
          fill={markColor}
          listening={false}
        />
      )
    case 'sciFiObject':
      return (
        <Circle
          x={decoration.x}
          y={decoration.y}
          radius={10}
          stroke={markColor}
          strokeWidth={style.strokeWidth}
          listening={false}
        />
      )
  }
}

// Many cells in ONE Konva node: a single canvas fill op keeps dense fabrication
// texture cheap (and it still rasterizes into the PNG export via toDataURL).
function CellPattern({ cells, color, opacity }: { cells: Cell[]; color: string; opacity: number }) {
  if (cells.length === 0) return null
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      fill={color}
      opacity={opacity}
      sceneFunc={(context, shape) => {
        context.beginPath()
        for (const cell of cells) context.rect(cell.x, cell.y, cell.w, cell.h)
        context.fillStrokeShape(shape)
      }}
    />
  )
}

// Many parallel routing lines in ONE node.
function LinePattern({
  lines,
  color,
  opacity,
  width = 1,
}: {
  lines: MicroLine[]
  color: string
  opacity: number
  width?: number
}) {
  if (lines.length === 0) return null
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      stroke={color}
      strokeWidth={width}
      opacity={opacity}
      lineCap="round"
      lineJoin="round"
      sceneFunc={(context, shape) => {
        context.beginPath()
        for (const line of lines) {
          context.moveTo(line.points[0], line.points[1])
          for (let index = 2; index < line.points.length; index += 2) {
            context.lineTo(line.points[index], line.points[index + 1])
          }
        }
        context.strokeShape(shape)
      }}
    />
  )
}

function TileTextureOverlay({
  block,
  tokens,
  stroke,
  colors,
  detail,
}: {
  block: Block
  tokens: ThemeTokens
  stroke: string
  colors: StudioColorSettings
  detail?: TileDetail
}) {
  const texture = blockTexture(block.type)
  const cell = detail?.contactCell ?? 10
  const gap = detail?.contactGap ?? 4
  const midX = block.w / 2
  const midY = block.h / 2
  const accent = block.colorOverride ?? paintColor(colors.tile)
  const subdued = tokens.accents[1] ?? stroke

  if (texture.family === 'memory') {
    return (
      <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)} listening={false}>
        <CellPattern cells={memoryCells(block.w, block.h, cell, gap)} color={accent} opacity={0.2} />
      </Group>
    )
  }

  if (texture.family === 'compute') {
    const coreW = Math.max(24, block.w * 0.42)
    const coreH = Math.max(20, block.h * 0.42)
    return (
      <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)} listening={false}>
        {/* Logic standard-cell rows fill the region; a central core + H-tree bus reads as the unit. */}
        <CellPattern cells={standardCellRows(block.w, block.h)} color={accent} opacity={0.16} />
        <Rect
          x={midX - coreW / 2}
          y={midY - coreH / 2}
          width={coreW}
          height={coreH}
          cornerRadius={3}
          fill={accent}
          opacity={0.2}
          stroke={accent}
          strokeWidth={1}
        />
        <Line points={[12, midY, block.w - 12, midY]} stroke={accent} strokeWidth={1.2} opacity={0.32} />
        <Line points={[midX, 10, midX, block.h - 10]} stroke={accent} strokeWidth={1.2} opacity={0.32} />
      </Group>
    )
  }

  if (texture.family === 'parallel') {
    // Dense woven metal: tight vertical SIMD lanes crossed by sparser horizontal rails.
    return (
      <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)} listening={false}>
        <LinePattern lines={routingChannels(block.w, block.h, { stride: 7, axis: 'v' })} color={accent} opacity={0.3} />
        <LinePattern lines={routingChannels(block.w, block.h, { stride: 16, axis: 'h' })} color={subdued} opacity={0.16} />
      </Group>
    )
  }

  if (texture.family === 'signal') {
    const waves = Array.from({ length: 3 }, (_, index) => midY - 18 + index * 18)
    return (
      <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)} listening={false}>
        <LinePattern lines={routingChannels(block.w, block.h, { stride: 9, axis: 'h' })} color={subdued} opacity={0.12} />
        {waves.map((y, index) => (
          <Line
            key={index}
            points={[8, y, block.w * 0.2, y - 10, block.w * 0.4, y + 10, block.w * 0.6, y - 10, block.w * 0.8, y + 10, block.w - 8, y]}
            stroke={index === 1 ? accent : stroke}
            strokeWidth={1.3}
            opacity={index === 1 ? 0.68 : 0.34}
            tension={0.36}
          />
        ))}
      </Group>
    )
  }

  if (texture.family === 'analog') {
    const steps = Array.from({ length: 5 }, (_, index) => 12 + index * Math.max(12, block.w / 6))
    return (
      <Group listening={false}>
        {steps.map((x, index) => (
          <Line
            key={index}
            points={[x, block.h - 12, x, 16, x + 10, 16, x + 10, block.h - 26]}
            stroke={index % 2 === 0 ? accent : stroke}
            strokeWidth={1.2}
            opacity={0.52}
          />
        ))}
      </Group>
    )
  }

  if (texture.family === 'clock') {
    return (
      <Group listening={false}>
        <Circle x={midX} y={midY} radius={Math.min(block.w, block.h) * 0.28} stroke={accent} strokeWidth={2.1} opacity={0.62} />
        <Circle x={midX} y={midY} radius={Math.min(block.w, block.h) * 0.16} stroke={stroke} strokeWidth={1} opacity={0.32} />
        <Line points={[midX, midY, block.w - 14, midY]} stroke={accent} strokeWidth={1.4} opacity={0.48} />
        <Line points={[midX, midY, midX, 14]} stroke={accent} strokeWidth={1.4} opacity={0.48} />
      </Group>
    )
  }

  if (texture.family === 'io') {
    const pads = Math.max(3, Math.floor(block.h / 18))
    return (
      <Group listening={false}>
        {Array.from({ length: pads }, (_, index) => {
          const y = 10 + index * ((block.h - 20) / Math.max(1, pads - 1))
          return (
            <Fragment key={index}>
              <Rect x={4} y={y - 4} width={12} height={8} fill={accent} opacity={0.28} />
              <Rect x={block.w - 16} y={y - 4} width={12} height={8} fill={accent} opacity={0.28} />
              <Line points={[16, y, block.w - 16, y]} stroke={stroke} strokeWidth={0.9} opacity={0.16} />
            </Fragment>
          )
        })}
      </Group>
    )
  }

  if (texture.family === 'expressive') {
    return (
      <Group listening={false}>
        <Line points={[12, midY, midX - 24, midY, midX - 14, midY - 18, midX, midY + 18, midX + 16, midY - 14, midX + 28, midY, block.w - 12, midY]} stroke={accent} strokeWidth={2} opacity={0.5} tension={0.2} />
        <Circle x={midX - 26} y={midY - 20} radius={8} fill={accent} opacity={0.18} />
        <Circle x={midX + 30} y={midY + 18} radius={10} fill={subdued} opacity={0.14} />
      </Group>
    )
  }

  if (texture.family === 'synthesis') {
    const bars = Array.from({ length: 7 }, (_, index) => index)
    return (
      <Group listening={false}>
        {bars.map((index) => {
          const x = 14 + index * ((block.w - 28) / Math.max(1, bars.length - 1))
          const h = 14 + ((index * 11) % Math.max(16, block.h - 24))
          return <Rect key={index} x={x - 3} y={block.h - h - 8} width={6} height={h} fill={index % 2 ? subdued : accent} opacity={0.28} />
        })}
      </Group>
    )
  }

  if (texture.family === 'awareness') {
    return (
      <Group listening={false}>
        <Circle x={midX} y={midY} radius={Math.min(block.w, block.h) * 0.3} stroke={accent} strokeWidth={1.4} opacity={0.42} />
        <Circle x={midX} y={midY} radius={Math.min(block.w, block.h) * 0.18} fill={accent} opacity={0.14} />
        <Star x={midX} y={midY} numPoints={8} innerRadius={Math.min(block.w, block.h) * 0.1} outerRadius={Math.min(block.w, block.h) * 0.26} stroke={subdued} strokeWidth={1} opacity={0.34} />
      </Group>
    )
  }

  if (texture.family === 'distortion') {
    return (
      <Group clipFunc={(context) => context.rect(0, 0, block.w, block.h)} listening={false}>
        <RegularPolygon x={midX - 18} y={midY} sides={4} radius={Math.min(block.w, block.h) * 0.24} stroke={accent} strokeWidth={1.3} opacity={0.38} rotation={24} />
        <RegularPolygon x={midX + 22} y={midY + 4} sides={5} radius={Math.min(block.w, block.h) * 0.22} stroke={subdued} strokeWidth={1.2} opacity={0.28} rotation={-16} />
        <Line points={[10, block.h - 12, block.w * 0.32, 14, block.w * 0.58, block.h - 18, block.w - 10, 18]} stroke={accent} strokeWidth={1.2} opacity={0.34} tension={0.16} />
      </Group>
    )
  }

  if (texture.family === 'temporal') {
    const radius = Math.min(block.w, block.h) * 0.28
    return (
      <Group listening={false}>
        <Circle x={midX} y={midY} radius={radius} stroke={accent} strokeWidth={1.6} opacity={0.44} />
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (Math.PI * 2 * index) / 8
          return (
            <Line
              key={index}
              points={[
                midX + Math.cos(angle) * radius * 0.68,
                midY + Math.sin(angle) * radius * 0.68,
                midX + Math.cos(angle) * radius,
                midY + Math.sin(angle) * radius,
              ]}
              stroke={index % 2 ? subdued : accent}
              strokeWidth={1}
              opacity={0.42}
            />
          )
        })}
      </Group>
    )
  }

  return null
}

export function BlockArtwork({
  block,
  tokens,
  selected = false,
  detail,
  colors,
  showLabel = true,
  groupRef,
  groupProps,
}: {
  block: Block
  tokens: ThemeTokens
  selected?: boolean
  detail?: TileDetail
  colors?: StudioColorSettings
  showLabel?: boolean
  groupRef?: (node: Konva.Group | null) => void
  groupProps?: ComponentProps<typeof Group>
}) {
  const style = resolveBlockStyle(block, tokens, selected)
  const blockFill = block.colorOverride ?? (colors ? paintColor(colors.block) : style.fill)
  const labelFill = colors ? paintColor(colors.label) : tokens.text
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
        cornerRadius={2}
        fill={blockFill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        shadowColor={style.shadowColor}
        shadowBlur={style.shadowBlur}
        shadowOpacity={style.shadowOpacity}
      />
      <TileTextureOverlay block={block} tokens={tokens} stroke={style.stroke} colors={colors ?? {
        background: { mode: 'solid', color: tokens.background[0].color },
        package: { mode: 'solid', color: tokens.background[0].color },
        die: { mode: 'solid', color: tokens.dieFill[0].color },
        block: { mode: 'solid', color: style.fill },
        tile: { mode: 'solid', color: tokens.accents[0] },
        trace: { mode: 'solid', color: tokens.accents[0] },
        label: { mode: 'solid', color: tokens.text },
        mark: { mode: 'solid', color: tokens.accents[0] },
      }} detail={detail} />
      {block.imageDataUrl ? <BlockImageOverlay block={block} /> : null}
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
      {/* Thin inner channel so abutting tiles read as a packed floorplan, not separated cards. */}
      <Rect
        x={1.5}
        y={1.5}
        width={Math.max(0, block.w - 3)}
        height={Math.max(0, block.h - 3)}
        cornerRadius={1}
        stroke="#05080d"
        strokeWidth={1}
        opacity={0.45}
        listening={false}
      />
      {showLabel ? (
        <Text
          x={8}
          y={7}
          text={(block.label ?? block.type).toUpperCase()}
          fontSize={10}
          letterSpacing={1.2}
          opacity={0.66}
          fill={labelFill}
          listening={false}
        />
      ) : null}
    </Group>
  )
}

function BlockImageOverlay({ block }: { block: Block }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!block.imageDataUrl) {
      setImage(null)
      return
    }
    let cancelled = false
    const nextImage = new window.Image()
    const handleLoad = () => {
      if (!cancelled) setImage(nextImage)
    }
    nextImage.addEventListener('load', handleLoad)
    nextImage.src = block.imageDataUrl
    return () => {
      cancelled = true
      nextImage.removeEventListener('load', handleLoad)
    }
  }, [block.imageDataUrl])

  if (!image) return null
  return (
    <KonvaImage
      image={image}
      x={6}
      y={6}
      width={Math.max(1, block.w - 12)}
      height={Math.max(1, block.h - 12)}
      opacity={0.86}
      cornerRadius={4}
      listening={false}
    />
  )
}

type Props = {
  project: Project
  renderMode?: 'full' | 'die-only'
  layerVisibility?: ChipLayerVisibility
  renderBlock?: (block: Block, tokens: ThemeTokens) => ReactNode
  renderStudioSpray?: (spray: StudioSpray) => ReactNode
  renderStudioSticker?: (sticker: StudioSticker) => ReactNode
}

export function ChipArtwork({
  project,
  renderMode = 'full',
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  renderBlock,
  renderStudioSpray,
  renderStudioSticker,
}: Props) {
  const tokens = resolveTheme(project.theme)
  const recipe = resolveMaterialRecipe(project.theme)
  const layers = buildChipLayers(project)
  const detail = resolveTileDetail(project.studio.tileSettings)
  const colors = project.studio.colorSettings
  return (
    <>
      {layerVisibility.M5 && renderMode === 'full' ? (
        <PackageShape die={project.die} layers={layers} recipe={recipe} colors={colors} />
      ) : null}
      {layerVisibility.M5 ? <DieShape die={project.die} tokens={tokens} colors={colors} /> : null}
      {layerVisibility.M5 ? <SealRingLayer die={project.die} color={tokens.dieStroke} /> : null}
      {layerVisibility.M5 ? <SoCPeripheryLayer project={project} colors={colors} /> : null}
      {layerVisibility.M1 ? <MaterialMicroLayer die={project.die} layers={layers} colors={colors} /> : null}
      {layerVisibility.M1 ? <GridLines die={project.die} tokens={tokens} /> : null}
      {layerVisibility.M2 ? <TraceLayer die={project.die} layers={layers} colors={colors} /> : null}
      {layerVisibility.M2 ? <BusInterconnectLayer project={project} colors={colors} /> : null}
      {layerVisibility.M3
        ? blocksByZIndex(project.blocks).map((block) => (
            <Fragment key={block.id}>
              {renderBlock?.(block, tokens) ?? (
                <BlockArtwork
                  block={block}
                  tokens={tokens}
                  detail={detail}
                  colors={colors}
                  showLabel={layerVisibility.Label}
                />
              )}
            </Fragment>
          ))
        : null}
      {/*
        Decorations (labels, warning marks, neon routing lines) are an intentional
        overlay: they always render ABOVE every block and are z-sorted only among
        themselves. This is by design for v1 so annotations stay legible on top of
        the die. The editor and both export stages share this component, so posters
        match the editor exactly.
      */}
      {layerVisibility.M4
        ? project.decorations
            .slice()
            .sort((left, right) => left.zIndex - right.zIndex)
            .filter((decoration) => layerVisibility.Label || decoration.kind !== 'label')
            .map((decoration) => (
              <DecorationNode key={decoration.id} decoration={decoration} tokens={tokens} colors={colors} />
            ))
        : null}
      {layerVisibility.M4 ? <StudioSprayLayer project={project} renderStudioSpray={renderStudioSpray} /> : null}
      {layerVisibility.M4 ? <StudioStickerLayer project={project} renderStudioSticker={renderStudioSticker} /> : null}
      {layerVisibility.Label ? <ReadoutLayer layers={layers} recipe={recipe} colors={colors} /> : null}
      {layerVisibility.M5 ? <GlassGlowOverlay die={project.die} layers={layers} /> : null}
    </>
  )
}
