import { hash, verify } from '@node-rs/argon2'

// Algorithm.Argon2id — the package's const enum is ambient and unusable under isolatedModules.
const ARGON2ID = 2

// OWASP baseline for argon2id: m=19456 KiB, t=2, p=1.
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password).catch(() => false)
}
