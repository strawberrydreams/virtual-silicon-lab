import { describe, expect, it } from 'vitest'
import { createTestApp, jsonRequest, sessionCookie, VALID_SIGNUP } from './helpers'

async function signUp(app: ReturnType<typeof createTestApp>['app'], email: string) {
  const res = await app.request(
    '/api/auth/signup',
    jsonRequest('POST', { ...VALID_SIGNUP, email }),
  )
  return sessionCookie(res)
}

function project(id: string, updatedAt: number, extra: Record<string, unknown> = {}) {
  return { id, updatedAt, name: `chip-${id}`, ...extra }
}

describe('sync routes', () => {
  it('requires a session for every endpoint', async () => {
    const { app } = createTestApp()
    expect((await app.request('/api/sync/projects')).status).toBe(401)
    expect(
      (await app.request('/api/sync/projects/p1', jsonRequest('PUT', project('p1', 1)))).status,
    ).toBe(401)
    expect((await app.request('/api/sync/projects/p1', { method: 'DELETE' })).status).toBe(401)
  })

  it('pushes a project and pulls it back for the same user', async () => {
    const { app } = createTestApp()
    const cookie = await signUp(app, 'ada@example.com')

    const put = await app.request(
      '/api/sync/projects/p1',
      jsonRequest('PUT', project('p1', 100), cookie),
    )
    expect(put.status).toBe(200)
    expect(await put.json()).toEqual({
      project: { projectId: 'p1', updatedAt: 100, deleted: false, project: project('p1', 100) },
    })

    const pull = await app.request('/api/sync/projects', { headers: { cookie } })
    expect(await pull.json()).toEqual({
      projects: [
        { projectId: 'p1', updatedAt: 100, deleted: false, project: project('p1', 100) },
      ],
    })
  })

  it('applies last-write-wins on push and returns the stored winner', async () => {
    const { app } = createTestApp()
    const cookie = await signUp(app, 'ada@example.com')
    await app.request('/api/sync/projects/p1', jsonRequest('PUT', project('p1', 200), cookie))

    const stale = await app.request(
      '/api/sync/projects/p1',
      jsonRequest('PUT', project('p1', 100, { name: 'stale' }), cookie),
    )
    expect(await stale.json()).toEqual({
      project: { projectId: 'p1', updatedAt: 200, deleted: false, project: project('p1', 200) },
    })
  })

  it('filters pull by since', async () => {
    const { app } = createTestApp()
    const cookie = await signUp(app, 'ada@example.com')
    await app.request('/api/sync/projects/p1', jsonRequest('PUT', project('p1', 100), cookie))
    await app.request('/api/sync/projects/p2', jsonRequest('PUT', project('p2', 300), cookie))

    const pull = await app.request('/api/sync/projects?since=150', { headers: { cookie } })
    const body = (await pull.json()) as { projects: { projectId: string }[] }
    expect(body.projects.map((p) => p.projectId)).toEqual(['p2'])
  })

  it('tombstones on delete and surfaces the tombstone on pull', async () => {
    const { app } = createTestApp()
    const cookie = await signUp(app, 'ada@example.com')
    await app.request('/api/sync/projects/p1', jsonRequest('PUT', project('p1', 100), cookie))

    const del = await app.request('/api/sync/projects/p1', { method: 'DELETE', headers: { cookie } })
    const delBody = (await del.json()) as { project: { deleted: boolean; project: unknown } }
    expect(delBody.project.deleted).toBe(true)
    expect(delBody.project.project).toBeNull()

    const pull = await app.request('/api/sync/projects', { headers: { cookie } })
    const body = (await pull.json()) as { projects: { projectId: string; deleted: boolean }[] }
    expect(body.projects).toEqual([
      expect.objectContaining({ projectId: 'p1', deleted: true }),
    ])
  })

  it('rejects a push whose body id does not match the url', async () => {
    const { app } = createTestApp()
    const cookie = await signUp(app, 'ada@example.com')
    const res = await app.request(
      '/api/sync/projects/p1',
      jsonRequest('PUT', project('other', 100), cookie),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('INVALID_INPUT')
  })

  it("never leaks another user's projects", async () => {
    const { app } = createTestApp()
    const ada = await signUp(app, 'ada@example.com')
    const bob = await signUp(app, 'bob@example.com')
    await app.request('/api/sync/projects/p1', jsonRequest('PUT', project('p1', 100), ada))

    const bobPull = await app.request('/api/sync/projects', { headers: { cookie: bob } })
    expect(await bobPull.json()).toEqual({ projects: [] })
  })
})
