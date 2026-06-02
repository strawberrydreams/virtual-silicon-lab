import { Layer, Rect, Stage, Text } from 'react-konva'
import type { Block, BlockType, Project } from '../../../domain/project'
import { clampBlockToRect, snapToGrid } from './geometry'

const FANTASY_TYPES = new Set<BlockType>([
  'EmotionEngine',
  'DreamSynth',
  'QuantumMemory',
  'ConsciousnessProcessor',
  'RealityDistortionUnit',
  'TimeCore',
])

export function buildBlock(
  project: Project,
  type: BlockType,
  id: string = crypto.randomUUID(),
): Block {
  return {
    id,
    type,
    category: FANTASY_TYPES.has(type) ? 'fantasy' : 'real',
    x: 32,
    y: 32,
    w: 192,
    h: 112,
    rotation: 0,
    glow: true,
    zIndex: project.blocks.length,
  }
}

type Props = {
  project: Project
  updateBlock: (block: Block) => void
}

export function ChipStage({ project, updateBlock }: Props) {
  return (
    <Stage width={960} height={640}>
      <Layer>
        <Rect width={project.die.width} height={project.die.height} fill="#0b1d24" stroke="#22d3ee" />
        {project.blocks
          .slice()
          .sort((left, right) => left.zIndex - right.zIndex)
          .map((block) => (
            <Rect
              key={block.id}
              x={block.x}
              y={block.y}
              width={block.w}
              height={block.h}
              fill={block.category === 'fantasy' ? '#312e81' : '#164e63'}
              stroke={block.category === 'fantasy' ? '#a78bfa' : '#67e8f9'}
              draggable
              onDragEnd={(event) => {
                const position = clampBlockToRect(
                  {
                    x: snapToGrid(event.target.x(), 16),
                    y: snapToGrid(event.target.y(), 16),
                    w: block.w,
                    h: block.h,
                  },
                  project.die,
                )
                updateBlock({ ...block, ...position })
              }}
            />
          ))}
        {project.blocks.map((block) => (
          <Text key={`${block.id}-label`} x={block.x + 12} y={block.y + 12} text={block.type} fill="#ecfeff" />
        ))}
      </Layer>
    </Stage>
  )
}
