import type { Block, Die } from '../domain/project'

const GRID = 16
const PADDING = 16

type ReflowInput = {
  blocks: Block[]
  die: Die
  targetBlockId: string
  target: { x: number; y: number }
}

type OrderedBlock = {
  block: Block
  sortX: number
  sortY: number
}

export function reflowBlocksGlobally({ blocks, die, targetBlockId, target }: ReflowInput): Block[] {
  const ordered = blocks
    .map((block): OrderedBlock => {
      if (block.id === targetBlockId) return { block, sortX: target.x, sortY: target.y }
      return { block, sortX: block.x, sortY: block.y }
    })
    .slice()
    .sort((a: OrderedBlock, b: OrderedBlock) => a.sortY - b.sortY || a.sortX - b.sortX || a.block.zIndex - b.block.zIndex)

  let cursorX = PADDING
  let cursorY = PADDING
  let rowHeight = 0

  return ordered.map(({ block }) => {
    const size = fitBlockSize(block, die)
    if (cursorX + size.w > die.width - PADDING && cursorX > PADDING) {
      cursorX = PADDING
      cursorY += rowHeight + GRID
      rowHeight = 0
    }

    if (cursorY + size.h > die.height - PADDING) {
      cursorX = PADDING
      cursorY = Math.max(PADDING, die.height - PADDING - size.h)
      rowHeight = 0
    }

    const next = {
      ...block,
      x: cursorX,
      y: cursorY,
      w: size.w,
      h: size.h,
      rotation: 0,
    }

    cursorX += size.w + GRID
    rowHeight = Math.max(rowHeight, size.h)
    return next
  })
}

function fitBlockSize(block: Block, die: Die) {
  const maxWidth = Math.max(GRID, die.width - PADDING * 2)
  const maxHeight = Math.max(GRID, die.height - PADDING * 2)
  if (block.w <= maxWidth && block.h <= maxHeight) return { w: block.w, h: block.h }
  const scale = Math.min(maxWidth / block.w, maxHeight / block.h)
  return {
    w: snap(Math.max(GRID, block.w * scale)),
    h: snap(Math.max(GRID, block.h * scale)),
  }
}

function snap(value: number) {
  return Math.max(GRID, Math.round(value / GRID) * GRID)
}
