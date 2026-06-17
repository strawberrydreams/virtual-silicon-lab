import { mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { backupDatabase } from '../src/ops/backup'

const [, , srcPath, outputDir = 'backups'] = process.argv

if (srcPath === undefined || srcPath.trim() === '') {
  console.error('Usage: tsx server/scripts/backup.ts <db-path> [output-dir]')
  process.exit(1)
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
await mkdir(outputDir, { recursive: true })
const destPath = join(outputDir, `${basename(srcPath)}.${stamp}.bak`)
await backupDatabase(srcPath, destPath)
console.log(destPath)
