import type { StyleTheme } from '../domain/project'
import {
  defaultFinishForTheme,
  resolveChipFinishDescriptor,
  type ChipFinish,
} from '../domain/material/chipFinish'
import { resolveTheme, type ColorStop } from '../themes/themeTokens'

export type ChipMaterialRecipe = {
  theme: StyleTheme
  finish: ChipFinish
  package: {
    fill: string
    stroke: string
    shadowColor: string
    shadowBlur: number
    shadowOpacity: number
    highlightOpacity: number
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
  fillerCell: {
    fill: string
    stroke: string
    accentColors: string[]
    opacity: number
  }
  readoutLabel: {
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

export function resolveMaterialRecipe(
  theme: StyleTheme,
  finish: ChipFinish = defaultFinishForTheme(theme),
): ChipMaterialRecipe {
  const tokens = resolveTheme(theme)
  const descriptor = resolveChipFinishDescriptor(finish)
  const accent = tokens.accents[0]
  const secondary = tokens.accents[1] ?? accent
  return {
    theme,
    finish,
    package: {
      fill: PACKAGE_FILL[theme],
      stroke: tokens.dieStroke,
      shadowColor: tokens.glow.shadowColor,
      shadowBlur: Math.max(6, tokens.glow.shadowBlur * 0.55 * descriptor.twoD.shadowScale),
      shadowOpacity: Math.min(
        1,
        Math.max(0.12, tokens.glow.shadowOpacity * 0.42 * descriptor.twoD.shadowScale),
      ),
      highlightOpacity: descriptor.twoD.packageHighlightOpacity,
    },
    substrate: {
      fill: tokens.blockFill.real,
      stroke: tokens.dieStroke,
      lineColor: tokens.gridColor,
    },
    dieBase: {
      fillStops: tokens.dieFill,
      stroke: tokens.dieStroke,
      strokeWidth: tokens.dieStrokeWidth * descriptor.twoD.dieStrokeScale,
    },
    metalTrace: {
      color: accent,
      secondaryColor: secondary,
      width: theme === 'military' || theme === 'mono' ? 1.5 : 2,
      opacity: Math.min(1, (theme === 'mono' ? 0.42 : 0.58) * descriptor.twoD.traceOpacityScale),
    },
    microTile: {
      fill: accent,
      stroke: tokens.gridColor,
      opacity: Math.min(
        1,
        (theme === 'military' || theme === 'mono' ? 0.08 : 0.12) *
          descriptor.twoD.microTileOpacityScale,
      ),
    },
    glassGlow: {
      color: tokens.glow.shadowColor,
      blur: Math.max(6, tokens.glow.shadowBlur * descriptor.twoD.glowScale),
      opacity: Math.min(
        1,
        Math.max(0.08, tokens.glow.shadowOpacity * 0.35 * descriptor.twoD.glowScale),
      ),
    },
    fillerCell: {
      fill: tokens.dieFill[1].color,
      stroke: tokens.gridColor,
      accentColors: tokens.accents,
      opacity: Math.min(
        1,
        (theme === 'military' || theme === 'mono' ? 0.5 : 0.6) *
          descriptor.twoD.microTileOpacityScale,
      ),
    },
    readoutLabel: {
      subduedColor: tokens.gridColor,
    },
  }
}
