import type { DieShape } from '../project'

/** One AI-suggested new block. x/y/w/h are fractions of the die, in [0, 1]. */
export type AiLayoutSuggestion = {
  type: string
  label?: string
  reason?: string
  x: number
  y: number
  w: number
  h: number
}

/** The current chip layout the AI reasons over when suggesting additions. */
export type AiLayoutContext = {
  dieShape: DieShape
  blocks: { type: string; x: number; y: number; w: number; h: number }[]
}
