import type { DieShape, StyleTheme } from '../project'

/** A loose, AI-produced spec. All fields optional — the mapper coerces and fills defaults. */
export type AiSpecDraft = {
  brand?: string
  series?: string
  generation?: string
  process?: string
  cores?: number
  bandwidth?: string
  features?: string[]
  description?: string
}

/** Minimal chip context sent to the AI as flavor for copy generation. */
export type AiChipContext = {
  name?: string
  theme: StyleTheme
  dieShape: DieShape
  blockTypes: string[]
}
