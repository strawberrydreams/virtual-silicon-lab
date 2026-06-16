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

// Tile labels may carry a second line (e.g. "GPU CLUSTER\n12-CORE"); split into an
// upper-cased title + sub line so BlockArtwork can render the reference's two-line tags
// without a schema change. Falls back to the block type when no label is set.
export function splitTileLabel(
  label: string | undefined,
  type: string,
): { title: string; sub: string } {
  const source = (label ?? type).trim()
  const [first, ...rest] = source.split('\n')
  return { title: first.toUpperCase(), sub: rest.join(' ').trim().toUpperCase() }
}
