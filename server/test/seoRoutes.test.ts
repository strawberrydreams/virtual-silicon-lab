import { describe, expect, it } from 'vitest'
import { createTestApp } from './helpers'

describe('seo routes', () => {
  it('serves robots.txt and sitemap.xml with public chips and profiles only', async () => {
    const { app, db } = createTestApp(Date.now, { publicBaseUrl: 'https://vsl.test' })
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, handle, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    ).run('u1', 'a@example.com', 'Ada', 'h', 'ada_lab', 0, 0)
    db.prepare(
      'INSERT INTO users (id, email, display_name, password_hash, handle, banned_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    ).run('u2', 'b@example.com', 'Banned', 'h', 'banned_lab', 1, 0, 0)
    db.prepare(
      `INSERT INTO published_chips
       (id, owner_user_id, source_project_id, slug, title, project_json, die_image_data_url, poster_image_data_url, is_public, moderation_status, created_at, updated_at, published_at)
       VALUES ('chip1','u1','p1','public-chip','Public','{}','','',1,'visible',0,0,0),
              ('chip2','u1','p2','private-chip','Private','{}','','',0,'visible',0,0,0),
              ('chip3','u1','p3','hidden-chip','Hidden','{}','','',1,'hidden',0,0,0)`,
    ).run()

    const robots = await app.request('/robots.txt')
    expect(robots.status).toBe(200)
    expect(robots.headers.get('content-type')).toContain('text/plain')
    expect(await robots.text()).toContain('Sitemap: https://vsl.test/sitemap.xml')

    const sitemap = await app.request('/sitemap.xml')
    expect(sitemap.status).toBe(200)
    expect(sitemap.headers.get('content-type')).toContain('application/xml')
    const xml = await sitemap.text()
    expect(xml).toContain('https://vsl.test/s/public-chip')
    expect(xml).toContain('https://vsl.test/u/ada_lab')
    expect(xml).not.toContain('private-chip')
    expect(xml).not.toContain('hidden-chip')
    expect(xml).not.toContain('banned_lab')
  })
})
