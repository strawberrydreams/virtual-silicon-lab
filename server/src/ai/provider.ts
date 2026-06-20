import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiLayoutContext, AiLayoutSuggestion } from '@domain/ai/aiLayoutSuggestion'
import type { AiChipContext, AiSpecDraft } from '@domain/ai/aiSpecDraft'

export type AiGenerateInput = { prompt: string }
export type AiSpecCopyInput = { context: AiChipContext }
export type AiLayoutSuggestionsInput = { context: AiLayoutContext }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
  generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>
  generateLayoutSuggestions(
    input: AiLayoutSuggestionsInput,
  ): Promise<{ suggestions: AiLayoutSuggestion[] }>
}
