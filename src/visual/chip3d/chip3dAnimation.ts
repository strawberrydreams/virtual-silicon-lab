export type TurntableOptions = { periodSeconds: number }
export type GlowPulseOptions = { periodSeconds: number; min: number; max: number }

// Centralized, tunable defaults (browser QA may adjust these — keep them here, not in src/three/).
export const TURNTABLE: TurntableOptions = { periodSeconds: 14 }
export const GLOW_PULSE: GlowPulseOptions = { periodSeconds: 3, min: 0.8, max: 1.2 }

// Constant angular velocity: linear in t, so it wraps seamlessly at 2π (no jank at the loop boundary).
export function turntableAzimuthAt(
  elapsedSeconds: number,
  opts: TurntableOptions = TURNTABLE,
): number {
  return (elapsedSeconds / opts.periodSeconds) * Math.PI * 2
}

// Sine "breathing" multiplier in [min, max], starting at the midpoint; continuous and periodic.
export function glowPulseAt(
  elapsedSeconds: number,
  opts: GlowPulseOptions = GLOW_PULSE,
): number {
  const phase = (elapsedSeconds / opts.periodSeconds) * Math.PI * 2
  return opts.min + (opts.max - opts.min) * (0.5 + 0.5 * Math.sin(phase))
}
