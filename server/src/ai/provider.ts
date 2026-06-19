import type { AiChipDraft } from '@domain/ai/aiChipDraft'

export type AiGenerateInput = { prompt: string }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
}
