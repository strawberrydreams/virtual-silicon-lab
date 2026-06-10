import type { StyleTheme } from '../domain/project'

export type ColorStop = { offset: number; color: string }

export type Glow = {
  shadowColor: string
  shadowBlur: number
  shadowOpacity: number
}

export type ThemeTokens = {
  name: StyleTheme
  background: ColorStop[] // radial backdrop (editor ambiance now; poster stage in M5)
  dieFill: ColorStop[] // die base, vertical gradient
  dieStroke: string
  dieStrokeWidth: number
  gridColor: string
  blockFill: { real: string; fantasy: string }
  blockStroke: { real: string; fantasy: string }
  selectStroke: string
  accents: string[] // 1..3 hues; accents[0] is the signature
  glow: Glow
  text: string
}

export const THEMES: Record<StyleTheme, ThemeTokens> = {
  neon: {
    name: 'neon',
    background: [
      { offset: 0, color: '#070d1c' },
      { offset: 1, color: '#03050c' },
    ],
    dieFill: [
      { offset: 0, color: '#0c1a30' },
      { offset: 1, color: '#070f1d' },
    ],
    dieStroke: '#2dd4ee',
    dieStrokeWidth: 1.5,
    gridColor: '#123a57',
    blockFill: { real: '#0c1d33', fantasy: '#141b3a' },
    blockStroke: { real: '#2dd4ee', fantasy: '#a855f7' },
    selectStroke: '#a5f3fc',
    accents: ['#22d3ee', '#34d399', '#fbbf24'],
    glow: { shadowColor: '#22d3ee', shadowBlur: 30, shadowOpacity: 0.7 },
    text: '#e6f9ff',
  },
  retro: {
    name: 'retro',
    background: [
      { offset: 0, color: '#1a1208' },
      { offset: 1, color: '#0f0a04' },
    ],
    dieFill: [
      { offset: 0, color: '#33291a' },
      { offset: 1, color: '#241d10' },
    ],
    dieStroke: '#d4af37',
    dieStrokeWidth: 1.5,
    gridColor: '#3a2f14',
    blockFill: { real: '#3a3320', fantasy: '#3f2e16' },
    blockStroke: { real: '#8a6d1f', fantasy: '#c2570f' },
    selectStroke: '#ffd166',
    accents: ['#ffb000', '#33ff66', '#c2570f'],
    glow: { shadowColor: '#ffb000', shadowBlur: 16, shadowOpacity: 0.5 },
    text: '#ffb000',
  },
  military: {
    name: 'military',
    background: [
      { offset: 0, color: '#14181a' },
      { offset: 1, color: '#0e1112' },
    ],
    dieFill: [
      { offset: 0, color: '#2f3a2c' },
      { offset: 1, color: '#222826' },
    ],
    dieStroke: '#6b7d4f',
    dieStrokeWidth: 2,
    gridColor: '#2a322b',
    blockFill: { real: '#23282a', fantasy: '#2a2d22' },
    blockStroke: { real: '#4a5550', fantasy: '#6b7d4f' },
    selectStroke: '#c2a878',
    accents: ['#c2a878', '#f4a000', '#c0392b'],
    glow: { shadowColor: '#f4a000', shadowBlur: 8, shadowOpacity: 0.35 },
    text: '#c2a878',
  },
  keynote: {
    name: 'keynote',
    background: [
      { offset: 0, color: '#15151a' },
      { offset: 1, color: '#0a0a0c' },
    ],
    dieFill: [
      { offset: 0, color: '#3a3d42' },
      { offset: 1, color: '#26282c' },
    ],
    dieStroke: '#4a4d52',
    dieStrokeWidth: 1,
    gridColor: '#34373c',
    blockFill: { real: '#33363b', fantasy: '#3a323f' },
    blockStroke: { real: '#54575d', fantasy: '#a06bff' },
    selectStroke: '#ffffff',
    accents: ['#a06bff', '#ff8a5c'],
    glow: { shadowColor: '#a06bff', shadowBlur: 44, shadowOpacity: 0.45 },
    text: '#f5f5f7',
  },
  mono: {
    name: 'mono',
    background: [
      { offset: 0, color: '#101216' },
      { offset: 1, color: '#0c0c0d' },
    ],
    dieFill: [
      { offset: 0, color: '#1c1f23' },
      { offset: 1, color: '#141619' },
    ],
    dieStroke: '#3a3f45',
    dieStrokeWidth: 1,
    gridColor: '#23272c',
    blockFill: { real: '#1e2125', fantasy: '#2a2e33' },
    blockStroke: { real: '#4a4f55', fantasy: '#6b727a' },
    selectStroke: '#e8ebef',
    accents: ['#9db4cf'],
    glow: { shadowColor: '#9db4cf', shadowBlur: 14, shadowOpacity: 0.3 },
    text: '#c8ccd2',
  },
}

export function resolveTheme(theme: StyleTheme): ThemeTokens {
  return THEMES[theme]
}
