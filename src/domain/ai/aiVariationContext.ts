import type { DieShape, StyleTheme } from '../project'

/** Minimal source-chip context used to produce independent stylistic variations. */
export type AiVariationContext = {
  name?: string
  theme: StyleTheme
  dieShape: DieShape
  blocks: { type: string; x: number; y: number; w: number; h: number }[]
}
