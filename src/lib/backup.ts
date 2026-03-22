import type { AppBackup, AppBackupV2 } from '../domain/types'

function normalizeBackup(backup: AppBackup): AppBackupV2 {
  if (backup.version === 'app-backup-v2') {
    return backup
  }

  return {
    ...backup,
    version: 'app-backup-v2',
    unresolvedImports: []
  }
}

export function serializeBackup(backup: AppBackup): string {
  return JSON.stringify(backup, null, 2)
}

export function summarizeBackup(backup: AppBackup): {
  exportedAt: string
  borrowerCount: number
  debtCount: number
  entryCount: number
  importCount: number
  unresolvedImportCount: number
} {
  const normalized = normalizeBackup(backup)

  return {
    exportedAt: normalized.exportedAt,
    borrowerCount: normalized.borrowers.length,
    debtCount: normalized.debts.length,
    entryCount: normalized.entries.length,
    importCount: normalized.imports.length,
    unresolvedImportCount: normalized.unresolvedImports.filter((record) => record.resolvedAt === null).length
  }
}

export async function parseBackupFile(file: File): Promise<AppBackupV2> {
  const text = await file.text()
  const parsed = JSON.parse(text) as AppBackup
  if (parsed.version !== 'app-backup-v1' && parsed.version !== 'app-backup-v2') {
    throw new Error('Version de sauvegarde non prise en charge.')
  }

  return normalizeBackup(parsed)
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
