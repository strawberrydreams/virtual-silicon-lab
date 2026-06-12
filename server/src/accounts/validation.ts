export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string }

export type SignupInput = { email: string; displayName: string; password: string }
export type LoginInput = { email: string; password: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') return { ok: false, message: 'email must be a string.' }
  const email = raw.trim().toLowerCase()
  if (email.length === 0 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: 'email must be a valid email address.' }
  }
  return { ok: true, value: email }
}

export function validateDisplayName(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') return { ok: false, message: 'displayName must be a string.' }
  const displayName = raw.trim()
  if (displayName.length < 1 || displayName.length > 40) {
    return { ok: false, message: 'displayName must be 1-40 characters.' }
  }
  return { ok: true, value: displayName }
}

export function validatePassword(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') return { ok: false, message: 'password must be a string.' }
  if (raw.length < 8 || raw.length > 200) {
    return { ok: false, message: 'password must be 8-200 characters.' }
  }
  return { ok: true, value: raw }
}

function asRecord(body: unknown): Record<string, unknown> | null {
  return body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : null
}

export function validateSignupInput(body: unknown): ValidationResult<SignupInput> {
  const record = asRecord(body)
  if (record === null) return { ok: false, message: 'Expected a JSON object.' }
  const email = validateEmail(record.email)
  if (!email.ok) return email
  const displayName = validateDisplayName(record.displayName)
  if (!displayName.ok) return displayName
  const password = validatePassword(record.password)
  if (!password.ok) return password
  return { ok: true, value: { email: email.value, displayName: displayName.value, password: password.value } }
}

export function validateLoginInput(body: unknown): ValidationResult<LoginInput> {
  const record = asRecord(body)
  if (record === null) return { ok: false, message: 'Expected a JSON object.' }
  const email = validateEmail(record.email)
  if (!email.ok) return email
  if (typeof record.password !== 'string' || record.password.length === 0) {
    return { ok: false, message: 'password is required.' }
  }
  return { ok: true, value: { email: email.value, password: record.password } }
}
