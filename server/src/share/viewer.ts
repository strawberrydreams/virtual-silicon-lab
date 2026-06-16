import type { Project } from '@domain/project'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type ViewerInput = {
  title: string
  ownerDisplayName: string
  slug: string
  project: Project
  baseUrl: string
  remixedFrom?: { slug: string; title: string }
}

const BASE_STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #06080f; color: #e6f0ff; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 48px 24px 72px; }
  .kicker { text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; color: #6fd3ff; margin: 0 0 8px; }
  h1 { font-size: 34px; margin: 0 0 6px; }
  .owner { color: #93a4c4; margin: 0 0 24px; }
  .poster { width: 100%; border-radius: 16px; border: 1px solid #1c2740; display: block; margin: 0 0 32px; }
  .spec { border: 1px solid #1c2740; border-radius: 16px; padding: 24px; background: #0a0f1c; }
  .spec h2 { margin: 0 0 16px; font-size: 20px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0 0 16px; }
  .grid dt { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #6fd3ff; }
  .grid dd { margin: 4px 0 0; font-size: 16px; }
  .features { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .features span { border: 1px solid #25406b; border-radius: 999px; padding: 4px 12px; font-size: 13px; color: #bcd2ff; }
  .viewer-lineage { color: #93a4c4; margin: -12px 0 24px; }
  .viewer-lineage a { color: #6fd3ff; text-decoration: none; }
  .cta { margin-top: 32px; }
  .cta a { color: #6fd3ff; text-decoration: none; border: 1px solid #25406b; border-radius: 8px; padding: 10px 18px; }
`

export function renderViewerHtml(input: ViewerInput): string {
  const { title, ownerDisplayName, slug, project, baseUrl } = input
  const spec = project.spec
  const shareUrl = `${baseUrl}/s/${slug}`
  const posterUrl = `${baseUrl}/s/${slug}/poster.png`
  const description = spec.description !== '' ? spec.description : `${spec.brand} ${spec.series}`
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const features = spec.features.map((feature) => `<span>${escapeHtml(feature)}</span>`).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle} — Virtual Silicon Lab</title>
<meta property="og:site_name" content="Virtual Silicon Lab">
<meta property="og:type" content="website">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta property="og:image" content="${escapeHtml(posterUrl)}">
<meta property="og:image:width" content="3200">
<meta property="og:image:height" content="1800">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${escapeHtml(posterUrl)}">
<style>${BASE_STYLE}</style>
</head>
<body>
<main class="wrap">
  <p class="kicker">Shared from Virtual Silicon Lab</p>
  <h1>${safeTitle}</h1>
  <p class="owner">Published by ${escapeHtml(ownerDisplayName)}</p>
  ${
    input.remixedFrom
      ? `<p class="viewer-lineage">Remixed from <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(
          input.remixedFrom.slug,
        )}">${escapeHtml(input.remixedFrom.title)}</a></p>`
      : ''
  }
  <img class="poster" src="${escapeHtml(posterUrl)}" alt="${safeTitle} poster">
  <section class="spec">
    <h2>${escapeHtml(spec.brand)} ${escapeHtml(spec.series)}</h2>
    <dl class="grid">
      <div><dt>Generation</dt><dd>${escapeHtml(spec.generation)}</dd></div>
      <div><dt>Process</dt><dd>${escapeHtml(spec.process)}</dd></div>
      <div><dt>Cores</dt><dd>${escapeHtml(String(spec.cores))}</dd></div>
      <div><dt>Bandwidth</dt><dd>${escapeHtml(spec.bandwidth)}</dd></div>
    </dl>
    <p>${safeDescription}</p>
    <div class="features">${features}</div>
  </section>
  <p class="cta">
    <a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(slug)}">Remix this chip</a>
    <a href="${escapeHtml(baseUrl)}/">Open the Lab</a>
  </p>
</main>
</body>
</html>`
}

export function renderNotFoundHtml(input: { baseUrl: string }): string {
  const { baseUrl } = input
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Chip not found — Virtual Silicon Lab</title>
<style>${BASE_STYLE}</style>
</head>
<body>
<main class="wrap">
  <p class="kicker">Share Core</p>
  <h1>Chip not found</h1>
  <p class="owner">This chip may be private, unpublished, or deleted.</p>
  <p class="cta"><a href="${escapeHtml(baseUrl)}/">Open the Lab</a></p>
</main>
</body>
</html>`
}
