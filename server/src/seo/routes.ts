import { Hono } from 'hono'
import type { AppDeps } from '../app'
import { resolvePublicBaseUrl } from '../share/baseUrl'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function seoRoutes({ db, publicBaseUrl }: AppDeps) {
  const routes = new Hono()

  routes.get('/robots.txt', (c) => {
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    return c.text(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`)
  })

  routes.get('/sitemap.xml', (c) => {
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    const chipRows = db
      .prepare(
        `SELECT slug FROM published_chips
         WHERE is_public = 1 AND moderation_status = 'visible'
         ORDER BY updated_at DESC`,
      )
      .all() as { slug: string }[]
    const profileRows = db
      .prepare(
        `SELECT handle FROM users
         WHERE handle IS NOT NULL AND banned_at IS NULL
         ORDER BY handle ASC`,
      )
      .all() as { handle: string }[]
    const urls = [
      ...chipRows.map((row) => `${baseUrl}/s/${encodeURIComponent(row.slug)}`),
      ...profileRows.map((row) => `${baseUrl}/u/${encodeURIComponent(row.handle)}`),
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
      .join('\n')}\n</urlset>\n`
    return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
  })

  return routes
}
