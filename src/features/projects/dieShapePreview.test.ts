import { describe, expect, it } from 'vitest'
import type { DieShape } from '../../domain/project'
import { dieShapePreviewClass } from './dieShapePreview'

describe('dieShapePreviewClass', () => {
  it.each<DieShape>([
    'rect',
    'square',
    'circle',
    'hexagon',
    'octagon',
    'rounded-rect',
    'chamfered-rect',
    'keyed',
    'l-shape',
    'plus',
  ])('returns a preview class for %s', (shape) => {
    expect(dieShapePreviewClass(shape)).toContain('aspect-')
  })

  it('preserves aspect ratio for the approved rectangular parametric shapes', () => {
    for (const shape of ['rounded-rect', 'chamfered-rect', 'keyed', 'l-shape'] as const) {
      expect(dieShapePreviewClass(shape)).toContain('aspect-[3/2]')
    }
  })

  it('uses square previews for octagon and plus', () => {
    expect(dieShapePreviewClass('octagon')).toContain('aspect-square')
    expect(dieShapePreviewClass('plus')).toContain('aspect-square')
  })
})
