import type { WorkbookImportPreviewV1 } from '../domain/types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isWorkbookImportPreviewV1(value: unknown): value is WorkbookImportPreviewV1 {
  if (!isObject(value)) {
    return false
  }

  if (value.version !== 'workbook-import-preview-v1' || typeof value.generatedAt !== 'string') {
    return false
  }

  const preview = value.preview
  if (!isObject(preview)) {
    return false
  }

  return (
    typeof preview.fileName === 'string' &&
    typeof preview.fingerprint === 'string' &&
    Array.isArray(preview.debts) &&
    Array.isArray(preview.entries) &&
    Array.isArray(preview.issues) &&
    isObject(preview.summary)
  )
}

export async function parseImportPreviewFile(file: File): Promise<WorkbookImportPreviewV1> {
  const text = await file.text()
  const parsed = JSON.parse(text) as unknown

  if (!isWorkbookImportPreviewV1(parsed)) {
    throw new Error("Apercu d'import non pris en charge.")
  }

  return parsed
}
