const RESERVED_HANDLES = new Set([
  'account',
  'admin',
  'api',
  'auth',
  'contests',
  'gallery',
  'health',
  'me',
  'profiles',
  'published-chips',
  'robots',
  's',
  'sitemap',
  'u',
  'uploads',
])

export function validateHandle(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== 'string') return { ok: false, message: 'handle must be a string.' }
  const handle = raw.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return { ok: false, message: 'handle must be 3-24 chars of a-z, 0-9, underscore.' }
  }
  if (RESERVED_HANDLES.has(handle)) return { ok: false, message: 'That handle is reserved.' }
  return { ok: true, value: handle }
}
