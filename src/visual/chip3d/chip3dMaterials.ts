import type { StyleTheme } from '../../domain/project'
import {
  defaultFinishForTheme,
  resolveChipFinishDescriptor,
  type ChipFinish,
} from '../../domain/material/chipFinish'
import { resolveMaterialRecipe } from '../materialRecipes'
import { resolveTheme } from '../../themes/themeTokens'

export type Chip3DMaterial = {
  color: string
  metalness: number
  roughness: number
  emissive: string
  emissiveIntensity: number
}

export type Chip3DMaterialSet = {
  package: Chip3DMaterial
  dieBase: Chip3DMaterial
  blockReal: Chip3DMaterial
  blockFantasy: Chip3DMaterial
}

export type Chip3DBloom = { threshold: number; strength: number; radius: number }

export type Chip3DEnvironment = {
  topColor: string
  bottomColor: string
  bloom: Chip3DBloom
  exposure: number
}

export type Chip3DStyle = { materials: Chip3DMaterialSet; environment: Chip3DEnvironment }

const NON_EMISSIVE = { emissive: '#000000', emissiveIntensity: 0 } as const

export function resolveChip3DStyle(
  theme: StyleTheme,
  finish: ChipFinish = defaultFinishForTheme(theme),
): Chip3DStyle {
  const recipe = resolveMaterialRecipe(theme, finish)
  const descriptor = resolveChipFinishDescriptor(finish)
  const tokens = resolveTheme(theme)

  // glassGlow.opacity is finish-adjusted and intentionally small; map it into a visible emissive band
  // so fantasy blocks clear the bloom threshold while staying theme-proportional.
  // Kept near ~1.0 so the emissive face keeps its theme hue under ACES tone mapping
  // instead of clipping to white (browser QA: 2.x blew the cyan core out to white).
  const glow = recipe.glassGlow.opacity
  const emissiveIntensity = 0.5 + glow * 2.1 // ≈0.76 (mono gloss) .. ≈1.1 (neon gloss)

  const materials: Chip3DMaterialSet = {
    package: {
      color: recipe.package.fill,
      ...descriptor.pbr.package,
      ...NON_EMISSIVE,
    },
    dieBase: {
      color: tokens.dieFill[0].color,
      ...descriptor.pbr.dieBase,
      ...NON_EMISSIVE,
    },
    blockReal: {
      color: tokens.blockFill.real,
      ...descriptor.pbr.blockReal,
      ...NON_EMISSIVE,
    },
    blockFantasy: {
      color: tokens.blockFill.fantasy,
      ...descriptor.pbr.blockFantasy,
      emissive: recipe.glassGlow.color,
      emissiveIntensity,
    },
  }

  const environment: Chip3DEnvironment = {
    topColor: tokens.background[0].color,
    bottomColor: tokens.background[1].color,
    bloom: {
      threshold: 0.5, // low enough that the in-gamut emissive face throws a real halo
      strength: (0.3 + glow * 2.2) * descriptor.pbr.bloomStrengthScale,
      radius: 0.55,
    },
    exposure: descriptor.pbr.exposure,
  }

  return { materials, environment }
}
