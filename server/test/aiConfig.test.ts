import { describe, expect, it } from 'vitest'
import { resolveAiConfig } from '../src/ai/config'

describe('resolveAiConfig', () => {
  it('defaults to the fake provider, opus model, and quota 20 with no env', () => {
    expect(resolveAiConfig({})).toEqual({
      provider: 'fake',
      model: 'claude-opus-4-8',
      apiKey: undefined,
      dailyQuota: 20,
    })
  })

  it('selects the anthropic provider and reads key/model/quota from env', () => {
    expect(
      resolveAiConfig({
        VSL_AI_PROVIDER: 'anthropic',
        ANTHROPIC_API_KEY: 'sk-test',
        VSL_AI_MODEL: 'claude-opus-4-8',
        VSL_AI_DAILY_QUOTA: '5',
      }),
    ).toEqual({ provider: 'anthropic', model: 'claude-opus-4-8', apiKey: 'sk-test', dailyQuota: 5 })
  })

  it('falls back to quota 20 for non-positive or invalid values', () => {
    expect(resolveAiConfig({ VSL_AI_DAILY_QUOTA: '0' }).dailyQuota).toBe(20)
    expect(resolveAiConfig({ VSL_AI_DAILY_QUOTA: 'abc' }).dailyQuota).toBe(20)
  })
})
