import Anthropic from '@anthropic-ai/sdk'
import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiSpecDraft } from '@domain/ai/aiSpecDraft'
import type { AiProvider } from './provider'

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    dieShape: { type: 'string', enum: ['rect', 'square', 'circle', 'hexagon'] },
    theme: { type: 'string', enum: ['neon', 'retro', 'military', 'keynote', 'mono'] },
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

const SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    brand: { type: 'string' },
    series: { type: 'string' },
    generation: { type: 'string' },
    process: { type: 'string' },
    cores: { type: 'integer' },
    bandwidth: { type: 'string' },
    features: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
  },
  required: [
    'brand', 'series', 'generation', 'process', 'cores', 'bandwidth', 'features', 'description',
  ],
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
              'Return ONLY a JSON chip layout (die shape, a theme from ' +
              'neon/retro/military/keynote/mono, and blocks with fractional x,y,w,h in [0,1]) ' +
              `for this surreal chip idea: ${input.prompt}`,
          },
        ],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming)

      if ((response.stop_reason as string) === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as AiChipDraft
    },

    async generateSpecCopy(input) {
      const { context } = input
      const summary =
        `theme=${context.theme}, dieShape=${context.dieShape}, ` +
        `blocks=[${context.blockTypes.join(', ')}]` +
        (context.name !== undefined ? `, currentName=${context.name}` : '')
      const response = await client.messages.create({
        model: opts.model,
        max_tokens: 2048,
        output_config: { format: { type: 'json_schema', schema: SPEC_SCHEMA } },
        messages: [
          {
            role: 'user',
            content:
              'Return ONLY a JSON fake spec sheet (surreal sci-fi product name via brand+series, ' +
              'a tagline via description, plus generation/process/cores/bandwidth/features) for a ' +
              `fictional chip with this context: ${summary}`,
          },
        ],
      } as unknown as Anthropic.MessageCreateParamsNonStreaming)

      if ((response.stop_reason as string) === 'refusal') throw new Error('AI declined the request')
      const text = response.content.find((b) => b.type === 'text')
      if (text === undefined || text.type !== 'text') throw new Error('No structured output returned')
      return JSON.parse(text.text) as AiSpecDraft
    },
  }
}
