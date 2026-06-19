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
  }
}
