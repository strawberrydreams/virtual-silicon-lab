export type Scene3DBloomSettings = { threshold: number; strength: number; radius: number }

export type Scene3DEnvironmentSettings = {
  topColor: string
  bottomColor: string
  exposure: number
  bloom: Scene3DBloomSettings
}

export type SceneDerivedInputs = {
  extent: readonly [number, number, number]
  environment?: Scene3DEnvironmentSettings
}

export type Scene3DCameraSettings = {
  azimuthRadians: number
  elevationRadians: number
  zoom: number
  targetNudge?: readonly [number, number, number]
  fov?: number
}

export const SCENE_3D_LIGHTING_PRESETS = ['studio', 'neon-noir', 'daylight', 'dramatic'] as const
export const SCENE_3D_LIGHTING_INTENSITY_RANGE = { min: 0.35, max: 1.8 } as const
export const SCENE_3D_ENVIRONMENT_RANGES = {
  exposure: { min: 0.55, max: 1.65 },
  bloomThreshold: { min: 0.15, max: 0.95 },
  bloomStrength: { min: 0, max: 2.4 },
  bloomRadius: { min: 0.1, max: 1 },
} as const

export type Scene3DLightingPreset = (typeof SCENE_3D_LIGHTING_PRESETS)[number]

export type Scene3DLightingSettings = {
  preset: Scene3DLightingPreset
  intensity: number
}

export type Scene3DSettings = {
  camera?: Scene3DCameraSettings
  lighting?: Scene3DLightingSettings
  environment?: Scene3DEnvironmentSettings
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
  environment: Scene3DEnvironmentSettings
  animation: ResolvedAnimation
}

const BASELINE_LIGHTS: readonly ResolvedLight[] = [
  { kind: 'hemisphere', skyColor: 0xc8dcff, groundColor: 0x08080c, intensity: 1.2 },
  { kind: 'directional', color: 0xfff1e0, intensity: 3.2, position: [1, 2, 1], castShadow: true },
  { kind: 'directional', color: 0xbcd0ff, intensity: 1.1, position: [-1.5, 1, 1.2], castShadow: false },
  { kind: 'directional', color: 0xffffff, intensity: 1.6, position: [-0.5, 1.2, -2], castShadow: false },
]

const LIGHTING_RIGS: Record<Scene3DLightingPreset, readonly ResolvedLight[]> = {
  studio: BASELINE_LIGHTS,
  'neon-noir': [
    { kind: 'hemisphere', skyColor: 0x42f5ff, groundColor: 0x08020f, intensity: 0.85 },
    { kind: 'directional', color: 0x66fff0, intensity: 2.7, position: [1.1, 1.8, 0.8], castShadow: true },
    { kind: 'directional', color: 0xff4fd8, intensity: 1.45, position: [-1.6, 0.9, 1.3], castShadow: false },
    { kind: 'directional', color: 0xf6f8ff, intensity: 2.05, position: [-0.3, 1.25, -2.2], castShadow: false },
  ],
  daylight: [
    { kind: 'hemisphere', skyColor: 0xd9ecff, groundColor: 0x4a4638, intensity: 1.45 },
    { kind: 'directional', color: 0xfff4d6, intensity: 3.0, position: [0.8, 2.3, 0.6], castShadow: true },
    { kind: 'directional', color: 0xd7e5ff, intensity: 1.35, position: [-1.8, 1.1, 1.1], castShadow: false },
    { kind: 'directional', color: 0xffffff, intensity: 1.15, position: [-0.6, 1.4, -1.8], castShadow: false },
  ],
  dramatic: [
    { kind: 'hemisphere', skyColor: 0x5d7197, groundColor: 0x050507, intensity: 0.65 },
    { kind: 'directional', color: 0xffd2a0, intensity: 4.1, position: [1.4, 2.4, 0.7], castShadow: true },
    { kind: 'directional', color: 0x526dff, intensity: 0.55, position: [-1.6, 0.8, 1.4], castShadow: false },
    { kind: 'directional', color: 0xffffff, intensity: 2.7, position: [-0.4, 1.5, -2.4], castShadow: false },
  ],
}

const BASELINE_ANIMATION: ResolvedAnimation = {
  turntable: { periodSeconds: 14 },
  glow: { periodSeconds: 3, min: 0.8, max: 1.2 },
}

const BASELINE_ENVIRONMENT: Scene3DEnvironmentSettings = {
  topColor: '#03070b',
  bottomColor: '#0c1320',
  exposure: 1,
  bloom: { threshold: 0.5, strength: 0.9, radius: 0.55 },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function normalizeHexColor(value: string): string {
  return value.toLowerCase()
}

function normalizePersistedCameraSettings(value: unknown): Scene3DCameraSettings | undefined {
  if (!isRecord(value)) return undefined
  if (
    typeof value.azimuthRadians !== 'number' ||
    !Number.isFinite(value.azimuthRadians) ||
    typeof value.elevationRadians !== 'number' ||
    !Number.isFinite(value.elevationRadians) ||
    typeof value.zoom !== 'number' ||
    !Number.isFinite(value.zoom)
  ) {
    return undefined
  }

  const targetNudge =
    Array.isArray(value.targetNudge) &&
    value.targetNudge.length === 3 &&
    value.targetNudge.every((component) => typeof component === 'number' && Number.isFinite(component))
      ? ([value.targetNudge[0], value.targetNudge[1], value.targetNudge[2]] as const)
      : undefined
  const fov = typeof value.fov === 'number' && Number.isFinite(value.fov) ? value.fov : undefined
  return normalizeCameraSettings({
    azimuthRadians: value.azimuthRadians,
    elevationRadians: value.elevationRadians,
    zoom: value.zoom,
    ...(targetNudge === undefined ? {} : { targetNudge }),
    ...(fov === undefined ? {} : { fov }),
  })
}

function isScene3DLightingPreset(value: unknown): value is Scene3DLightingPreset {
  return typeof value === 'string' && SCENE_3D_LIGHTING_PRESETS.includes(value as Scene3DLightingPreset)
}

function normalizeLightingSettings(
  settings: Scene3DLightingSettings | undefined,
): Scene3DLightingSettings | undefined {
  if (settings === undefined) return undefined
  return {
    preset: settings.preset,
    intensity: clamp(
      finiteOr(settings.intensity, 1),
      SCENE_3D_LIGHTING_INTENSITY_RANGE.min,
      SCENE_3D_LIGHTING_INTENSITY_RANGE.max,
    ),
  }
}

function normalizePersistedLightingSettings(value: unknown): Scene3DLightingSettings | undefined {
  if (!isRecord(value)) return undefined
  if (!isScene3DLightingPreset(value.preset)) return undefined
  if (typeof value.intensity !== 'number' || !Number.isFinite(value.intensity)) return undefined
  return normalizeLightingSettings({ preset: value.preset, intensity: value.intensity })
}

function normalizeEnvironmentSettings(
  settings: Scene3DEnvironmentSettings | undefined,
): Scene3DEnvironmentSettings | undefined {
  if (settings === undefined) return undefined
  return {
    topColor: normalizeHexColor(settings.topColor),
    bottomColor: normalizeHexColor(settings.bottomColor),
    exposure: clamp(
      finiteOr(settings.exposure, 1),
      SCENE_3D_ENVIRONMENT_RANGES.exposure.min,
      SCENE_3D_ENVIRONMENT_RANGES.exposure.max,
    ),
    bloom: {
      threshold: clamp(
        finiteOr(settings.bloom.threshold, 0.5),
        SCENE_3D_ENVIRONMENT_RANGES.bloomThreshold.min,
        SCENE_3D_ENVIRONMENT_RANGES.bloomThreshold.max,
      ),
      strength: clamp(
        finiteOr(settings.bloom.strength, 0.9),
        SCENE_3D_ENVIRONMENT_RANGES.bloomStrength.min,
        SCENE_3D_ENVIRONMENT_RANGES.bloomStrength.max,
      ),
      radius: clamp(
        finiteOr(settings.bloom.radius, 0.55),
        SCENE_3D_ENVIRONMENT_RANGES.bloomRadius.min,
        SCENE_3D_ENVIRONMENT_RANGES.bloomRadius.max,
      ),
    },
  }
}

function normalizePersistedEnvironmentSettings(value: unknown): Scene3DEnvironmentSettings | undefined {
  if (!isRecord(value)) return undefined
  if (!isHexColor(value.topColor) || !isHexColor(value.bottomColor)) return undefined
  if (typeof value.exposure !== 'number' || !Number.isFinite(value.exposure)) return undefined
  if (!isRecord(value.bloom)) return undefined
  if (
    typeof value.bloom.threshold !== 'number' ||
    !Number.isFinite(value.bloom.threshold) ||
    typeof value.bloom.strength !== 'number' ||
    !Number.isFinite(value.bloom.strength) ||
    typeof value.bloom.radius !== 'number' ||
    !Number.isFinite(value.bloom.radius)
  ) {
    return undefined
  }
  return normalizeEnvironmentSettings({
    topColor: value.topColor,
    bottomColor: value.bottomColor,
    exposure: value.exposure,
    bloom: {
      threshold: value.bloom.threshold,
      strength: value.bloom.strength,
      radius: value.bloom.radius,
    },
  })
}

export function normalizeScene3DSettings(value: unknown): Scene3DSettings | undefined {
  if (!isRecord(value)) return undefined
  const camera = normalizePersistedCameraSettings(value.camera)
  const lighting = normalizePersistedLightingSettings(value.lighting)
  const environment = normalizePersistedEnvironmentSettings(value.environment)
  if (camera === undefined && lighting === undefined && environment === undefined) return undefined
  return {
    ...(camera === undefined ? {} : { camera }),
    ...(lighting === undefined ? {} : { lighting }),
    ...(environment === undefined ? {} : { environment }),
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

function resolveLights(settings: Scene3DLightingSettings | undefined): readonly ResolvedLight[] {
  if (settings === undefined) return BASELINE_LIGHTS
  const lighting = normalizeLightingSettings(settings)!
  return LIGHTING_RIGS[lighting.preset].map((light) => {
    if (light.kind === 'hemisphere') {
      return { ...light, intensity: light.intensity * lighting.intensity }
    }
    return { ...light, intensity: light.intensity * lighting.intensity }
  })
}

function resolveEnvironment(
  settings: Scene3DEnvironmentSettings | undefined,
  derived: SceneDerivedInputs,
): Scene3DEnvironmentSettings {
  return normalizeEnvironmentSettings(settings ?? derived.environment ?? BASELINE_ENVIRONMENT)!
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
    lights: resolveLights(settings?.lighting),
    environment: resolveEnvironment(settings?.environment, derived),
    animation: BASELINE_ANIMATION,
  }
}
