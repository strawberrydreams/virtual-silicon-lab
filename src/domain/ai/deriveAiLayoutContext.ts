import type { Project } from '../project'
import type { AiLayoutContext } from './aiLayoutSuggestion'

/** Pure: the die shape + existing blocks as fractional rectangles for AI layout reasoning. */
export function deriveAiLayoutContext(project: Project): AiLayoutContext {
  const { width, height } = project.die
  return {
    dieShape: project.die.shape,
    blocks: project.blocks.map((block) => ({
      type: block.type,
      x: block.x / width,
      y: block.y / height,
      w: block.w / width,
      h: block.h / height,
    })),
  }
}
