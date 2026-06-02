type BlockRect = { x: number; y: number; w: number; h: number }
type DieRect = { width: number; height: number }

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
