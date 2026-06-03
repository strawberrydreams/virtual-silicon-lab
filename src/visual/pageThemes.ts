export const PAGE_THEME_NAMES = ['laboratory', 'anime', 'space'] as const

export type PageThemeName = (typeof PAGE_THEME_NAMES)[number]

export const DEFAULT_PAGE_THEME: PageThemeName = 'laboratory'

type TokenGroups = {
  background: { app: string; gradient: string; depth: string }
  surface: { panel: string; raised: string; inset: string }
  border: { normal: string; strong: string; glow: string }
  text: { primary: string; secondary: string; muted: string; inverse: string }
  accent: { primary: string; secondary: string; warning: string; success: string }
  glow: { soft: string; hard: string; horizon: string; selection: string }
  focus: { ring: string; outline: string }
  canvas: { stage: string; grid: string; vignette: string; packageShadow: string }
  hero: { background: string; chipBloom: string; productSignal: string }
}

export type PageTheme = {
  name: PageThemeName
  label: string
  tokens: TokenGroups
  cssVariables: Record<string, string>
}

function themeCss(tokens: TokenGroups): Record<string, string> {
  return {
    '--v2-bg': tokens.background.app,
    '--v2-bg-2': tokens.background.depth,
    '--v2-panel': tokens.surface.panel,
    '--v2-panel-strong': tokens.surface.raised,
    '--v2-border': tokens.border.normal,
    '--v2-border-strong': tokens.border.strong,
    '--v2-text': tokens.text.primary,
    '--v2-muted': tokens.text.muted,
    '--v2-accent': tokens.accent.primary,
    '--v2-accent-2': tokens.accent.secondary,
    '--v2-shadow': tokens.glow.soft,
  }
}

const laboratoryTokens: TokenGroups = {
  background: { app: '#03070b', gradient: '#09202a', depth: '#061219' },
  surface: {
    panel: 'rgba(7, 18, 25, 0.86)',
    raised: 'rgba(10, 28, 38, 0.94)',
    inset: 'rgba(2, 8, 12, 0.72)',
  },
  border: {
    normal: 'rgba(91, 213, 240, 0.18)',
    strong: 'rgba(91, 213, 240, 0.42)',
    glow: 'rgba(91, 213, 240, 0.65)',
  },
  text: { primary: '#d8f7ff', secondary: '#a7d8e4', muted: '#7faab6', inverse: '#031014' },
  accent: { primary: '#58d9f5', secondary: '#a6f7ff', warning: '#f5c46b', success: '#73e7b8' },
  glow: {
    soft: 'rgba(32, 211, 238, 0.22)',
    hard: 'rgba(88, 217, 245, 0.46)',
    horizon: 'rgba(88, 217, 245, 0.18)',
    selection: 'rgba(166, 247, 255, 0.32)',
  },
  focus: { ring: '#a6f7ff', outline: 'rgba(166, 247, 255, 0.45)' },
  canvas: {
    stage: '#03080c',
    grid: 'rgba(91, 213, 240, 0.045)',
    vignette: 'rgba(0, 0, 0, 0.55)',
    packageShadow: 'rgba(88, 217, 245, 0.12)',
  },
  hero: {
    background: 'radial-gradient(circle at 64% 40%, rgba(88, 217, 245, 0.18), transparent 35rem)',
    chipBloom: 'rgba(88, 217, 245, 0.28)',
    productSignal: '#58d9f5',
  },
}

const animeTokens: TokenGroups = {
  background: { app: '#070411', gradient: '#26102f', depth: '#13071f' },
  surface: {
    panel: 'rgba(22, 9, 32, 0.88)',
    raised: 'rgba(35, 13, 49, 0.94)',
    inset: 'rgba(9, 5, 18, 0.78)',
  },
  border: {
    normal: 'rgba(255, 88, 192, 0.2)',
    strong: 'rgba(255, 88, 192, 0.48)',
    glow: 'rgba(255, 88, 192, 0.72)',
  },
  text: { primary: '#fff3fb', secondary: '#ffd0ee', muted: '#b489ad', inverse: '#120616' },
  accent: { primary: '#ff58c0', secondary: '#46f4ff', warning: '#ffd35c', success: '#77ffbd' },
  glow: {
    soft: 'rgba(255, 88, 192, 0.24)',
    hard: 'rgba(255, 88, 192, 0.52)',
    horizon: 'rgba(70, 244, 255, 0.2)',
    selection: 'rgba(255, 211, 92, 0.34)',
  },
  focus: { ring: '#46f4ff', outline: 'rgba(70, 244, 255, 0.45)' },
  canvas: {
    stage: '#090512',
    grid: 'rgba(255, 88, 192, 0.055)',
    vignette: 'rgba(5, 0, 10, 0.58)',
    packageShadow: 'rgba(255, 88, 192, 0.16)',
  },
  hero: {
    background: 'radial-gradient(circle at 66% 34%, rgba(255, 88, 192, 0.2), transparent 32rem)',
    chipBloom: 'rgba(255, 88, 192, 0.34)',
    productSignal: '#ff58c0',
  },
}

const spaceTokens: TokenGroups = {
  background: { app: '#02040c', gradient: '#0e1a3a', depth: '#050b1b' },
  surface: {
    panel: 'rgba(6, 13, 29, 0.82)',
    raised: 'rgba(10, 20, 44, 0.92)',
    inset: 'rgba(2, 6, 16, 0.78)',
  },
  border: {
    normal: 'rgba(161, 180, 255, 0.18)',
    strong: 'rgba(161, 180, 255, 0.42)',
    glow: 'rgba(161, 180, 255, 0.7)',
  },
  text: { primary: '#eef3ff', secondary: '#c8d5ff', muted: '#8f9bc4', inverse: '#030611' },
  accent: { primary: '#9cb4ff', secondary: '#7ff2ff', warning: '#f0c77a', success: '#8df7c9' },
  glow: {
    soft: 'rgba(156, 180, 255, 0.24)',
    hard: 'rgba(127, 242, 255, 0.46)',
    horizon: 'rgba(156, 180, 255, 0.2)',
    selection: 'rgba(127, 242, 255, 0.32)',
  },
  focus: { ring: '#7ff2ff', outline: 'rgba(127, 242, 255, 0.45)' },
  canvas: {
    stage: '#030714',
    grid: 'rgba(161, 180, 255, 0.045)',
    vignette: 'rgba(0, 0, 0, 0.62)',
    packageShadow: 'rgba(127, 242, 255, 0.1)',
  },
  hero: {
    background: 'radial-gradient(circle at 67% 42%, rgba(156, 180, 255, 0.19), transparent 36rem)',
    chipBloom: 'rgba(127, 242, 255, 0.24)',
    productSignal: '#9cb4ff',
  },
}

export const pageThemes: Record<PageThemeName, PageTheme> = {
  laboratory: { name: 'laboratory', label: 'Laboratory', tokens: laboratoryTokens, cssVariables: themeCss(laboratoryTokens) },
  anime: { name: 'anime', label: 'Anime', tokens: animeTokens, cssVariables: themeCss(animeTokens) },
  space: { name: 'space', label: 'Space', tokens: spaceTokens, cssVariables: themeCss(spaceTokens) },
}

export function isPageThemeName(value: unknown): value is PageThemeName {
  return typeof value === 'string' && PAGE_THEME_NAMES.includes(value as PageThemeName)
}

export function resolvePageTheme(value: unknown): PageTheme {
  return pageThemes[isPageThemeName(value) ? value : DEFAULT_PAGE_THEME]
}
