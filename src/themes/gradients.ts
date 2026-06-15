import type { DieShape } from '../domain/project'
import type { ColorStop } from './themeTokens'

export function flattenStops(stops: ColorStop[]): (number | string)[] {
  return stops.flatMap((stop) => [stop.offset, stop.color])
}

export type LinearGradientProps = {
  fillLinearGradientStartPoint: { x: number; y: number }
  fillLinearGradientEndPoint: { x: number; y: number }
  fillLinearGradientColorStops: (number | string)[]
}

export function linearGradientProps(
  width: number,
  height: number,
  stops: ColorStop[],
): LinearGradientProps {
  return {
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 0, y: height },
    fillLinearGradientColorStops: flattenStops(stops),
  }
}

// Rect/square dies draw from their top-left origin; circle/hexagon dies draw
// from their center origin, so the gradient must be offset to span the shape.
export function dieFillProps(
  shape: DieShape,
  width: number,
  height: number,
  stops: ColorStop[],
): LinearGradientProps {
  if (shape === 'circle' || shape === 'hexagon') {
    const radius = width / 2
    return {
      fillLinearGradientStartPoint: { x: 0, y: -radius },
      fillLinearGradientEndPoint: { x: 0, y: radius },
      fillLinearGradientColorStops: flattenStops(stops),
    }
  }
  return linearGradientProps(width, height, stops)
}
