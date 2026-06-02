import type { Block, BlockType, Project } from './project'

const FANTASY_TYPES = new Set<BlockType>([
  'EmotionEngine',
  'DreamSynth',
  'QuantumMemory',
  'ConsciousnessProcessor',
  'RealityDistortionUnit',
  'TimeCore',
])

export function nextZIndex(blocks: Block[]): number {
  return blocks.reduce((max, block) => Math.max(max, block.zIndex + 1), 0)
}

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
    zIndex: nextZIndex(project.blocks),
  }
}
