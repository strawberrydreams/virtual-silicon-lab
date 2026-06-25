export type SceneDerivedInputs = {
  extent: readonly [number, number, number]
}

export type Scene3DCameraSettings = {
  azimuthRadians: number
  elevationRadians: number
  zoom: number
  targetNudge?: readonly [number, number, number]
  fov?: number
}

export type Scene3DSettings = {
  camera?: Scene3DCameraSettings
  lighting?: unknown
  environment?: unknown
  animation?: unknown
}

export type ResolvedCamera = {
  fov: number
  near: number
  far: number
  position: readonly [number, number, number]
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

const MIN_ELEVATION = 0.08
const MAX_ELEVATION = 1.4
const MIN_FOV = 28
const MAX_FOV = 60

type CameraPose = {
  position: readonly [number, number, number]
  target: readonly [number, number, number]
  fov: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function wrapRadians(value: number): number {
  const turn = Math.PI * 2
  let wrapped = ((value + Math.PI) % turn + turn) % turn - Math.PI
  if (Object.is(wrapped, -Math.PI)) wrapped = Math.PI
  return wrapped
}

function targetFromNudge(
  nudge: readonly [number, number, number] | undefined,
  derived: SceneDerivedInputs,
): readonly [number, number, number] {
  const [extentX, extentY, extentZ] = derived.extent
  if (nudge === undefined) return [0, extentY / 2, 0]
  return [nudge[0] * extentX, extentY / 2 + nudge[1] * extentY, nudge[2] * extentZ]
}

function cameraMetrics(derived: SceneDerivedInputs) {
  const [extentX, extentY, extentZ] = derived.extent
  const distance = Math.max(extentX, extentZ) * 0.95
  const minDistance = distance * 0.45
  const maxDistance = distance * 3
  return { distance, minDistance, maxDistance, target: [0, extentY / 2, 0] as const }
}

function normalizeCameraSettings(
  settings: Scene3DCameraSettings | undefined,
): Scene3DCameraSettings | undefined {
  if (settings === undefined) return undefined
  const targetNudge =
    settings.targetNudge === undefined
      ? undefined
      : ([
          clamp(finiteOr(settings.targetNudge[0], 0), -1, 1),
          clamp(finiteOr(settings.targetNudge[1], 0), -1, 1),
          clamp(finiteOr(settings.targetNudge[2], 0), -1, 1),
        ] as const)
  return {
    azimuthRadians: wrapRadians(finiteOr(settings.azimuthRadians, Math.PI / 4)),
    elevationRadians: clamp(finiteOr(settings.elevationRadians, 0.56), MIN_ELEVATION, MAX_ELEVATION),
    zoom: clamp(finiteOr(settings.zoom, 0.25), 0, 1),
    ...(targetNudge === undefined ? {} : { targetNudge }),
    ...(settings.fov === undefined ? {} : { fov: clamp(finiteOr(settings.fov, 42), MIN_FOV, MAX_FOV) }),
  }
}

function resolveCamera(
  settings: Scene3DCameraSettings | undefined,
  derived: SceneDerivedInputs,
): ResolvedCamera {
  const { distance, minDistance, maxDistance, target } = cameraMetrics(derived)
  if (settings === undefined) {
    const position = [distance, distance * 0.9, distance] as const
    return {
      fov: 42,
      near: 1,
      far: distance * 10,
      position,
      baseOffset: position,
      target,
      minDistance,
      maxDistance,
    }
  }

  const camera = normalizeCameraSettings(settings)!
  const resolvedDistance = minDistance + (maxDistance - minDistance) * camera.zoom
  const horizontalDistance = Math.cos(camera.elevationRadians) * resolvedDistance
  const baseOffset = [
    Math.sin(camera.azimuthRadians) * horizontalDistance,
    Math.sin(camera.elevationRadians) * resolvedDistance,
    Math.cos(camera.azimuthRadians) * horizontalDistance,
  ] as const
  const resolvedTarget = targetFromNudge(camera.targetNudge, derived)
  return {
    fov: camera.fov ?? 42,
    near: 1,
    far: distance * 10,
    position: [
      resolvedTarget[0] + baseOffset[0],
      resolvedTarget[1] + baseOffset[1],
      resolvedTarget[2] + baseOffset[2],
    ],
    baseOffset,
    target: resolvedTarget,
    minDistance,
    maxDistance,
  }
}

export function cameraSettingsFromPose(
  pose: CameraPose,
  derived: SceneDerivedInputs,
): Scene3DCameraSettings {
  const { minDistance, maxDistance } = cameraMetrics(derived)
  const offset = [
    pose.position[0] - pose.target[0],
    pose.position[1] - pose.target[1],
    pose.position[2] - pose.target[2],
  ] as const
  const horizontalDistance = Math.hypot(offset[0], offset[2])
  const distance = Math.hypot(horizontalDistance, offset[1])
  const zoom =
    maxDistance === minDistance ? 0 : clamp((distance - minDistance) / (maxDistance - minDistance), 0, 1)
  const [extentX, extentY, extentZ] = derived.extent
  return normalizeCameraSettings({
    azimuthRadians: Math.atan2(offset[0], offset[2]),
    elevationRadians: Math.atan2(offset[1], horizontalDistance),
    zoom,
    targetNudge: [
      extentX === 0 ? 0 : pose.target[0] / extentX,
      extentY === 0 ? 0 : (pose.target[1] - extentY / 2) / extentY,
      extentZ === 0 ? 0 : pose.target[2] / extentZ,
    ],
    fov: pose.fov,
  })!
}

export function resolveScene3D(derived: SceneDerivedInputs): ResolvedScene3D
export function resolveScene3D(
  settings: Scene3DSettings | undefined,
  derived: SceneDerivedInputs,
): ResolvedScene3D
export function resolveScene3D(
  settingsOrDerived: Scene3DSettings | SceneDerivedInputs | undefined,
  maybeDerived?: SceneDerivedInputs,
): ResolvedScene3D {
  const settings = maybeDerived === undefined ? undefined : (settingsOrDerived as Scene3DSettings | undefined)
  const derived = maybeDerived ?? (settingsOrDerived as SceneDerivedInputs)
  return {
    camera: resolveCamera(settings?.camera, derived),
    lights: BASELINE_LIGHTS,
    animation: BASELINE_ANIMATION,
  }
}
