import { describe, expect, it } from 'vitest'
import { cameraSettingsFromPose, resolveScene3D } from './scene3d'

function expectVecClose(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(expected.length)
  for (let index = 0; index < expected.length; index += 1) {
    expect(actual[index]).toBeCloseTo(expected[index])
  }
}

describe('resolveScene3D camera', () => {
  it('derives distance from the larger of extent x/z and reproduces the baseline pose', () => {
    const { camera } = resolveScene3D({ extent: [100, 40, 60] })
    const distance = Math.max(100, 60) * 0.95

    expect(camera.fov).toBe(42)
    expect(camera.near).toBe(1)
    expect(camera.far).toBeCloseTo(distance * 10)
    expect(camera.baseOffset).toEqual([distance, distance * 0.9, distance])
    expect(camera.position).toEqual([distance, distance * 0.9, distance])
    expect(camera.target).toEqual([0, 40 / 2, 0])
    expect(camera.minDistance).toBeCloseTo(distance * 0.45)
    expect(camera.maxDistance).toBeCloseTo(distance * 3)
  })

  it('resolves an authored camera against the derived extent', () => {
    const { camera } = resolveScene3D(
      {
        camera: {
          azimuthRadians: Math.PI / 2,
          elevationRadians: Math.PI / 6,
          zoom: 0.5,
          targetNudge: [0.1, -0.2, 0.25],
          fov: 50,
        },
      },
      { extent: [100, 40, 60] },
    )
    const distance = Math.max(100, 60) * 0.95
    const resolvedDistance = distance * 0.45 + (distance * 3 - distance * 0.45) * 0.5
    const horizontalDistance = Math.cos(Math.PI / 6) * resolvedDistance
    const yOffset = Math.sin(Math.PI / 6) * resolvedDistance

    expect(camera.fov).toBe(50)
    expectVecClose(camera.target, [10, 12, 15])
    expectVecClose(camera.baseOffset, [horizontalDistance, yOffset, 0])
    expectVecClose(camera.position, [10 + horizontalDistance, 12 + yOffset, 15])
  })

  it('normalizes a concrete camera pose so it round-trips through the resolver', () => {
    const derived = { extent: [100, 40, 60] } as const
    const settings = cameraSettingsFromPose(
      {
        position: [130, 90, 50],
        target: [5, 18, -7],
        fov: 55,
      },
      derived,
    )

    const { camera } = resolveScene3D({ camera: settings }, derived)

    expect(settings.fov).toBe(55)
    expectVecClose(camera.position, [130, 90, 50])
    expectVecClose(camera.target, [5, 18, -7])
  })

  it('clamps authored camera settings to the safe range', () => {
    const { camera } = resolveScene3D(
      {
        camera: {
          azimuthRadians: Math.PI * 5,
          elevationRadians: 10,
          zoom: 5,
          targetNudge: [5, -5, 2],
          fov: 120,
        },
      },
      { extent: [100, 40, 60] },
    )

    expect(camera.fov).toBe(60)
    expect(camera.target).toEqual([100, -20, 60])
    expect(camera.baseOffset[1]).toBeCloseTo(Math.sin(1.4) * camera.maxDistance)
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
