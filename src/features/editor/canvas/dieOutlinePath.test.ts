import { describe, expect, it, vi } from 'vitest'
import type { Die } from '../../../domain/project'
import { resolveDieOutline } from '../../../domain/die/dieOutline'
import { traceDieOutline, type OutlineContext } from './dieOutlinePath'

const die = (shape: Die['shape']): Die => ({
  shape,
  width: 600,
  height: 600,
  background: 'grid-cyan',
})

function context() {
  return {
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
  } satisfies OutlineContext
}

describe('traceDieOutline', () => {
  it('traces four arcs for a rounded rectangle and closes once', () => {
    const target = context()
    traceDieOutline(target, resolveDieOutline(die('rounded-rect')))
    expect(target.arc).toHaveBeenCalledTimes(4)
    expect(target.lineTo).toHaveBeenCalledTimes(4)
    expect(target.closePath).toHaveBeenCalledTimes(1)
  })

  it('traces an L-shape with lines only', () => {
    const target = context()
    traceDieOutline(target, resolveDieOutline(die('l-shape')))
    expect(target.arc).not.toHaveBeenCalled()
    expect(target.lineTo).toHaveBeenCalledTimes(6)
    expect(target.closePath).toHaveBeenCalledTimes(1)
  })
})
