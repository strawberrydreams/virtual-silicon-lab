import { describe, expect, it, vi } from 'vitest'
import { webglAvailable } from './chip3dAvailability'

describe('webglAvailable', () => {
  it('does not probe canvas when the runtime exposes no WebGL constructors', () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({} as never)

    expect(typeof WebGLRenderingContext).toBe('undefined')
    expect(typeof WebGL2RenderingContext).toBe('undefined')
    expect(webglAvailable()).toBe(false)
    expect(getContext).not.toHaveBeenCalled()
  })
})
