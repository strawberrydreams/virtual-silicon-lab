import { describe, expect, it } from 'vitest'
import type { ColorStop } from './themeTokens'
import { dieFillProps, flattenStops, linearGradientProps } from './gradients'

const STOPS: ColorStop[] = [
  { offset: 0, color: '#fff' },
  { offset: 1, color: '#000' },
]

describe('gradients', () => {
  it('flattens stops into Konva colorStops form', () => {
    expect(flattenStops(STOPS)).toEqual([0, '#fff', 1, '#000'])
  })

  it('builds a top-to-bottom linear gradient', () => {
    const props = linearGradientProps(100, 200, STOPS)
    expect(props.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 })
    expect(props.fillLinearGradientEndPoint).toEqual({ x: 0, y: 200 })
    expect(props.fillLinearGradientColorStops).toEqual([0, '#fff', 1, '#000'])
  })

  it('centers the die gradient for radial shapes on their local origin', () => {
    const rect = dieFillProps('rect', 100, 200, STOPS)
    expect(rect.fillLinearGradientStartPoint).toEqual({ x: 0, y: 0 })
    expect(rect.fillLinearGradientEndPoint).toEqual({ x: 0, y: 200 })

    const circle = dieFillProps('circle', 300, 300, STOPS)
    expect(circle.fillLinearGradientStartPoint).toEqual({ x: 0, y: -150 })
    expect(circle.fillLinearGradientEndPoint).toEqual({ x: 0, y: 150 })
  })
})
