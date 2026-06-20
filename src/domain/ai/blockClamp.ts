import type { BlockType } from '../project'

/**
 * The 16 real + fantasy block types the editor can render. This intentionally mirrors the inline
 * set in mapAiDraftToProject so M3 remains scoped to suggestion application; consolidating both
 * valid-output paths is deferred to a focused cleanup.
 */
export const KNOWN_BLOCK_TYPES: ReadonlySet<string> = new Set<BlockType>([
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

const MIN_SIZE = 24

function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo
  return Math.max(lo, Math.min(hi, value))
}

/** Converts a fractional block rect into a pixel rect clamped inside the die bounds. */
export function clampFractionalBlock(
  die: { width: number; height: number },
  frac: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const w = clamp(frac.w * die.width, MIN_SIZE, die.width)
  const h = clamp(frac.h * die.height, MIN_SIZE, die.height)
  const x = clamp(frac.x * die.width, 0, die.width - w)
  const y = clamp(frac.y * die.height, 0, die.height - h)
  return { x, y, w, h }
}
