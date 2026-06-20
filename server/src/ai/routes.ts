import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import type { AiLayoutContext } from '@domain/ai/aiLayoutSuggestion'
import { mapAiDraftToProject } from '@domain/ai/mapAiDraftToProject'
import { mapAiSpecDraftToFakeSpec } from '@domain/ai/mapAiSpecDraftToFakeSpec'
import type { AiChipContext } from '@domain/ai/aiSpecDraft'
import type { AiVariationContext } from '@domain/ai/aiVariationContext'
import type { AppDeps } from '../app'
import { getSessionUser } from '../accounts/service'
import { createFakeProvider } from './fakeProvider'
import { countRecentGenerations, logPrompt } from './quota'

const SESSION_COOKIE = 'vsl_session'
const MAX_PROMPT_LENGTH = 2000
const MAX_CONTEXT_BLOCKS = 64

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
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Prompt is too long.')
    }

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
    if (context.blockTypes.length > MAX_CONTEXT_BLOCKS) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Too many blocks.')
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
    if (context.blocks.length > MAX_CONTEXT_BLOCKS) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Too many blocks.')
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

  routes.post('/ai/generate-variations', async (c) => {
    const guard = await requireUserWithinQuota(c)
    if ('response' in guard) return guard.response
    const user = guard.user

    const body = (await c.req.json().catch(() => null)) as
      | { context?: unknown; count?: unknown }
      | null
    const raw = body?.context
    if (typeof raw !== 'object' || raw === null) {
      return fail(c, 400, 'INVALID_CONTEXT', 'Chip context is required.')
    }
    const source = raw as Record<string, unknown>
    const context: AiVariationContext = {
      name: typeof source.name === 'string' ? source.name : undefined,
      theme: (typeof source.theme === 'string' ? source.theme : 'neon') as AiVariationContext['theme'],
      dieShape: (typeof source.dieShape === 'string'
        ? source.dieShape
        : 'rect') as AiVariationContext['dieShape'],
      blocks: Array.isArray(source.blocks)
        ? source.blocks
            .filter((block): block is Record<string, unknown> =>
              typeof block === 'object' && block !== null,
            )
            .map((block) => ({
              type: typeof block.type === 'string' ? block.type : '',
              x: typeof block.x === 'number' ? block.x : 0,
              y: typeof block.y === 'number' ? block.y : 0,
              w: typeof block.w === 'number' ? block.w : 0,
              h: typeof block.h === 'number' ? block.h : 0,
            }))
        : [],
    }
    if (context.blocks.length > MAX_CONTEXT_BLOCKS) {
      return fail(c, 400, 'PAYLOAD_TOO_LARGE', 'Too many blocks.')
    }
    const rawCount = body?.count
    const requested =
      typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount > 0
        ? Math.floor(rawCount)
        : 3
    const count = Math.max(2, Math.min(4, requested))

    // Log before calling out so failed/abused attempts still count against the shared quota.
    logPrompt(
      db,
      {
        userId: user.id,
        kind: 'generate-variations',
        prompt: JSON.stringify({ context, count }),
      },
      now,
    )

    let result
    try {
      result = await aiProvider.generateVariations({ context, count })
    } catch {
      return fail(c, 503, 'AI_UNAVAILABLE', 'AI provider is unavailable.')
    }
    const variations = result.variations
      .slice(0, count)
      .map((draft) => mapAiDraftToProject(draft))
    return c.json({ variations })
  })

  return routes
}
