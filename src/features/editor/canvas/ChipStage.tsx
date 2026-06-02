import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer } from 'react-konva'
import type { Block, Decoration, Die, Project } from '../../../domain/project'
import { snapToGrid } from './geometry'
import type { BlockTransform } from '../../../stores/editorStore'
import { zoomAtPointer } from './viewport'
import { resolveTheme, type ThemeTokens } from '../../../themes/themeTokens'
import { dieFillProps } from '../../../themes/gradients'
import { resolveBlockStyle, resolveDecorationStyle } from '../../../themes/resolveStyle'
import { blockVisual, memoryCells } from './blockTexture'

const STAGE_WIDTH = 960
const STAGE_HEIGHT = 640
const GRID = 16
const MIN_BLOCK = 48

type Props = {
  project: Project
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  onTransformBlock: (id: string, transform: BlockTransform) => void
}

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

export function ChipStage({ project, selectedBlockId, onSelectBlock, onTransformBlock }: Props) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const blockRefs = useRef(new Map<string, Konva.Rect>())
  const transformerRef = useRef<Konva.Transformer>(null)
  const tokens = resolveTheme(project.theme)

  useEffect(() => {
    const transformer = transformerRef.current
    if (transformer === null) return
    const node = selectedBlockId ? blockRefs.current.get(selectedBlockId) : undefined
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedBlockId, project.blocks])

  const sorted = project.blocks.slice().sort((left, right) => left.zIndex - right.zIndex)

  return (
    <div
      className="inline-block"
      style={{ backgroundColor: tokens.background[tokens.background.length - 1].color }}
    >
      <Stage
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onWheel={(event) => {
          event.evt.preventDefault()
          const stage = event.target.getStage()
          const pointer = stage?.getPointerPosition()
          if (!stage || !pointer) return
          const next = zoomAtPointer({
            pointer,
            stagePos: { x: stage.x(), y: stage.y() },
            oldScale: scale,
            deltaY: event.evt.deltaY,
          })
          setScale(next.scale)
          setPosition(next.pos)
        }}
        onDragEnd={(event) => {
          if (event.target === event.target.getStage()) {
            setPosition({ x: event.target.x(), y: event.target.y() })
          }
        }}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) onSelectBlock(null)
        }}
        className="border border-cyan-900"
      >
        <Layer>
          <DieShape die={project.die} tokens={tokens} />
          <GridLines die={project.die} tokens={tokens} />
          {sorted.map((block: Block) => {
            const style = resolveBlockStyle(block, tokens, block.id === selectedBlockId)
            return (
              <Rect
                key={block.id}
                ref={(node) => {
                  if (node) blockRefs.current.set(block.id, node)
                  else blockRefs.current.delete(block.id)
                }}
                x={block.x}
                y={block.y}
                width={block.w}
                height={block.h}
                rotation={block.rotation}
                cornerRadius={6}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                shadowColor={style.shadowColor}
                shadowBlur={style.shadowBlur}
                shadowOpacity={style.shadowOpacity}
                draggable
                onClick={() => onSelectBlock(block.id)}
                onTap={() => onSelectBlock(block.id)}
                onDragStart={() => onSelectBlock(block.id)}
                onDragEnd={(event) => {
                  onTransformBlock(block.id, {
                    x: snapToGrid(event.target.x(), GRID),
                    y: snapToGrid(event.target.y(), GRID),
                    w: block.w,
                    h: block.h,
                    rotation: block.rotation,
                  })
                }}
                onTransformEnd={(event) => {
                  const node = event.target as Konva.Rect
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()
                  node.scaleX(1)
                  node.scaleY(1)
                  onTransformBlock(block.id, {
                    x: node.x(),
                    y: node.y(),
                    w: Math.max(MIN_BLOCK, node.width() * scaleX),
                    h: Math.max(MIN_BLOCK, node.height() * scaleY),
                    rotation: node.rotation(),
                  })
                }}
              />
            )
          })}
          {sorted
            .filter((block) => blockVisual(block.type) === 'memory')
            .map((block) => (
              <Group
                key={`${block.id}-mem`}
                x={block.x}
                y={block.y}
                rotation={block.rotation}
                listening={false}
                clipFunc={(context) => context.rect(0, 0, block.w, block.h)}
              >
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
            ))}
          {sorted.map((block) => (
            <Text
              key={`${block.id}-label`}
              x={block.x + 12}
              y={block.y + 12}
              rotation={block.rotation}
              text={block.type}
              fontSize={13}
              fill={tokens.text}
              listening={false}
            />
          ))}
          {project.decorations
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((decoration) => (
              <DecorationNode key={decoration.id} decoration={decoration} tokens={tokens} />
            ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < MIN_BLOCK || newBox.height < MIN_BLOCK ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>
    </div>
  )
}
