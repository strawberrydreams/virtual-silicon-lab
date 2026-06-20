import type { Project } from '../project'
import type { AiChipContext } from './aiSpecDraft'

/** Pure: turns the live project into the minimal context the AI uses as copy flavor. */
export function deriveAiChipContext(project: Project): AiChipContext {
  const blockTypes: string[] = []
  for (const block of project.blocks) {
    if (!blockTypes.includes(block.type)) blockTypes.push(block.type)
  }
  return {
    name: project.name,
    theme: project.theme,
    dieShape: project.die.shape,
    blockTypes,
  }
}
