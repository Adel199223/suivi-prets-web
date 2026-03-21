import type { AppBackupV1 } from '../domain/types'

export function serializeBackup(backup: AppBackupV1): string {
  return JSON.stringify(backup, null, 2)
}

export async function parseBackupFile(file: File): Promise<AppBackupV1> {
  const text = await file.text()
  const parsed = JSON.parse(text) as AppBackupV1
  if (parsed.version !== 'app-backup-v1') {
    throw new Error('Version de sauvegarde non prise en charge.')
  }
  return parsed
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
