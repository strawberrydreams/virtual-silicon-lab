import { Hono } from 'hono'
import type { Project } from '@domain/project'
import type { AppDeps } from '../app'
import { getChipLineage, getPublicPublishedChipBySlug } from '../publish/service'
import { resolvePublicBaseUrl } from './baseUrl'
import { decodePngDataUrl } from './poster'
import { renderNotFoundHtml, renderViewerHtml } from './viewer'

export function shareRoutes({ db, publicBaseUrl, imageStore }: AppDeps) {
  const routes = new Hono()

  routes.get('/s/:slug/poster.png', (c) => {
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    const bytes =
      chip === null
        ? null
        : chip.posterImagePath === null
          ? decodePngDataUrl(chip.posterImageDataUrl)
          : (imageStore?.readPublishedImage(chip.posterImagePath) ?? null)
    if (bytes === null) return c.body(null, 404)
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
    })
  })

  routes.get('/s/:slug', (c) => {
    const baseUrl = resolvePublicBaseUrl(c.req.url, publicBaseUrl)
    const chip = getPublicPublishedChipBySlug(db, c.req.param('slug'))
    if (chip === null) return c.html(renderNotFoundHtml({ baseUrl }), 404)
    const project = JSON.parse(chip.projectJson) as Project
    const parent = getChipLineage(db, chip.slug)?.ancestors.at(-1)
    const remixedFrom =
      parent && !('hidden' in parent) ? { slug: parent.slug, title: parent.title } : undefined
    return c.html(
      renderViewerHtml({
        title: chip.title,
        ownerDisplayName: chip.ownerDisplayName,
        slug: chip.slug,
        project,
        baseUrl,
        remixedFrom,
      }),
    )
  })

  return routes
}
