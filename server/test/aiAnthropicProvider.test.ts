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

  it('includes a theme enum in the draft schema and parses a returned theme', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            dieShape: 'rect',
            theme: 'keynote',
            blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const draft = await provider.generateChipDraft({ prompt: 'keynote chip' })
    expect(draft.theme).toBe('keynote')
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.output_config.format.schema.properties.theme.enum).toContain('keynote')
  })
})

describe('createAnthropicProvider.generateSpecCopy', () => {
  it('requests opus-4-8 with a json_schema format and parses the spec draft', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            brand: 'NOCTURNE',
            series: 'X-2',
            generation: 'AI-II',
            process: '0.3nm',
            cores: 64,
            bandwidth: '9 TB/s',
            features: ['Lucid Cache'],
            description: 'Dreams in parallel.',
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const draft = await provider.generateSpecCopy({
      context: { name: 'X', theme: 'neon', dieShape: 'rect', blockTypes: ['CPU'] },
    })

    expect(draft.brand).toBe('NOCTURNE')
    expect(draft.cores).toBe(64)
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(
      provider.generateSpecCopy({
        context: { theme: 'neon', dieShape: 'rect', blockTypes: [] },
      }),
    ).rejects.toThrow()
  })
})

describe('createAnthropicProvider.generateLayoutSuggestions', () => {
  it('requests opus-4-8 with a json_schema format and parses the suggestions', async () => {
    create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            suggestions: [
              { type: 'Cache', reason: 'pair with CPU', x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
            ],
          }),
        },
      ],
    })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    const result = await provider.generateLayoutSuggestions({
      context: {
        dieShape: 'rect',
        blocks: [{ type: 'CPU', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
      },
    })
    expect(result.suggestions[0].type).toBe('Cache')
    const args = create.mock.calls.at(-1)?.[0]
    expect(args.model).toBe('claude-opus-4-8')
    expect(args.output_config.format.type).toBe('json_schema')
  })

  it('throws on a refusal stop reason', async () => {
    create.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    const provider = createAnthropicProvider({ apiKey: 'sk', model: 'claude-opus-4-8' })
    await expect(
      provider.generateLayoutSuggestions({ context: { dieShape: 'rect', blocks: [] } }),
    ).rejects.toThrow()
  })
})
