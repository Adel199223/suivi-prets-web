import { beforeEach, describe, expect, it } from 'vitest'
import { buildWorkbookFile, readImportPreviewArtifact } from '../../test/fixtures/import/files'
import { parseImportWorkbookFile } from './importWorkbook'
import { applyImportPreview, buildSnapshot, resetAllData } from './repository'

describe('browser ods import parser', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  it('matches the partial workbook fixture preview', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const expected = readImportPreviewArtifact('partial-preview.json')

    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(typeof actual.generatedAt).toBe('string')
    expect(actual.preview).toEqual(expected.preview)
  })

  it('matches the broken workbook fixture preview and keeps blocking issues', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))
    const expected = readImportPreviewArtifact('broken-preview.json')

    expect(actual.preview).toEqual(expected.preview)
    expect(actual.preview.issues.length).toBeGreaterThan(0)
    expect(actual.preview.summary.entryCount).toBe(0)
  })

  it('matches the continuation workbook fixture preview', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('continuation-workbook.ods'))
    const expected = readImportPreviewArtifact('continuation-preview.json')

    expect(actual.preview).toEqual(expected.preview)
    expect(actual.preview.issues).toHaveLength(1)
  })

  it('dedupes a repeated workbook import end to end', async () => {
    const firstWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const secondWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))

    const firstSession = await applyImportPreview(firstWorkbook.preview)
    const secondSession = await applyImportPreview(secondWorkbook.preview)

    expect(firstSession.appliedEntries).toBeGreaterThan(0)
    expect(secondSession.appliedEntries).toBe(0)
    expect(secondSession.duplicateEntries).toBe(firstSession.appliedEntries)
  })

  it('merges only unseen people and debts from a later fuller workbook', async () => {
    const firstWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const fullWorkbook = await parseImportWorkbookFile(buildWorkbookFile('full-workbook.ods'))

    await applyImportPreview(firstWorkbook.preview)
    const secondSession = await applyImportPreview(fullWorkbook.preview)
    const snapshot = await buildSnapshot()

    expect(secondSession.appliedBorrowers).toBeGreaterThan(0)
    expect(secondSession.appliedDebts).toBeGreaterThan(0)
    expect(snapshot.borrowers.length).toBeGreaterThanOrEqual(4)
  })
})
