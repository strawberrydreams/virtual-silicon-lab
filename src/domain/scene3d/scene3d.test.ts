import { describe, expect, it } from 'vitest'
import { resolveScene3D } from './scene3d'

describe('resolveScene3D camera', () => {
  it('derives distance from the larger of extent x/z and reproduces the baseline pose', () => {
    const { camera } = resolveScene3D({ extent: [100, 40, 60] })
    const distance = Math.max(100, 60) * 0.95

    expect(camera.fov).toBe(42)
    expect(camera.near).toBe(1)
    expect(camera.far).toBeCloseTo(distance * 10)
    expect(camera.baseOffset).toEqual([distance, distance * 0.9, distance])
    expect(camera.target).toEqual([0, 40 / 2, 0])
    expect(camera.minDistance).toBeCloseTo(distance * 0.45)
    expect(camera.maxDistance).toBeCloseTo(distance * 3)
  })
})

describe('resolveScene3D lights', () => {
  it('returns the baseline hemisphere + key/fill/rim rig in order', () => {
    const { lights } = resolveScene3D({ extent: [10, 5, 10] })

    expect(lights).toEqual([
      { kind: 'hemisphere', skyColor: 0xc8dcff, groundColor: 0x08080c, intensity: 1.2 },
      {
        kind: 'directional',
        color: 0xfff1e0,
        intensity: 3.2,
        position: [1, 2, 1],
        castShadow: true,
      },
      {
        kind: 'directional',
        color: 0xbcd0ff,
        intensity: 1.1,
        position: [-1.5, 1, 1.2],
        castShadow: false,
      },
      {
        kind: 'directional',
        color: 0xffffff,
        intensity: 1.6,
        position: [-0.5, 1.2, -2],
        castShadow: false,
      },
    ])
  })
})

describe('resolveScene3D animation', () => {
  it('returns the baseline turntable + glow defaults', () => {
    const { animation } = resolveScene3D({ extent: [10, 5, 10] })

    expect(animation.turntable).toEqual({ periodSeconds: 14 })
    expect(animation.glow).toEqual({ periodSeconds: 3, min: 0.8, max: 1.2 })
  })
})
