import type { DieShape } from '../project'

/** One block in an AI draft. x/y/w/h are fractions of the die, in [0, 1]. */
export type AiDraftBlock = {
  type: string
  label?: string
  x: number
  y: number
  w: number
  h: number
}

/** The constrained intermediate shape an AiProvider returns. */
export type AiChipDraft = {
  name?: string
  dieShape: DieShape
  blocks: AiDraftBlock[]
}
