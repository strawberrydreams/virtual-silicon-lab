import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiChipContext, AiSpecDraft } from '@domain/ai/aiSpecDraft'

export type AiGenerateInput = { prompt: string }
export type AiSpecCopyInput = { context: AiChipContext }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
  generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>
}
