import type { StyleTheme } from '../domain/project'

// Single source of the human-readable palette label per theme. Finish/surface
// labels live in domain/material/chipFinish because they describe the persisted
// Project.finish field instead of the visual theme preset.
export const THEME_LABELS: Record<StyleTheme, string> = {
  neon: 'Neon',
  retro: 'Retro',
  military: 'Military',
  keynote: 'Keynote',
  mono: 'Mono',
}

export function chipThemeLabel(theme: StyleTheme): string {
  return THEME_LABELS[theme]
}
