import type { ImportIssueResolution, WorkbookImportPreviewV1 } from '../domain/types'

export interface ParseImportWorkbookOptions {
  resolutions?: ImportIssueResolution[]
}

export async function parseImportWorkbookFile(file: File, options?: ParseImportWorkbookOptions): Promise<WorkbookImportPreviewV1> {
  if (!file.name.toLowerCase().endsWith('.ods')) {
    throw new Error('Seuls les classeurs .ods sont pris en charge.')
  }

  const { parseOdsWorkbookFile } = await import('./importWorkbookOds')
  return parseOdsWorkbookFile(file, options)
}
