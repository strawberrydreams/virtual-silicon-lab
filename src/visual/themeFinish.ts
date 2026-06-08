import type { StyleTheme } from '../domain/project'

// Single source of the human-readable finish label per theme. Shared by the
// dashboard/preset cards, the editor command bar, and the toolbar theme buttons
// so the copy never drifts between surfaces.
export const THEME_FINISH_LABELS: Record<StyleTheme, string> = {
  neon: 'Cyan gradient',
  retro: 'Amber solid',
  military: 'Moss solid',
  keynote: 'Graphite gradient',
  mono: 'Glass solid',
}

export function chipFinishLabel(theme: StyleTheme): string {
  return THEME_FINISH_LABELS[theme]
}
