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

export function captureFrameAt(index: number, spec: CaptureSpec = CAPTURE): CaptureFrame {
  const tSeconds = index / spec.fps
  const azimuth = turntableAzimuthAt(tSeconds, { periodSeconds: spec.durationSeconds })
  const glowOptions: GlowPulseOptions = {
    periodSeconds: spec.durationSeconds / spec.glowCycles,
    min: GLOW_PULSE.min,
    max: GLOW_PULSE.max,
  }
  const glow = glowPulseAt(tSeconds, glowOptions)
  return { tSeconds, azimuth, glow }
}
