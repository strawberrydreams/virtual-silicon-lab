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

export function zoomAtPointer(input: ZoomInput): { scale: number; pos: Point } {
  const scaleBy = input.scaleBy ?? 1.05
  const min = input.min ?? 0.25
  const max = input.max ?? 4

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
