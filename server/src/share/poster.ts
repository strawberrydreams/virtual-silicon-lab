const PNG_DATA_URL_PREFIX = 'data:image/png;base64,'

export function decodePngDataUrl(dataUrl: string): Buffer | null {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) return null
  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length)
  if (base64 === '') return null
  const bytes = Buffer.from(base64, 'base64')
  return bytes.length > 0 ? bytes : null
}
