import { describe, expect, it } from 'vitest'
import type { Block } from '../../../domain/project'
import { blocksByZIndex, editorStageFrameSize, editorStageSize, splitTileLabel } from './artworkLayout'

describe('splitTileLabel', () => {
  it('splits a two-line label into upper-cased title and sub', () => {
    expect(splitTileLabel('GPU Cluster\n12-core', 'GPU')).toEqual({ title: 'GPU CLUSTER', sub: '12-CORE' })
  })

  it('returns an empty sub for a single-line label', () => {
    expect(splitTileLabel('PCIe 4.0', 'IO')).toEqual({ title: 'PCIE 4.0', sub: '' })
  })

  it('falls back to the block type when no label is set', () => {
    expect(splitTileLabel(undefined, 'CPU')).toEqual({ title: 'CPU', sub: '' })
  })
})

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

describe('editorStageFrameSize', () => {
  it('adds a stable analysis frame around the editor stage', () => {
    expect(editorStageFrameSize({ shape: 'rect', width: 960, height: 640, background: 'grid-cyan' }))
      .toEqual({ width: 1056, height: 736 })
  })

  it('tracks expanded stage sizes for tall die presets', () => {
    expect(editorStageFrameSize({ shape: 'square', width: 720, height: 720, background: 'keynote-graphite' }))
      .toEqual({ width: 1056, height: 816 })
  })
})

describe('blocksByZIndex', () => {
  it('sorts complete block artwork from back to front', () => {
    const top = { id: 'top', zIndex: 3 } as Block
    const bottom = { id: 'bottom', zIndex: 1 } as Block
    expect(blocksByZIndex([top, bottom]).map((block) => block.id)).toEqual(['bottom', 'top'])
  })
})
