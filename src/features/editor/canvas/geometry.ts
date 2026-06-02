import type { Die, DieShape } from '../../../domain/project'

type BlockRect = { x: number; y: number; w: number; h: number }
type DieRect = { width: number; height: number }

const HEXAGON_INCIRCLE_RATIO = Math.sqrt(3) / 2

export function snapToGrid(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize
}

export function clampBlockToRect(block: BlockRect, die: DieRect): BlockRect {
  const w = Math.min(block.w, die.width)
  const h = Math.min(block.h, die.height)

  return {
    x: Math.min(Math.max(block.x, 0), die.width - w),
    y: Math.min(Math.max(block.y, 0), die.height - h),
    w,
    h,
  }
}

export function clampBlockToRadial(block: BlockRect, die: DieRect, radius: number): BlockRect {
  const centerX = die.width / 2
  const centerY = die.height / 2

  let { w, h } = block
  let halfDiagonal = Math.hypot(w / 2, h / 2)
  if (halfDiagonal > radius && halfDiagonal > 0) {
    const scale = radius / halfDiagonal
    w *= scale
    h *= scale
    halfDiagonal = radius
  }

  const maxDistance = Math.max(0, radius - halfDiagonal)
  let blockCenterX = block.x + block.w / 2
  let blockCenterY = block.y + block.h / 2
  const offsetX = blockCenterX - centerX
  const offsetY = blockCenterY - centerY
  const distance = Math.hypot(offsetX, offsetY)
  if (distance > maxDistance && distance > 0) {
    const scale = maxDistance / distance
    blockCenterX = centerX + offsetX * scale
    blockCenterY = centerY + offsetY * scale
  }

  return { x: blockCenterX - w / 2, y: blockCenterY - h / 2, w, h }
}

export function clampBlockToDie(block: BlockRect, die: Die): BlockRect {
  switch (die.shape) {
    case 'rect':
    case 'square':
      return clampBlockToRect(block, { width: die.width, height: die.height })
    case 'circle':
      return clampBlockToRadial(block, die, die.width / 2)
    case 'hexagon':
      return clampBlockToRadial(block, die, (die.width / 2) * HEXAGON_INCIRCLE_RATIO)
  }
}

export function normalizeDie(die: Die, shape: DieShape): Die {
  if (shape === 'rect') {
    return { ...die, shape }
  }
  const side = Math.min(die.width, die.height)
  return { ...die, shape, width: side, height: side }
}
