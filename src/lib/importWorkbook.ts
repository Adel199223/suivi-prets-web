import type { WorkbookImportPreviewV1 } from '../domain/types'

export async function parseImportWorkbookFile(file: File): Promise<WorkbookImportPreviewV1> {
  if (!file.name.toLowerCase().endsWith('.ods')) {
    throw new Error('Seuls les classeurs .ods sont pris en charge.')
  }

  const { parseOdsWorkbookFile } = await import('./importWorkbookOds')
  return parseOdsWorkbookFile(file)
}
