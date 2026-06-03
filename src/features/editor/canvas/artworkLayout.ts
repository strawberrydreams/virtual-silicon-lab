import type { Block, Die } from '../../../domain/project'

const MIN_EDITOR_WIDTH = 960
const MIN_EDITOR_HEIGHT = 640

export function editorStageSize(die: Die) {
  return {
    width: Math.max(MIN_EDITOR_WIDTH, die.width),
    height: Math.max(MIN_EDITOR_HEIGHT, die.height),
  }
}

export function blocksByZIndex(blocks: Block[]) {
  return blocks.slice().sort((left, right) => left.zIndex - right.zIndex)
}
