import type { StyleTheme } from '../domain/project'
import { resolveTheme, type ColorStop } from '../themes/themeTokens'

export type ChipMaterialRecipe = {
  theme: StyleTheme
  package: {
    fill: string
    stroke: string
    shadowColor: string
    shadowBlur: number
    shadowOpacity: number
  }
  substrate: {
    fill: string
    stroke: string
    lineColor: string
  }
  dieBase: {
    fillStops: ColorStop[]
    stroke: string
    strokeWidth: number
  }
  metalTrace: {
    color: string
    secondaryColor: string
    width: number
    opacity: number
  }
  microTile: {
    fill: string
    stroke: string
    opacity: number
  }
  glassGlow: {
    color: string
    blur: number
    opacity: number
  }
  readoutLabel: {
    color: string
    subduedColor: string
  }
}

const PACKAGE_FILL: Record<StyleTheme, string> = {
  neon: '#070b18',
  retro: '#22180b',
  military: '#171c1a',
  keynote: '#17181d',
  mono: '#111417',
}

export function resolveMaterialRecipe(theme: StyleTheme): ChipMaterialRecipe {
  const tokens = resolveTheme(theme)
  const accent = tokens.accents[0]
  const secondary = tokens.accents[1] ?? accent
  return {
    theme,
    package: {
      fill: PACKAGE_FILL[theme],
      stroke: tokens.dieStroke,
      shadowColor: tokens.glow.shadowColor,
      shadowBlur: Math.max(10, tokens.glow.shadowBlur * 0.55),
      shadowOpacity: Math.max(0.18, tokens.glow.shadowOpacity * 0.42),
    },
    substrate: {
      fill: tokens.blockFill.real,
      stroke: tokens.dieStroke,
      lineColor: tokens.gridColor,
    },
    dieBase: {
      fillStops: tokens.dieFill,
      stroke: tokens.dieStroke,
      strokeWidth: tokens.dieStrokeWidth,
    },
    metalTrace: {
      color: accent,
      secondaryColor: secondary,
      width: theme === 'military' || theme === 'mono' ? 1.5 : 2,
      opacity: theme === 'mono' ? 0.42 : 0.58,
    },
    microTile: {
      fill: accent,
      stroke: tokens.gridColor,
      opacity: theme === 'military' || theme === 'mono' ? 0.08 : 0.12,
    },
    glassGlow: {
      color: tokens.glow.shadowColor,
      blur: Math.max(8, tokens.glow.shadowBlur),
      opacity: Math.max(0.12, tokens.glow.shadowOpacity * 0.35),
    },
    readoutLabel: {
      color: tokens.text,
      subduedColor: tokens.gridColor,
    },
  }
}
