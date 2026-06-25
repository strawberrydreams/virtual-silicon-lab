import { describe, expect, it, vi } from 'vitest'
import type { DieShape } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import { resolveChip3DStyle } from '../visual/chip3d/chip3dMaterials'
import {
  buildChip3DShowcaseModel,
  isChip3DShapeSupported,
  webglAvailable,
} from './chip3dAvailability'

const ALL_DIE_SHAPES = [
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
] as const satisfies readonly DieShape[]

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

describe('isChip3DShapeSupported', () => {
  it.each(ALL_DIE_SHAPES)('supports %s in the 3D showcase', (shape) => {
    expect(isChip3DShapeSupported(shape)).toBe(true)
  })
})

describe('buildChip3DShowcaseModel', () => {
  it('threads block material overrides into the shared 3D model', () => {
    const project = createProject('3D Override', '3d-override', 100)
    project.theme = 'neon'
    project.finish = 'gloss'
    project.blocks = [
      {
        id: 'cpu',
        type: 'CPU',
        category: 'real',
        x: 40,
        y: 40,
        w: 120,
        h: 80,
        rotation: 0,
        finish: 'matte',
        zIndex: 0,
      },
    ]

    const model = buildChip3DShowcaseModel(project)
    const block = model.pieces.find((piece) => piece.kind === 'blockSurface')!

    expect(block.material).toEqual(resolveChip3DStyle('neon', 'matte').materials.blockReal)
  })

  it('carries persisted scene3d settings into the shared 3D model', () => {
    const project = createProject('3D Camera', '3d-camera', 100)
    project.scene3d = {
      camera: {
        azimuthRadians: 0.4,
        elevationRadians: 0.5,
        zoom: 0.6,
        targetNudge: [0.1, 0.2, -0.1],
        fov: 48,
      },
    }

    const model = buildChip3DShowcaseModel(project)

    expect(model.scene3d).toEqual(project.scene3d)
  })
})
