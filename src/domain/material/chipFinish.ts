import type { StyleTheme } from '../project'

export const CHIP_FINISHES = ['matte', 'satin', 'gloss', 'metallic'] as const
export type ChipFinish = (typeof CHIP_FINISHES)[number]

export type ChipFinishDescriptor = {
  finish: ChipFinish
  label: string
  twoD: {
    shadowScale: number
    glowScale: number
    traceOpacityScale: number
    microTileOpacityScale: number
    packageHighlightOpacity: number
    dieStrokeScale: number
  }
  pbr: {
    package: { metalness: number; roughness: number }
    dieBase: { metalness: number; roughness: number }
    blockReal: { metalness: number; roughness: number }
    blockFantasy: { metalness: number; roughness: number }
    bloomStrengthScale: number
    exposure: number
  }
}

const DEFAULT_FINISH_BY_THEME: Record<StyleTheme, ChipFinish> = {
  neon: 'gloss',
  retro: 'satin',
  military: 'matte',
  keynote: 'metallic',
  mono: 'gloss',
}

const DESCRIPTORS: Record<ChipFinish, ChipFinishDescriptor> = {
  matte: {
    finish: 'matte',
    label: 'Matte ceramic',
    twoD: {
      shadowScale: 0.72,
      glowScale: 0.62,
      traceOpacityScale: 0.86,
      microTileOpacityScale: 0.8,
      packageHighlightOpacity: 0.04,
      dieStrokeScale: 0.9,
    },
    pbr: {
      package: { metalness: 0.04, roughness: 0.94 },
      dieBase: { metalness: 0.16, roughness: 0.88 },
      blockReal: { metalness: 0.38, roughness: 0.72 },
      blockFantasy: { metalness: 0.08, roughness: 0.76 },
      bloomStrengthScale: 0.78,
      exposure: 1.08,
    },
  },
  satin: {
    finish: 'satin',
    label: 'Satin polymer',
    twoD: {
      shadowScale: 0.9,
      glowScale: 0.86,
      traceOpacityScale: 0.96,
      microTileOpacityScale: 0.92,
      packageHighlightOpacity: 0.08,
      dieStrokeScale: 1,
    },
    pbr: {
      package: { metalness: 0.08, roughness: 0.72 },
      dieBase: { metalness: 0.26, roughness: 0.64 },
      blockReal: { metalness: 0.58, roughness: 0.5 },
      blockFantasy: { metalness: 0.12, roughness: 0.54 },
      bloomStrengthScale: 0.94,
      exposure: 1.12,
    },
  },
  gloss: {
    finish: 'gloss',
    label: 'Gloss glass',
    twoD: {
      shadowScale: 1.12,
      glowScale: 1.18,
      traceOpacityScale: 1.08,
      microTileOpacityScale: 1,
      packageHighlightOpacity: 0.14,
      dieStrokeScale: 1.08,
    },
    pbr: {
      package: { metalness: 0.1, roughness: 0.42 },
      dieBase: { metalness: 0.36, roughness: 0.32 },
      blockReal: { metalness: 0.72, roughness: 0.28 },
      blockFantasy: { metalness: 0.16, roughness: 0.34 },
      bloomStrengthScale: 1.12,
      exposure: 1.18,
    },
  },
  metallic: {
    finish: 'metallic',
    label: 'Brushed metal',
    twoD: {
      shadowScale: 1,
      glowScale: 0.92,
      traceOpacityScale: 1,
      microTileOpacityScale: 0.96,
      packageHighlightOpacity: 0.11,
      dieStrokeScale: 1.16,
    },
    pbr: {
      package: { metalness: 0.5, roughness: 0.48 },
      dieBase: { metalness: 0.78, roughness: 0.36 },
      blockReal: { metalness: 0.88, roughness: 0.3 },
      blockFantasy: { metalness: 0.34, roughness: 0.44 },
      bloomStrengthScale: 0.98,
      exposure: 1.14,
    },
  },
}

export function isChipFinish(value: unknown): value is ChipFinish {
  return typeof value === 'string' && CHIP_FINISHES.includes(value as ChipFinish)
}

export function defaultFinishForTheme(theme: StyleTheme): ChipFinish {
  return DEFAULT_FINISH_BY_THEME[theme]
}

export function resolveChipFinish(value: unknown, theme: StyleTheme): ChipFinish {
  return isChipFinish(value) ? value : defaultFinishForTheme(theme)
}

export function resolveChipFinishDescriptor(finish: ChipFinish): ChipFinishDescriptor {
  return DESCRIPTORS[finish]
}
