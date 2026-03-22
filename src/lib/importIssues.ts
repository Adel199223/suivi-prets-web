import type { ImportIssue, ImportPreview, WorkbookImportPreviewV1 } from '../domain/types'

type ImportIssuesInput = WorkbookImportPreviewV1 | ImportPreview | ImportIssue[]

function resolveIssues(input: ImportIssuesInput): ImportIssue[] {
  if (Array.isArray(input)) {
    return input
  }

  if ('preview' in input) {
    return input.preview.issues
  }

  return input.issues
}

export function getBlockingImportIssues(input: ImportIssuesInput): ImportIssue[] {
  return resolveIssues(input).filter((issue) => issue.code !== 'ignored_sheet')
}

export function getInformationalImportIssues(input: ImportIssuesInput): ImportIssue[] {
  return resolveIssues(input).filter((issue) => issue.code === 'ignored_sheet')
}

export function isInAppResolvableImportIssue(issue: ImportIssue): boolean {
  return issue.code === 'missing_period'
}

export function buildImportIssueResolutionKey(issue: Pick<ImportIssue, 'sheetName' | 'rowNumber'>): string {
  return `${issue.sheetName}:${issue.rowNumber}`
}
