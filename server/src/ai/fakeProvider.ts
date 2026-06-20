import type { AiProvider } from './provider'
import type { StyleTheme } from '@domain/project'

/** Deterministic provider for dev/test — no network. */
export function createFakeProvider(): AiProvider {
  return {
    async generateChipDraft(input) {
      const name = input.prompt.trim().slice(0, 40) || 'AI Draft Chip'
      const lower = input.prompt.toLowerCase()
      const theme = lower.includes('mono')
        ? 'mono'
        : lower.includes('retro')
          ? 'retro'
          : lower.includes('military')
            ? 'military'
            : lower.includes('keynote')
              ? 'keynote'
              : 'neon'
      return {
        name,
        dieShape: 'rect',
        theme,
        blocks: [
          { type: 'CPU', label: 'Core', x: 0.1, y: 0.1, w: 0.3, h: 0.3 },
          { type: 'Cache', label: 'L2', x: 0.55, y: 0.1, w: 0.3, h: 0.3 },
        ],
      }
    },
    async generateSpecCopy(input) {
      const { context } = input
      const themeWord = context.theme.toUpperCase()
      const nameWord = (context.name ?? '').trim().toUpperCase()
      return {
        brand: nameWord !== '' ? `${nameWord} ${themeWord}` : themeWord,
        series: context.dieShape.toUpperCase(),
        generation: 'AI-I',
        process: '0.5nm dream-etched',
        cores: Math.max(1, context.blockTypes.length) * 8,
        bandwidth: '4.2 TB/s',
        features: context.blockTypes.slice(0, 3).map((type) => `${type} accelerator`),
        description: `An AI-dreamed ${context.theme} chip with ${context.blockTypes.length} block types.`,
      }
    },
    async generateLayoutSuggestions(input) {
      const used = new Set(input.context.blocks.map((block) => block.type))
      const candidates = ['Cache', 'GPU', 'PLL']
      const suggestions = candidates
        .filter((type) => !used.has(type))
        .slice(0, 2)
        .map((type, index) => ({
          type,
          reason: `Add a ${type} to balance the layout`,
          x: 0.1 + index * 0.3,
          y: 0.6,
          w: 0.2,
          h: 0.2,
        }))
      return { suggestions }
    },
    async generateVariations(input) {
      const { context, count } = input
      const themes: StyleTheme[] = ['neon', 'retro', 'military', 'keynote', 'mono']
      const baseName = (context.name ?? '').trim() || 'AI Chip'
      const baseIndex = Math.max(0, themes.indexOf(context.theme))
      const variations = Array.from({ length: count }, (_, index) => ({
        name: `${baseName} v${index + 1}`,
        dieShape: context.dieShape,
        theme: themes[(baseIndex + index + 1) % themes.length],
        blocks: context.blocks.map((block) => ({
          type: block.type,
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
        })),
      }))
      return { variations }
    },
  }
}
