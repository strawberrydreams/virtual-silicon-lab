export type Point = { x: number; y: number }

export type ZoomInput = {
  pointer: Point
  stagePos: Point
  oldScale: number
  deltaY: number
  scaleBy?: number
  min?: number
  max?: number
}

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 4

// Additive zoom step (for +/- buttons) sharing the wheel-zoom limits, so the
// buttons can never snap a wheel-zoomed view back toward a narrower range.
export function stepZoom(current: number, delta: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((current + delta).toFixed(2))))
}

export function zoomAtPointer(input: ZoomInput): { scale: number; pos: Point } {
  const scaleBy = input.scaleBy ?? 1.05
  const min = input.min ?? ZOOM_MIN
  const max = input.max ?? ZOOM_MAX

  const zoomingIn = input.deltaY < 0
  const unclamped = zoomingIn ? input.oldScale * scaleBy : input.oldScale / scaleBy
  const scale = Math.min(max, Math.max(min, unclamped))

  const worldPoint = {
    x: (input.pointer.x - input.stagePos.x) / input.oldScale,
    y: (input.pointer.y - input.stagePos.y) / input.oldScale,
  }

  return {
    scale,
    pos: {
      x: input.pointer.x - worldPoint.x * scale,
      y: input.pointer.y - worldPoint.y * scale,
    },
  }
}
