import type { StyleTheme } from '../../domain/project'
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

export function resolveChip3DStyle(theme: StyleTheme): Chip3DStyle {
  const recipe = resolveMaterialRecipe(theme)
  const tokens = resolveTheme(theme)

  // glassGlow.opacity is small (≈0.12..0.7-scaled); map it into a visible emissive band
  // so fantasy blocks clear the bloom threshold while staying theme-proportional.
  // Kept near ~1.0 so the emissive face keeps its theme hue under ACES tone mapping
  // instead of clipping to white (browser QA: 2.x blew the cyan core out to white).
  const glow = tokens.glow.shadowOpacity // 0.3 (mono) .. 0.7 (neon)
  const emissiveIntensity = 0.5 + glow * 0.85 // ≈0.76 (mono) .. ≈1.1 (neon)

  const materials: Chip3DMaterialSet = {
    package: {
      color: recipe.package.fill,
      metalness: 0.1,
      roughness: 0.82,
      ...NON_EMISSIVE,
    },
    dieBase: {
      color: tokens.dieFill[0].color,
      metalness: 0.4,
      roughness: 0.55,
      ...NON_EMISSIVE,
    },
    blockReal: {
      color: tokens.blockFill.real,
      metalness: 0.75,
      roughness: 0.35,
      ...NON_EMISSIVE,
    },
    blockFantasy: {
      color: tokens.blockFill.fantasy,
      metalness: 0.15,
      roughness: 0.5,
      emissive: recipe.glassGlow.color,
      emissiveIntensity,
    },
  }

  const environment: Chip3DEnvironment = {
    topColor: tokens.background[0].color,
    bottomColor: tokens.background[1].color,
    bloom: {
      threshold: 0.5, // low enough that the in-gamut emissive face throws a real halo
      strength: 0.3 + glow * 0.9, // neon (0.7) ≈0.93 > mono (0.3) ≈0.57 — a neon halo, face stays in-hue
      radius: 0.55,
    },
    exposure: 1.15,
  }

  return { materials, environment }
}
