import { describe, expect, it } from 'vitest'
import { buildShareUrl, resolvePublicBaseUrl } from '../src/share/baseUrl'
import { decodePngDataUrl } from '../src/share/poster'
import { createProject } from '@domain/projectFactory'
import { escapeHtml, renderNotFoundHtml, renderViewerHtml } from '../src/share/viewer'

describe('resolvePublicBaseUrl', () => {
  it('prefers the configured base and strips trailing slashes', () => {
    expect(resolvePublicBaseUrl('http://localhost/s/abc', 'https://chips.example.com/')).toBe(
      'https://chips.example.com',
    )
  })

  it('falls back to the request origin when no base is configured', () => {
    expect(resolvePublicBaseUrl('http://127.0.0.1:8787/s/abc', undefined)).toBe(
      'http://127.0.0.1:8787',
    )
    expect(resolvePublicBaseUrl('http://127.0.0.1:8787/s/abc', '')).toBe('http://127.0.0.1:8787')
  })
})

describe('buildShareUrl', () => {
  it('joins the base and slug under /s/', () => {
    expect(buildShareUrl('https://chips.example.com', 'ada-chip-deadbeef')).toBe(
      'https://chips.example.com/s/ada-chip-deadbeef',
    )
  })
})

describe('decodePngDataUrl', () => {
  it('decodes a base64 PNG data URL into bytes', () => {
    const bytes = decodePngDataUrl('data:image/png;base64,AAAA')
    expect(bytes).not.toBeNull()
    expect((bytes as Buffer).length).toBeGreaterThan(0)
  })

  it('returns null for non-PNG or empty data URLs', () => {
    expect(decodePngDataUrl('data:image/jpeg;base64,AAAA')).toBeNull()
    expect(decodePngDataUrl('data:image/png;base64,')).toBeNull()
    expect(decodePngDataUrl('not-a-data-url')).toBeNull()
  })
})

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<script>"x" & \'y\'')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;')
  })
})

describe('renderViewerHtml', () => {
  const project = {
    ...createProject('Ada Chip', 'project-1', 1_000),
    spec: {
      brand: 'AURORA',
      series: 'C-1',
      generation: 'Gen 1',
      process: '2nm',
      cores: 64,
      bandwidth: '2.2 TB/s',
      features: ['Neon glow', 'Hex die'],
      description: 'A surreal consciousness processor.',
    },
  }

  it('renders absolute OG/Twitter meta pointing at the poster endpoint', () => {
    const html = renderViewerHtml({
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      slug: 'ada-chip-deadbeef',
      project,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).toContain('<meta property="og:title" content="Ada Chip">')
    expect(html).toContain(
      '<meta property="og:image" content="https://chips.example.com/s/ada-chip-deadbeef/poster.png">',
    )
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(html).toContain('<meta property="og:image:width" content="3200">')
    expect(html).toContain('src="https://chips.example.com/s/ada-chip-deadbeef/poster.png"')
    expect(html).toContain('AURORA')
    expect(html).toContain('Remix this chip')
    expect(html).toContain('href="https://chips.example.com/gallery/ada-chip-deadbeef"')
  })

  it('escapes user-controlled title and spec content', () => {
    const html = renderViewerHtml({
      title: '<script>alert(1)</script>',
      ownerDisplayName: 'Ada',
      slug: 'x',
      project,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('links to the gallery 3D showcase from the share viewer', () => {
    const html = renderViewerHtml({
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      slug: 'ada-chip-deadbeef',
      project,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).toContain('View in 3D')
    expect(html).toContain('href="https://chips.example.com/gallery/ada-chip-deadbeef"')
  })

  it('renders a Remixed from link when a visible parent is provided', () => {
    const html = renderViewerHtml({
      title: 'Child Chip',
      ownerDisplayName: 'Ada',
      slug: 'child-slug',
      project,
      baseUrl: 'https://chips.example.com',
      remixedFrom: { slug: 'parent-slug', title: 'Parent Title' },
    })

    expect(html).toContain('Remixed from')
    expect(html).toContain('href="https://chips.example.com/gallery/parent-slug"')
    expect(html).toContain('Parent Title')
  })

  it('omits the Remixed from line when no parent is provided', () => {
    const html = renderViewerHtml({
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      slug: 'ada-chip-deadbeef',
      project,
      baseUrl: 'https://chips.example.com',
    })

    expect(html).not.toContain('Remixed from')
  })

  it('emits a mobile media query so the share page reflows on phones', () => {
    const html = renderViewerHtml({
      title: 'Ada Chip',
      ownerDisplayName: 'Ada',
      slug: 'ada-chip-deadbeef',
      project,
      baseUrl: 'https://chips.example.com',
    })
    expect(html).toContain('@media (max-width: 767px)')
  })
})

describe('renderNotFoundHtml', () => {
  it('renders a noindex 404 body', () => {
    const html = renderNotFoundHtml({ baseUrl: 'https://chips.example.com' })
    expect(html).toContain('noindex')
    expect(html.toLowerCase()).toContain('not found')
  })
})
