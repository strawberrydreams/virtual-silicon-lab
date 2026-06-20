import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AiLayoutContext } from '@domain/ai/aiLayoutSuggestion'
import { mapAiDraftToProject } from '@domain/ai/mapAiDraftToProject'
import { mapAiSpecDraftToFakeSpec } from '@domain/ai/mapAiSpecDraftToFakeSpec'
import type { AiChipContext } from '@domain/ai/aiSpecDraft'
import type { AppDeps } from '../app'
import { getSessionUser } from '../accounts/service'
import { createFakeProvider } from './fakeProvider'
import { countRecentGenerations, logPrompt } from './quota'

const SESSION_COOKIE = 'vsl_session'

export function aiRoutes({
  db,
  sessionSecret,
  now = Date.now,
  aiProvider = createFakeProvider(),
  aiDailyQuota = 20,
}: AppDeps) {
  const routes = new Hono()

  function fail(c: Context, status: 400 | 401 | 429 | 503, code: string, message: string) {
    return c.json({ error: { code, message } }, status)
  }

  type GuardResult =
    | { user: NonNullable<ReturnType<typeof getSessionUser>> }
    | { response: Response }

  async function requireUserWithinQuota(c: Context): Promise<GuardResult> {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') {
      return { response: fail(c, 401, 'UNAUTHORIZED', 'Sign in required.') }
    }
    const user = getSessionUser(db, token, now)
    if (user === null) return { response: fail(c, 401, 'UNAUTHORIZED', 'Sign in required.') }
    if (countRecentGenerations(db, user.id, now) >= aiDailyQuota) {
      return { response: fail(c, 429, 'QUOTA_EXCEEDED', 'Daily AI generation limit reached.') }
    }
    return { user }
  }

  routes.post('/ai/generate-draft', async (c) => {
    const guard = await requireUserWithinQuota(c)
    if ('response' in guard) return guard.response
    const user = guard.user

    const body = (await c.req.json().catch(() => null)) as { prompt?: unknown } | null
    const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
    if (prompt.trim() === '') return fail(c, 400, 'INVALID_PROMPT', 'A prompt is required.')

    // Log before calling out so failed/abused attempts still count against the quota.
    logPrompt(db, { userId: user.id, kind: 'generate-draft', prompt }, now)

    let draft
    try {
      draft = await aiProvider.generateChipDraft({ prompt })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    return c.json({ project: mapAiDraftToProject(draft) })
  })

  routes.post('/ai/generate-copy', async (c) => {
    const guard = await requireUserWithinQuota(c)
    if ('response' in guard) return guard.response
    const user = guard.user

    const body = (await c.req.json().catch(() => null)) as { context?: unknown } | null
    const raw = body?.context
    if (typeof raw !== 'object' || raw === null) {
      return fail(c, 400, 'INVALID_CONTEXT', 'Chip context is required.')
    }
    const source = raw as Record<string, unknown>
    const context: AiChipContext = {
      name: typeof source.name === 'string' ? source.name : undefined,
      theme: (typeof source.theme === 'string' ? source.theme : 'neon') as AiChipContext['theme'],
      dieShape: (typeof source.dieShape === 'string'
        ? source.dieShape
        : 'rect') as AiChipContext['dieShape'],
      blockTypes: Array.isArray(source.blockTypes)
        ? source.blockTypes.filter((t): t is string => typeof t === 'string')
        : [],
    }

    // Log before calling out so failed/abused attempts still count against the shared quota.
    logPrompt(db, { userId: user.id, kind: 'generate-copy', prompt: JSON.stringify(context) }, now)

    let draft
    try {
      draft = await aiProvider.generateSpecCopy({ context })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    return c.json({ spec: mapAiSpecDraftToFakeSpec(draft) })
  })

  routes.post('/ai/suggest-layout', async (c) => {
    const guard = await requireUserWithinQuota(c)
    if ('response' in guard) return guard.response
    const user = guard.user

    const body = (await c.req.json().catch(() => null)) as { context?: unknown } | null
    const raw = body?.context
    if (typeof raw !== 'object' || raw === null) {
      return fail(c, 400, 'INVALID_CONTEXT', 'Chip context is required.')
    }
    const source = raw as Record<string, unknown>
    const context: AiLayoutContext = {
      dieShape: (typeof source.dieShape === 'string'
        ? source.dieShape
        : 'rect') as AiLayoutContext['dieShape'],
      blocks: Array.isArray(source.blocks)
        ? (source.blocks.filter(
            (block) => typeof block === 'object' && block !== null,
          ) as AiLayoutContext['blocks'])
        : [],
    }

    // Log before calling out so failed attempts still count against the shared quota.
    logPrompt(db, { userId: user.id, kind: 'suggest-layout', prompt: JSON.stringify(context) }, now)

    let result
    try {
      result = await aiProvider.generateLayoutSuggestions({ context })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    return c.json({ suggestions: result.suggestions })
  })

  return routes
}
