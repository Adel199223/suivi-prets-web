import { beforeEach, describe, expect, it } from 'vitest'
import { buildWorkbookFile } from '../../test/fixtures/import/files'
import { parseImportWorkbookFile } from './importWorkbook'
import { applyImportPreview, buildSnapshot, resetAllData } from './repository'

describe('browser ods import parser', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  it('parses a valid workbook into safe entries without unresolved rows', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))

    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(actual.preview.summary.borrowerCount).toBeGreaterThan(0)
    expect(actual.preview.summary.entryCount).toBeGreaterThan(0)
    expect(actual.preview.summary.unresolvedCount).toBe(0)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.issues).toHaveLength(0)
  })

  it('keeps queueable missing-period rows as unresolved instead of blocking the whole workbook', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))

    expect(actual.preview.summary.entryCount).toBe(0)
    expect(actual.preview.summary.unresolvedCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(1)
    expect(actual.preview.unresolvedEntries[0]?.sheetName).toBe('dette_adel_1')
    expect(actual.preview.unresolvedEntries[0]?.rowNumber).toBe(2)
    expect(actual.preview.issues).toHaveLength(0)
    expect(actual.preview.debts).toHaveLength(1)
  })

  it('inherits the previous period for continuation rows while queueing only the truly ambiguous one', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('continuation-workbook.ods'))

    expect(actual.preview.debts[0]?.entries).toHaveLength(3)
    expect(actual.preview.summary.unresolvedCount).toBe(1)
    expect(actual.preview.unresolvedEntries[0]?.rowNumber).toBe(2)
  })

  it('dedupes a repeated workbook import end to end', async () => {
    const firstWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const secondWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))

    const firstSession = await applyImportPreview(firstWorkbook.preview)
    const secondSession = await applyImportPreview(secondWorkbook.preview)

    expect(firstSession.session.appliedEntries).toBeGreaterThan(0)
    expect(firstSession.mode).toBe('full')
    expect(secondSession.session.appliedEntries).toBe(0)
    expect(secondSession.session.duplicateEntries).toBe(firstSession.session.appliedEntries)
  })

  it('merges only unseen people and debts from a later fuller workbook', async () => {
    const firstWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const fullWorkbook = await parseImportWorkbookFile(buildWorkbookFile('full-workbook.ods'))

    await applyImportPreview(firstWorkbook.preview)
    const secondSession = await applyImportPreview(fullWorkbook.preview)
    const snapshot = await buildSnapshot()

    expect(secondSession.session.appliedBorrowers).toBeGreaterThan(0)
    expect(secondSession.session.appliedDebts).toBeGreaterThan(0)
    expect(secondSession.affectedBorrowerIds.length).toBeGreaterThan(0)
    expect(snapshot.borrowers.length).toBeGreaterThanOrEqual(4)
  })
})
