export type SceneDerivedInputs = {
  extent: readonly [number, number, number]
}

export type ResolvedCamera = {
  fov: number
  near: number
  far: number
  baseOffset: readonly [number, number, number]
  target: readonly [number, number, number]
  minDistance: number
  maxDistance: number
}

export type ResolvedLight =
  | { kind: 'hemisphere'; skyColor: number; groundColor: number; intensity: number }
  | {
      kind: 'directional'
      color: number
      intensity: number
      position: readonly [number, number, number]
      castShadow: boolean
    }

export type ResolvedAnimation = {
  turntable: { periodSeconds: number }
  glow: { periodSeconds: number; min: number; max: number }
}

export type ResolvedScene3D = {
  camera: ResolvedCamera
  lights: readonly ResolvedLight[]
  animation: ResolvedAnimation
}

const BASELINE_LIGHTS: readonly ResolvedLight[] = [
  { kind: 'hemisphere', skyColor: 0xc8dcff, groundColor: 0x08080c, intensity: 1.2 },
  { kind: 'directional', color: 0xfff1e0, intensity: 3.2, position: [1, 2, 1], castShadow: true },
  { kind: 'directional', color: 0xbcd0ff, intensity: 1.1, position: [-1.5, 1, 1.2], castShadow: false },
  { kind: 'directional', color: 0xffffff, intensity: 1.6, position: [-0.5, 1.2, -2], castShadow: false },
]

const BASELINE_ANIMATION: ResolvedAnimation = {
  turntable: { periodSeconds: 14 },
  glow: { periodSeconds: 3, min: 0.8, max: 1.2 },
}

export function resolveScene3D(derived: SceneDerivedInputs): ResolvedScene3D {
  const [extentX, extentY, extentZ] = derived.extent
  const distance = Math.max(extentX, extentZ) * 0.95

  return {
    camera: {
      fov: 42,
      near: 1,
      far: distance * 10,
      baseOffset: [distance, distance * 0.9, distance],
      target: [0, extentY / 2, 0],
      minDistance: distance * 0.45,
      maxDistance: distance * 3,
    },
    lights: BASELINE_LIGHTS,
    animation: BASELINE_ANIMATION,
  }
}
