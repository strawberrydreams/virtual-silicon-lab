import type { AiChipDraft } from '@domain/ai/aiChipDraft'
import type { AiLayoutContext, AiLayoutSuggestion } from '@domain/ai/aiLayoutSuggestion'
import type { AiChipContext, AiSpecDraft } from '@domain/ai/aiSpecDraft'
import type { AiVariationContext } from '@domain/ai/aiVariationContext'

export type AiGenerateInput = { prompt: string }
export type AiSpecCopyInput = { context: AiChipContext }
export type AiLayoutSuggestionsInput = { context: AiLayoutContext }
export type AiVariationsInput = { context: AiVariationContext; count: number }

export type AiProvider = {
  generateChipDraft(input: AiGenerateInput): Promise<AiChipDraft>
  generateSpecCopy(input: AiSpecCopyInput): Promise<AiSpecDraft>
  generateLayoutSuggestions(
    input: AiLayoutSuggestionsInput,
  ): Promise<{ suggestions: AiLayoutSuggestion[] }>
  generateVariations(input: AiVariationsInput): Promise<{ variations: AiChipDraft[] }>
}
