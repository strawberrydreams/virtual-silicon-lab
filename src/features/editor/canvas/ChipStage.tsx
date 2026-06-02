import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { Circle, Group, Layer, Line, Rect, RegularPolygon, Stage, Text, Transformer } from 'react-konva'
import type { Block, Die, Project } from '../../../domain/project'
import { snapToGrid } from './geometry'
import type { BlockTransform } from '../../../stores/editorStore'
import { zoomAtPointer } from './viewport'

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

function DieShape({ die }: { die: Die }) {
  const fill = '#0b1d24'
  const stroke = '#22d3ee'
  if (die.shape === 'circle') {
    return <Circle x={die.width / 2} y={die.height / 2} radius={die.width / 2} fill={fill} stroke={stroke} />
  }
  if (die.shape === 'hexagon') {
    return (
      <RegularPolygon
        x={die.width / 2}
        y={die.height / 2}
        sides={6}
        radius={die.width / 2}
        rotation={-90}
        fill={fill}
        stroke={stroke}
      />
    )
  }
  return <Rect width={die.width} height={die.height} fill={fill} stroke={stroke} />
}

function GridLines({ die }: { die: Die }) {
  const lines = []
  for (let x = GRID; x < die.width; x += GRID) {
    lines.push(<Line key={`v-${x}`} points={[x, 0, x, die.height]} stroke="#0e2b34" strokeWidth={1} />)
  }
  for (let y = GRID; y < die.height; y += GRID) {
    lines.push(<Line key={`h-${y}`} points={[0, y, die.width, y]} stroke="#0e2b34" strokeWidth={1} />)
  }
  return <Group clipFunc={(context) => clipForDie(context, die)}>{lines}</Group>
}

export function ChipStage({ project, selectedBlockId, onSelectBlock, onTransformBlock }: Props) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const blockRefs = useRef(new Map<string, Konva.Rect>())
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    if (transformer === null) return
    const node = selectedBlockId ? blockRefs.current.get(selectedBlockId) : undefined
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedBlockId, project.blocks])

  const sorted = project.blocks.slice().sort((left, right) => left.zIndex - right.zIndex)

  return (
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
        <DieShape die={project.die} />
        <GridLines die={project.die} />
        {sorted.map((block: Block) => (
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
            fill={block.category === 'fantasy' ? '#312e81' : '#164e63'}
            stroke={block.id === selectedBlockId ? '#f0abfc' : block.category === 'fantasy' ? '#a78bfa' : '#67e8f9'}
            strokeWidth={block.id === selectedBlockId ? 2 : 1}
            shadowColor={block.glow ? '#22d3ee' : undefined}
            shadowBlur={block.glow ? 12 : 0}
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
        ))}
        {sorted.map((block) => (
          <Text
            key={`${block.id}-label`}
            x={block.x + 12}
            y={block.y + 12}
            rotation={block.rotation}
            text={block.type}
            fill="#ecfeff"
            listening={false}
          />
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
  )
}
