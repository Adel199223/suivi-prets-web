import { beforeEach, describe, expect, it } from 'vitest'
import { buildWorkbookFile } from '../../test/fixtures/import/files'
import { parseImportWorkbookFile } from './importWorkbook'
import { applyImportPreview, buildSnapshot, exportBackup, replaceFromBackup, resetAllData, resolveUnresolvedImport } from './repository'

describe('repository import merge', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  it('dedupes a repeated import without duplicating queued unresolved rows', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))

    const first = await applyImportPreview(workbook.preview)
    const second = await applyImportPreview(workbook.preview)
    const snapshot = await buildSnapshot()

    expect(first.mode).toBe('partial')
    expect(first.session.appliedEntries).toBe(0)
    expect(first.session.queuedUnresolvedCount).toBe(1)
    expect(second.session.appliedEntries).toBe(0)
    expect(second.session.duplicateEntries).toBe(0)
    expect(second.session.queuedUnresolvedCount).toBe(0)
    expect(snapshot.unresolvedImportCount).toBe(1)
  })

  it('creates borrower and debt shells on partial import, then resolves the queued line later', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))

    const result = await applyImportPreview(workbook.preview)
    const partialSnapshot = await buildSnapshot()
    const borrower = partialSnapshot.borrowers[0]
    const debt = partialSnapshot.debts[0]

    expect(result.mode).toBe('partial')
    expect(result.session.appliedBorrowers).toBe(1)
    expect(result.session.appliedDebts).toBe(1)
    expect(result.session.appliedEntries).toBe(0)
    expect(result.session.queuedUnresolvedCount).toBe(1)
    expect(result.affectedBorrowerIds).toHaveLength(1)
    expect(result.affectedDebtIds).toHaveLength(1)
    expect(borrower?.borrower.name).toBe('Adel')
    expect(borrower?.unresolvedImportCount).toBe(1)
    expect(borrower?.pendingImports).toHaveLength(1)
    expect(borrower?.pendingImportedCents).not.toBe(0)
    expect(debt?.debt.label).toBe('Dette 1')
    expect(debt?.entries).toHaveLength(0)
    expect(debt?.unresolvedImportCount).toBe(1)
    expect(debt?.pendingImports).toHaveLength(1)
    expect(debt?.pendingImportedCents).not.toBe(0)

    const pending = partialSnapshot.unresolvedImports[0]
    expect(pending).toBeDefined()

    await resolveUnresolvedImport(pending!.id, '2024-01')

    const resolvedSnapshot = await buildSnapshot()
    expect(resolvedSnapshot.unresolvedImportCount).toBe(0)
    expect(resolvedSnapshot.debts[0]?.entries).toHaveLength(1)
    expect(resolvedSnapshot.debts[0]?.pendingImports).toHaveLength(0)
    expect(resolvedSnapshot.debts[0]?.pendingImportedCents).toBe(0)
    expect(resolvedSnapshot.debts[0]?.entries[0]?.periodKey).toBe('2024-01')
    expect(resolvedSnapshot.debts[0]?.entries[0]?.description).toContain("[periode resolue dans l'app: 2024-01]")
  })

  it('adds only unseen debts and borrowers from a later full workbook import', async () => {
    const partialWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const fullWorkbook = await parseImportWorkbookFile(buildWorkbookFile('full-workbook.ods'))

    await applyImportPreview(partialWorkbook.preview)
    const second = await applyImportPreview(fullWorkbook.preview)
    const snapshot = await buildSnapshot()

    expect(second.mode).toBe('full')
    expect(second.session.appliedBorrowers).toBeGreaterThan(0)
    expect(second.session.appliedDebts).toBeGreaterThan(0)
    expect(snapshot.borrowers.length).toBeGreaterThanOrEqual(4)
    expect(snapshot.unresolvedImportCount).toBe(0)
  })

  it('keeps pending unresolved rows across backup export and restore', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))
    await applyImportPreview(workbook.preview)

    const backup = await exportBackup()
    await resetAllData()
    await replaceFromBackup(backup)

    const snapshot = await buildSnapshot()
    expect(backup.version).toBe('app-backup-v2')
    expect(snapshot.unresolvedImportCount).toBe(1)
    expect(snapshot.unresolvedImports[0]?.sheetName).toBe('dette_adel_1')
  })
})
