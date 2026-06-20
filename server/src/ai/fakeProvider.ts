import type { AiProvider } from './provider'

/** Deterministic provider for dev/test — no network. */
export function createFakeProvider(): AiProvider {
  return {
    async generateChipDraft(input) {
      const name = input.prompt.trim().slice(0, 40) || 'AI Draft Chip'
      return {
        name,
        dieShape: 'rect',
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
  }
}
