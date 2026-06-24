import { buildBlock } from '../blockFactory'
import { defaultFinishForTheme } from '../material/chipFinish'
import { createProject } from '../projectFactory'
import type { BlockType, DieShape, Project, StyleTheme } from '../project'
import type { AiChipDraft } from './aiChipDraft'

const BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
  'CPU',
  'GPU',
  'DSP',
  'SRAM',
  'Cache',
  'DAC',
  'ADC',
  'PLL',
  'IO',
  'USB',
  'EmotionEngine',
  'DreamSynth',
  'QuantumMemory',
  'ConsciousnessProcessor',
  'RealityDistortionUnit',
  'TimeCore',
])

const DIE_SHAPES: ReadonlySet<string> = new Set<DieShape>(['rect', 'square', 'circle', 'hexagon'])

const THEMES: ReadonlySet<string> = new Set<StyleTheme>([
  'neon',
  'retro',
  'military',
  'keynote',
  'mono',
])

const MIN_SIZE = 24

function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo
  return Math.max(lo, Math.min(hi, value))
}

/**
 * Maps any AiChipDraft to a domain-valid Project. Unknown block types are dropped,
 * and every block is clamped inside the die's bounding box with a sequential z-order,
 * so adversarial AI output can never yield an invalid project. M0 uses a rectangular
 * bounding clamp for all die shapes (shape-aware clamping is deferred to a later milestone).
 */
export function mapAiDraftToProject(draft: AiChipDraft, id?: string, now?: number): Project {
  const name = draft.name?.trim() ? draft.name.trim() : 'AI Draft Chip'
  const project = createProject(name, id, now)
  const shape = DIE_SHAPES.has(draft.dieShape) ? draft.dieShape : 'rect'
  project.die = { ...project.die, shape }
  if (draft.theme !== undefined && THEMES.has(draft.theme)) {
    project.theme = draft.theme
    project.finish = defaultFinishForTheme(project.theme)
  }
  const { width, height } = project.die

  let z = 0
  for (const block of draft.blocks) {
    if (!BLOCK_TYPES.has(block.type)) continue
    const built = buildBlock(project, block.type as BlockType)
    const w = clamp(block.w * width, MIN_SIZE, width)
    const h = clamp(block.h * height, MIN_SIZE, height)
    const x = clamp(block.x * width, 0, width - w)
    const y = clamp(block.y * height, 0, height - h)
    project.blocks.push({
      ...built,
      x,
      y,
      w,
      h,
      label: block.label,
      zIndex: z,
    })
    z += 1
  }
  return project
}
