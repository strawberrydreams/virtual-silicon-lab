import type { Block, Die } from '../../../domain/project'

const MIN_EDITOR_WIDTH = 960
const MIN_EDITOR_HEIGHT = 640
const EDITOR_FRAME_PADDING = 48

export function editorStageSize(die: Die) {
  return {
    width: Math.max(MIN_EDITOR_WIDTH, die.width),
    height: Math.max(MIN_EDITOR_HEIGHT, die.height),
  }
}

export function editorStageFrameSize(die: Die) {
  const stageSize = editorStageSize(die)
  return {
    width: stageSize.width + EDITOR_FRAME_PADDING * 2,
    height: stageSize.height + EDITOR_FRAME_PADDING * 2,
  }
}

export function blocksByZIndex(blocks: Block[]) {
  return blocks.slice().sort((left, right) => left.zIndex - right.zIndex)
}
