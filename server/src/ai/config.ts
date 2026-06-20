export type AiProviderKind = 'fake' | 'anthropic'

export type AiConfig = {
  provider: AiProviderKind
  model: string
  apiKey?: string
  dailyQuota: number
}

type Env = Record<string, string | undefined>

export function resolveAiConfig(env: Env = process.env): AiConfig {
  const provider: AiProviderKind =
    env.VSL_AI_PROVIDER?.trim().toLowerCase() === 'anthropic' ? 'anthropic' : 'fake'
  const model = env.VSL_AI_MODEL?.trim() || 'claude-opus-4-8'
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || undefined
  const rawQuota = Number(env.VSL_AI_DAILY_QUOTA)
  const dailyQuota = Number.isInteger(rawQuota) && rawQuota > 0 ? rawQuota : 20
  return { provider, model, apiKey, dailyQuota }
}
