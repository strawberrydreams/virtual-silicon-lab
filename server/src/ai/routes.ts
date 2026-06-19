import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { mapAiDraftToProject } from '@domain/ai/mapAiDraftToProject'
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

  routes.post('/ai/generate-draft', async (c) => {
    const token = await getSignedCookie(c, sessionSecret, SESSION_COOKIE)
    if (typeof token !== 'string' || token === '') {
      return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')
    }
    const user = getSessionUser(db, token, now)
    if (user === null) return fail(c, 401, 'UNAUTHORIZED', 'Sign in required.')

    if (countRecentGenerations(db, user.id, now) >= aiDailyQuota) {
      return fail(c, 429, 'QUOTA_EXCEEDED', 'Daily AI generation limit reached.')
    }

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

  return routes
}
