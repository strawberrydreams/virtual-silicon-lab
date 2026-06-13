export function resolvePublicBaseUrl(requestUrl: string, configuredBase?: string): string {
  if (configuredBase !== undefined && configuredBase !== '') {
    return configuredBase.replace(/\/+$/, '')
  }
  return new URL(requestUrl).origin
}

export function buildShareUrl(baseUrl: string, slug: string): string {
  return `${baseUrl}/s/${slug}`
}
