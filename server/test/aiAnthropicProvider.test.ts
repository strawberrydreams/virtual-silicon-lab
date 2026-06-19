import { describe, expect, it, vi } from 'vitest'

const create = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create }
  },
}))

import { createAnthropicProvider } from '../src/ai/anthropicProvider'

describe('createAnthropicProvider', () => {
  it('requests opus-4-8 with a json_schema format and parses the structured draft', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'NEON',
            dieShape: 'rect',
            blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const draft = await provider.generateChipDraft({ prompt: 'neon chip' })

    expect(draft.dieShape).toBe('rect')
    expect(draft.blocks[0].type).toBe('CPU')
    const args = create.mock.calls[0][0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(provider.generateChipDraft({ prompt: 'x' })).rejects.toThrow()
  })
})
