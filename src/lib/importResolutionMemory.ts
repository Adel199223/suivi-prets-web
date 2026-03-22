import { nowIso } from '../domain/format'
import type { ImportIssueResolution, MetaRecord } from '../domain/types'
import { db } from './db'
import { buildImportIssueResolutionKey } from './importIssues'

const IMPORT_RESOLUTION_META_PREFIX = 'importResolution:'

interface StoredImportResolutionSet {
  fingerprint: string
  updatedAt: string
  resolutions: ImportIssueResolution[]
}

function metaKeyForFingerprint(fingerprint: string): string {
  return `${IMPORT_RESOLUTION_META_PREFIX}${fingerprint}`
}

function isValidPeriodKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

export function dedupeImportIssueResolutions(resolutions: ImportIssueResolution[]): ImportIssueResolution[] {
  const deduped = new Map<string, ImportIssueResolution>()

  for (const resolution of resolutions) {
    const sheetName = resolution.sheetName.trim()
    const periodKey = resolution.periodKey.trim()

    if (!sheetName || resolution.rowNumber < 1 || !isValidPeriodKey(periodKey)) {
      continue
    }

    deduped.set(buildImportIssueResolutionKey(resolution), {
      sheetName,
      rowNumber: resolution.rowNumber,
      periodKey,
      occurredOn: resolution.occurredOn ?? null,
    })
  }

  return [...deduped.values()].sort((left, right) => {
    const bySheet = left.sheetName.localeCompare(right.sheetName)
    return bySheet !== 0 ? bySheet : left.rowNumber - right.rowNumber
  })
}

function parseStoredImportResolutionRecord(record: MetaRecord | undefined): ImportIssueResolution[] {
  if (!record) {
    return []
  }

  try {
    const parsed = JSON.parse(record.value) as Partial<StoredImportResolutionSet>
    return Array.isArray(parsed.resolutions) ? dedupeImportIssueResolutions(parsed.resolutions) : []
  } catch {
    return []
  }
}

export async function loadSavedImportResolutions(fingerprint: string): Promise<ImportIssueResolution[]> {
  const record = await db.meta.get(metaKeyForFingerprint(fingerprint))
  return parseStoredImportResolutionRecord(record)
}

export async function saveSavedImportResolutions(
  fingerprint: string,
  resolutions: ImportIssueResolution[],
): Promise<void> {
  const normalized = dedupeImportIssueResolutions(resolutions)

  if (normalized.length === 0) {
    await db.meta.delete(metaKeyForFingerprint(fingerprint))
    return
  }

  const stored: StoredImportResolutionSet = {
    fingerprint,
    updatedAt: nowIso(),
    resolutions: normalized,
  }

  await db.meta.put({
    key: metaKeyForFingerprint(fingerprint),
    value: JSON.stringify(stored),
  })
}

export async function clearSavedImportResolutions(fingerprint: string): Promise<void> {
  await db.meta.delete(metaKeyForFingerprint(fingerprint))
}
