import type { Project } from '../domain/project'

export type AmbientAnimationFrame = {
  glowOpacityScale: number
  glowBlurScale: number
  traceOpacityScale: number
  traceDashOffset: number
}

export type AmbientMotionBudget = {
  tier: 'full' | 'glow-only' | 'static'
  animateGlow: boolean
  animateTraces: boolean
  reason: string | null
}

export const AMBIENT_LOOP_MS = 12000
export const AMBIENT_TRACE_DASH = [18, 30] as const

export const AMBIENT_CANONICAL_FRAME: AmbientAnimationFrame = {
  glowOpacityScale: 1,
  glowBlurScale: 1,
  traceOpacityScale: 1,
  traceDashOffset: 0,
}

export function ambientFrameAt(elapsedMs: number): AmbientAnimationFrame {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? elapsedMs : 0
  const wrappedMs = ((safeElapsedMs % AMBIENT_LOOP_MS) + AMBIENT_LOOP_MS) % AMBIENT_LOOP_MS
  if (wrappedMs === 0) return AMBIENT_CANONICAL_FRAME

  const phase = (wrappedMs / AMBIENT_LOOP_MS) * Math.PI * 2
  const glow = 0.5 + 0.5 * Math.sin(phase)
  const trace = 0.5 + 0.5 * Math.sin(phase + Math.PI / 2)

  return {
    glowOpacityScale: 0.88 + glow * 0.2,
    glowBlurScale: 0.92 + glow * 0.24,
    traceOpacityScale: 0.78 + trace * 0.22,
    traceDashOffset:
      (wrappedMs / AMBIENT_LOOP_MS) * (AMBIENT_TRACE_DASH[0] + AMBIENT_TRACE_DASH[1]),
  }
}

export function resolveAmbientMotionDefault(prefersReducedMotion: boolean): boolean {
  return !prefersReducedMotion
}

export function ambientMotionBudgetForProject(project: Project): AmbientMotionBudget {
  const animatedUnitCount =
    project.blocks.length +
    project.decorations.length +
    project.studio.stickers.length +
    project.studio.sprays.length

  if (animatedUnitCount > 320) {
    return {
      tier: 'static',
      animateGlow: false,
      animateTraces: false,
      reason: 'Project is too dense for editor ambient motion.',
    }
  }

  if (animatedUnitCount > 180) {
    return {
      tier: 'glow-only',
      animateGlow: true,
      animateTraces: false,
      reason: 'Trace shimmer paused on dense projects to protect canvas frame rate.',
    }
  }

  return { tier: 'full', animateGlow: true, animateTraces: true, reason: null }
}

export function shouldRunAmbientRaf(enabled: boolean, budget: AmbientMotionBudget): boolean {
  return enabled && (budget.animateGlow || budget.animateTraces)
}
