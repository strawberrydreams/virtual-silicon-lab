import Anthropic from '@anthropic-ai/sdk'
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiProvider } from './provider'

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    dieShape: { type: 'string', enum: ['rect', 'square', 'circle', 'hexagon'] },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string' },
          label: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
        required: ['type', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['dieShape', 'blocks'],
} as const

export function createAnthropicProvider(opts: { apiKey: string; model: string }): AiProvider {
  const client = new Anthropic({ apiKey: opts.apiKey })
  return {
    async generateChipDraft(input) {
      const response = await client.messages.create({
        model: opts.model,
        max_tokens: 4096,
        output_config: { format: { type: 'json_schema', schema: DRAFT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              'Return ONLY a JSON chip layout (die shape + blocks with fractional x,y,w,h in [0,1]) ' +
              `for this surreal chip idea: ${input.prompt}`,
          },
        ],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming)

      if ((response.stop_reason as string) === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as AiChipDraft
    },
  }
}
