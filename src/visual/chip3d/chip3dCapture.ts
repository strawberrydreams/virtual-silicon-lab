import type { ResolvedAnimation } from '../../domain/scene3d/scene3d'
import {
  GLOW_PULSE,
  glowPulseAt,
  turntableAzimuthAt,
  type GlowPulseOptions,
} from './chip3dAnimation'

export type CaptureSpec = {
  width: number
  height: number
  fps: number
  durationSeconds: number
  glowCycles: number
}

export const CAPTURE: CaptureSpec = {
  width: 1280,
  height: 720,
  fps: 30,
  durationSeconds: 8,
  glowCycles: 3,
}

export type CaptureFrame = {
  tSeconds: number
  azimuth: number
  glow: number
}

export function captureFrameCount(spec: CaptureSpec = CAPTURE): number {
  return Math.round(spec.durationSeconds * spec.fps)
}

export function captureFrameAt(
  index: number,
  spec: CaptureSpec = CAPTURE,
  animation?: ResolvedAnimation,
): CaptureFrame {
  const tSeconds = index / spec.fps
  const turntable = animation?.turntable ?? { enabled: true, periodSeconds: spec.durationSeconds }
  const azimuth = turntable.enabled ? turntableAzimuthAt(tSeconds, turntable) : 0
  const glowOptions: GlowPulseOptions & { enabled: boolean } = animation?.glow ?? {
    enabled: true,
    periodSeconds: spec.durationSeconds / spec.glowCycles,
    min: GLOW_PULSE.min,
    max: GLOW_PULSE.max,
  }
  const glow = glowOptions.enabled ? glowPulseAt(tSeconds, glowOptions) : 1
  return { tSeconds, azimuth, glow }
}
