import type { Project } from '../project'
import type { AiVariationContext } from './aiVariationContext'
import { deriveAiLayoutContext } from './deriveAiLayoutContext'

/** Pure: source identity/style plus M3's fractional full-layout context. */
export function deriveAiVariationContext(project: Project): AiVariationContext {
  return {
    name: project.name,
    theme: project.theme,
    ...deriveAiLayoutContext(project),
  }
}
