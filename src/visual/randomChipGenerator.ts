import {
  CURRENT_SCHEMA_VERSION,
  type Block,
  type BlockCategory,
  type BlockType,
  type DieShape,
  type Project,
  type StyleTheme,
} from '../domain/project'

const REAL_BLOCKS: BlockType[] = ['CPU', 'GPU', 'DSP', 'SRAM', 'Cache', 'DAC', 'ADC', 'PLL', 'IO', 'USB']
const FANTASY_BLOCKS: BlockType[] = ['EmotionEngine', 'DreamSynth', 'QuantumMemory', 'ConsciousnessProcessor', 'RealityDistortionUnit', 'TimeCore']
const THEMES: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']
const SHAPES: DieShape[] = ['rect', 'square', 'circle', 'hexagon']

function hashSeed(seed: string) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createPrng(seed: string) {
  let state = hashSeed(seed) || 1
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

function integer(min: number, max: number, random: () => number) {
  return Math.floor(min + random() * (max - min + 1))
}

function createBlock(
  index: number,
  dieWidth: number,
  dieHeight: number,
  placementMargin: number,
  random: () => number,
): Omit<Block, 'id'> {
  const category: BlockCategory = random() > 0.72 ? 'fantasy' : 'real'
  const type = category === 'fantasy' ? pick(FANTASY_BLOCKS, random) : pick(REAL_BLOCKS, random)
  const w = integer(96, 230, random)
  const h = integer(54, 138, random)
  return {
    type,
    category,
    x: integer(placementMargin, Math.max(placementMargin, dieWidth - w - placementMargin), random),
    y: integer(placementMargin, Math.max(placementMargin, dieHeight - h - placementMargin), random),
    w,
    h,
    rotation: 0,
    glow: category === 'fantasy' || random() > 0.62,
    zIndex: index,
  }
}

export function generateRandomChipProject(seed: string, id: string = crypto.randomUUID(), now = Date.now()): Project {
  const random = createPrng(seed)
  const shape = pick(SHAPES, random)
  const size = shape === 'rect' ? { width: 940, height: 620 } : { width: 760, height: 760 }
  const theme = pick(THEMES, random)
  const blockCount = integer(7, 11, random)
  const placementMargin = shape === 'circle' || shape === 'hexagon' ? 180 : 48
  const blocks = Array.from({ length: blockCount }, (_, index) => ({
    ...createBlock(index, size.width, size.height, placementMargin, random),
    id: `${id}-block-${index}`,
  }))

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: `RANDOM CHIP ${seed.slice(0, 6).toUpperCase() || 'LOCAL'}`,
    createdAt: now,
    updatedAt: now,
    die: { shape, width: size.width, height: size.height, background: `random-${seed}` },
    blocks,
    decorations: [
      { id: `${id}-decoration-0`, kind: 'label', x: 56, y: 34, text: 'RANDOM FAB // SEED TRACE', zIndex: 0 },
      {
        id: `${id}-decoration-1`,
        kind: 'neonLine',
        points: [blocks[0].x + blocks[0].w / 2, blocks[0].y + blocks[0].h / 2, blocks[1].x + blocks[1].w / 2, blocks[1].y + blocks[1].h / 2],
        color: '#22d3ee',
        zIndex: 1,
      },
    ],
    theme,
    spec: {
      brand: 'RANDOM FAB',
      series: seed.slice(0, 6).toUpperCase() || 'LOCAL',
      generation: 'Seeded Layout',
      process: `${integer(1, 7, random)}nm procedural package`,
      cores: integer(8, 192, random),
      bandwidth: `${integer(320, 9600, random)} GB/s`,
      features: ['Seeded Layout', 'Procedural Blocks', 'Local JSON Project'],
      description: 'A deterministic random chip layout for fast visual exploration.',
    },
  }
}
