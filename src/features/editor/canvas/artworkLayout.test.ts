import { describe, expect, it } from 'vitest'
import { editorStageSize } from './artworkLayout'

describe('editorStageSize', () => {
  it('keeps the blank rectangular canvas at its established size', () => {
    expect(editorStageSize({ shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }))
      .toEqual({ width: 960, height: 640 })
  })

  it('expands to show every pixel of a 720 square preset', () => {
    expect(editorStageSize({ shape: 'square', width: 720, height: 720, background: 'keynote-graphite' }))
      .toEqual({ width: 960, height: 720 })
  })
})
