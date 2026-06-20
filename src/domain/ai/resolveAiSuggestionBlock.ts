import { buildBlock } from '../blockFactory'
import type { Block, BlockType, Project } from '../project'
import type { AiLayoutSuggestion } from './aiLayoutSuggestion'
import { clampFractionalBlock, KNOWN_BLOCK_TYPES } from './blockClamp'

/**
 * Resolves one AI suggestion into a domain-valid block, or null for an unknown type.
 * This is M3's apply-time valid-output guarantee.
 */
export function resolveAiSuggestionBlock(
  project: Project,
  suggestion: AiLayoutSuggestion,
  id: string,
): Block | null {
  if (!KNOWN_BLOCK_TYPES.has(suggestion.type)) return null
  const built = buildBlock(project, suggestion.type as BlockType, id)
  const rect = clampFractionalBlock(project.die, suggestion)
  return { ...built, ...rect, label: suggestion.label }
}
