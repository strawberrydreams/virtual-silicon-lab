import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { openDatabase } from '../db'

export async function backupDatabase(srcPath: string, destPath: string): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true })
  const db = openDatabase(srcPath)
  try {
    await db.backup(destPath)
  } finally {
    db.close()
  }
}
