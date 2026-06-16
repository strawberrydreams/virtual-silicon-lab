import { randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateInviteCode(): string {
  const bytes = randomBytes(12)
  let code = ''
  for (let i = 0; i < 12; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return code
}

export function validateMaxUses(
  raw: unknown,
): { ok: true; value: number } | { ok: false; message: string } {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 1000) {
    return { ok: false, message: 'maxUses must be an integer between 1 and 1000.' }
  }
  return { ok: true, value: raw }
}

export function normalizeInviteCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}
