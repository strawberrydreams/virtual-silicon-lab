import type { Block, Decoration } from '../domain/project'
import type { ThemeTokens } from './themeTokens'

export type BlockStyle = {
  fill: string
  stroke: string
  strokeWidth: number
  shadowColor: string
  shadowBlur: number
  shadowOpacity: number
}

export function resolveBlockStyle(
  block: Block,
  tokens: ThemeTokens,
  isSelected: boolean,
): BlockStyle {
  const isFantasy = block.category === 'fantasy'
  const glowing = block.glow ?? false
  const baseBlur = isFantasy ? tokens.glow.shadowBlur : tokens.glow.shadowBlur * 0.5
  return {
    fill: block.colorOverride ?? tokens.blockFill[block.category],
    stroke: isSelected ? tokens.selectStroke : tokens.blockStroke[block.category],
    strokeWidth: isSelected ? 2.5 : 1.25,
    shadowColor: block.colorOverride ?? (isFantasy ? tokens.accents[0] : tokens.glow.shadowColor),
    shadowBlur: glowing ? baseBlur : 0,
    shadowOpacity: glowing ? tokens.glow.shadowOpacity : 0,
  }
}

export type DecorationStyle = {
  color: string
  strokeWidth: number
  shadowColor: string
  shadowBlur: number
  blend?: GlobalCompositeOperation
}

export function resolveDecorationStyle(
  decoration: Decoration,
  tokens: ThemeTokens,
): DecorationStyle {
  switch (decoration.kind) {
    case 'neonLine': {
      const color = decoration.color || tokens.accents[0]
      return {
        color,
        strokeWidth: 2.5,
        shadowColor: color,
        shadowBlur: tokens.glow.shadowBlur,
        blend: 'lighter',
      }
    }
    case 'warningMark':
      return { color: '#f4a000', strokeWidth: 2, shadowColor: '#f4a000', shadowBlur: 8 }
    case 'label':
      return {
        color: tokens.text,
        strokeWidth: 0,
        shadowColor: tokens.glow.shadowColor,
        shadowBlur: 0,
      }
    case 'sciFiObject':
      return {
        color: tokens.accents[0],
        strokeWidth: 1,
        shadowColor: tokens.accents[0],
        shadowBlur: tokens.glow.shadowBlur * 0.5,
      }
  }
}
