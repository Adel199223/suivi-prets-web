import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportPreview } from '../domain/types'
import { buildWorkbookFile } from '../../test/fixtures/import/files'
import { parseImportWorkbookFile } from './importWorkbook'
import { db } from './db'
import { createImportEntrySignature, createUnresolvedImportSignature } from './importSignature'
import { loadSavedImportResolutions } from './importResolutionMemory'
import {
  addLedgerEntry,
  applyImportPreview,
  buildSnapshot,
  createBorrower,
  createDebt,
  deleteBorrower,
  deleteDebt,
  deleteLedgerEntry,
  deleteUnresolvedImport,
  exportBackup,
  replaceFromBackup,
  resetAllData,
  resolveUnresolvedImport,
  updateBorrower,
  updateDebt,
  updateLedgerEntry
} from './repository'

function buildEmptyDescriptionResolvedImportPreviews(): { partial: ImportPreview; resolved: ImportPreview } {
  const fileName = 'empty-description-workbook.ods'
  const fingerprint = 'empty-description-fingerprint'
  const borrowerSourceKey = 'adel'
  const borrowerName = 'Adel'
  const debtSourceKey = 'adel:dette-1'
  const debtLabel = 'Dette 1'
  const sheetName = 'dette_adel_1'
  const rowNumber = 2
  const amountCents = 30000
  const sourceRef = `${sheetName}:${rowNumber}`
  const resolvedDescription = "Import detail [période résolue dans l'app: 2024-01]"
  const resolvedEntry = {
    debtSourceKey,
    borrowerSourceKey,
    borrowerName,
    debtLabel,
    kind: 'payment' as const,
    amountCents,
    periodKey: '2024-01',
    occurredOn: null,
    description: resolvedDescription,
    sourceRef,
    sheetName,
    rowNumber,
    signature: createImportEntrySignature({
      borrowerSourceKey,
      debtSourceKey,
      kind: 'payment',
      amountCents,
      periodKey: '2024-01',
      occurredOn: null,
      description: resolvedDescription,
    }),
  }

  return {
    partial: {
      fileName,
      fingerprint,
      debts: [
        {
          sourceKey: debtSourceKey,
          borrowerSourceKey,
          borrowerName,
          label: debtLabel,
          notes: `Importe depuis ${sheetName}`,
          sheetName,
          entries: [],
        },
      ],
      entries: [],
      unresolvedEntries: [
        {
          debtSourceKey,
          borrowerSourceKey,
          borrowerName,
          debtLabel,
          kind: 'payment',
          amountCents,
          occurredOn: null,
          description: '',
          sourceRef,
          sheetName,
          rowNumber,
          reasonCode: 'missing_period',
          reasonMessage: 'Impossible de déduire la période de cette ligne détaillée.',
          signature: createUnresolvedImportSignature({
            borrowerSourceKey,
            debtSourceKey,
            kind: 'payment',
            amountCents,
            occurredOn: null,
            description: '',
            sourceRef,
          }),
        },
      ],
      issues: [],
      summary: {
        debtCount: 1,
        borrowerCount: 1,
        entryCount: 0,
        unresolvedCount: 1,
        paymentCount: 0,
        advanceCount: 0,
        outstandingImportedCents: 0,
      },
    },
    resolved: {
      fileName,
      fingerprint,
      debts: [
        {
          sourceKey: debtSourceKey,
          borrowerSourceKey,
          borrowerName,
          label: debtLabel,
          notes: `Importe depuis ${sheetName}`,
          sheetName,
          entries: [resolvedEntry],
        },
      ],
      entries: [resolvedEntry],
      unresolvedEntries: [],
      issues: [],
      summary: {
        debtCount: 1,
        borrowerCount: 1,
        entryCount: 1,
        unresolvedCount: 0,
        paymentCount: 1,
        advanceCount: 0,
        outstandingImportedCents: -amountCents,
      },
    },
  }
}

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
    expect(resolvedSnapshot.debts[0]?.entries[0]?.description).toContain("[période résolue dans l'app: 2024-01]")
  })

  it('dedupes a reimported resolved row when the original queued line had no description', async () => {
    const previews = buildEmptyDescriptionResolvedImportPreviews()

    await applyImportPreview(previews.partial)
    const partialSnapshot = await buildSnapshot()
    const pending = partialSnapshot.unresolvedImports[0]
    expect(pending).toBeDefined()

    await resolveUnresolvedImport(pending!.id, '2024-01')

    const afterResolve = await buildSnapshot()
    expect(afterResolve.debts[0]?.entries).toHaveLength(1)
    expect(afterResolve.debts[0]?.entries[0]?.description).toBe("Import détail [période résolue dans l'app: 2024-01]")
    const outstandingAfterResolve = afterResolve.debts[0]?.outstandingCents

    const second = await applyImportPreview(previews.resolved)
    const afterReimport = await buildSnapshot()

    expect(second.session.appliedEntries).toBe(0)
    expect(second.session.duplicateEntries).toBe(1)
    expect(afterReimport.debts[0]?.entries).toHaveLength(1)
    expect(afterReimport.debts[0]?.entries[0]?.description).toBe("Import détail [période résolue dans l'app: 2024-01]")
    expect(afterReimport.debts[0]?.outstandingCents).toBe(outstandingAfterResolve)
  })

  it('dedupes a reimport against a previously stored legacy resolved signature', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))

    await applyImportPreview(workbook.preview)
    const partialSnapshot = await buildSnapshot()
    const pending = partialSnapshot.unresolvedImports[0]
    expect(pending).toBeDefined()

    await resolveUnresolvedImport(pending!.id, '2024-01')

    const savedResolutions = await loadSavedImportResolutions(workbook.preview.fingerprint)
    expect(savedResolutions).toHaveLength(1)

    const storedEntry = (await db.entries.toArray())[0]
    expect(storedEntry).toBeDefined()

    const legacyDescription = "Paiement sans periode [periode resolue dans l'app: 2024-01]"
    const legacySignature = createImportEntrySignature({
      borrowerSourceKey: 'adel',
      debtSourceKey: 'adel:dette-1',
      kind: 'payment',
      amountCents: 30000,
      periodKey: '2024-01',
      occurredOn: null,
      description: legacyDescription,
    })

    await db.entries.put({
      ...storedEntry!,
      description: legacyDescription,
      signature: legacySignature,
    })

    const reparsedWorkbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'), {
      resolutions: savedResolutions,
    })
    const second = await applyImportPreview(reparsedWorkbook.preview)
    const afterReimport = await buildSnapshot()

    expect(second.session.appliedEntries).toBe(0)
    expect(second.session.duplicateEntries).toBe(1)
    expect(afterReimport.debts[0]?.entries).toHaveLength(1)
    expect(afterReimport.debts[0]?.entries[0]?.signature).toBe(legacySignature)
    expect(afterReimport.debts[0]?.entries[0]?.description).toBe(legacyDescription)
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

  it('removes a ledger entry and updates the debt totals', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })

    const payment = await addLedgerEntry({
      debtId: debt.id,
      kind: 'payment',
      amountCents: 20000,
      occurredOn: '2026-03-15',
      description: 'Paiement mars'
    })

    await deleteLedgerEntry(payment.id)

    const snapshot = await buildSnapshot()
    expect(snapshot.debts[0]?.entries).toHaveLength(1)
    expect(snapshot.debts[0]?.outstandingCents).toBe(120000)
    expect(snapshot.totalPaidCents).toBe(0)
  })

  it('updates borrower and debt metadata without changing storage contracts', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })

    await updateBorrower(borrower.id, { name: 'Amina Corrigee', notes: 'Notes corrigees' })
    await updateDebt(debt.id, { label: 'Loyer principal', notes: 'Dette mise a jour' })

    const snapshot = await buildSnapshot()
    expect(snapshot.borrowers[0]?.borrower.name).toBe('Amina Corrigee')
    expect(snapshot.borrowers[0]?.borrower.notes).toBe('Notes corrigees')
    expect(snapshot.debts[0]?.debt.label).toBe('Loyer principal')
    expect(snapshot.debts[0]?.debt.notes).toBe('Dette mise a jour')
  })

  it('updates a ledger entry, recalculates period from a new date, and keeps period when the date is removed', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })

    const payment = await addLedgerEntry({
      debtId: debt.id,
      kind: 'payment',
      amountCents: 20000,
      periodKey: '2026-03',
      occurredOn: null,
      description: 'Paiement initial'
    })

    await updateLedgerEntry(payment.id, {
      amountCents: 35000,
      occurredOn: '2026-04-20',
      description: 'Paiement corrige'
    })

    let snapshot = await buildSnapshot()
    let updatedPayment = snapshot.debts[0]?.entries.find((entry) => entry.id === payment.id)
    expect(updatedPayment?.amountCents).toBe(35000)
    expect(updatedPayment?.occurredOn).toBe('2026-04-20')
    expect(updatedPayment?.periodKey).toBe('2026-04')
    expect(updatedPayment?.description).toBe('Paiement corrige')
    expect(snapshot.debts[0]?.outstandingCents).toBe(85000)

    await updateLedgerEntry(payment.id, {
      amountCents: 40000,
      occurredOn: null,
      description: 'Paiement sans date'
    })

    snapshot = await buildSnapshot()
    updatedPayment = snapshot.debts[0]?.entries.find((entry) => entry.id === payment.id)
    expect(updatedPayment?.amountCents).toBe(40000)
    expect(updatedPayment?.occurredOn).toBeNull()
    expect(updatedPayment?.periodKey).toBe('2026-04')
    expect(updatedPayment?.description).toBe('Paiement sans date')
    expect(snapshot.debts[0]?.outstandingCents).toBe(80000)
  })

  it('preserves the import signature when editing an imported ledger entry', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    await applyImportPreview(workbook.preview)

    const beforeEdit = await buildSnapshot()
    const entry = beforeEdit.debts[0]?.entries[0]
    expect(entry).toBeDefined()

    await updateLedgerEntry(entry!.id, {
      amountCents: entry!.amountCents + 100,
      occurredOn: entry!.occurredOn,
      description: 'Import corrige'
    })

    const afterEdit = await buildSnapshot()
    const updatedEntry = afterEdit.debts[0]?.entries.find((item) => item.id === entry!.id)
    expect(updatedEntry?.signature).toBe(entry?.signature)
    expect(updatedEntry?.importSessionId).toBe(entry?.importSessionId)
    expect(updatedEntry?.amountCents).toBe(entry!.amountCents + 100)
  })

  it('removes one queued unresolved row without touching the debt shell or totals', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))
    await applyImportPreview(workbook.preview)
    const beforeDelete = await buildSnapshot()
    const pending = beforeDelete.unresolvedImports[0]

    expect(beforeDelete.debts[0]?.entries).toHaveLength(0)
    expect(beforeDelete.debts[0]?.outstandingCents).toBe(0)

    await deleteUnresolvedImport(pending!.id)

    const afterDelete = await buildSnapshot()
    expect(afterDelete.unresolvedImportCount).toBe(0)
    expect(afterDelete.debts[0]?.entries).toHaveLength(0)
    expect(afterDelete.debts[0]?.outstandingCents).toBe(0)
    expect(afterDelete.borrowers[0]?.borrower.name).toBe('Adel')
  })

  it('deletes a debt with its entries and pending rows but keeps the borrower', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const manualDebt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })
    await addLedgerEntry({
      debtId: manualDebt.id,
      kind: 'payment',
      amountCents: 20000,
      occurredOn: '2026-03-15',
      description: 'Paiement mars'
    })

    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))
    await applyImportPreview(workbook.preview)
    const importedDebtId = (await buildSnapshot()).unresolvedImports[0]?.debtId

    await deleteDebt(importedDebtId!)

    const snapshot = await buildSnapshot()
    expect(snapshot.borrowers).toHaveLength(2)
    expect(snapshot.borrowerMap[borrower.id]?.borrower.name).toBe('Amina')
    expect(snapshot.debts.map((debtView) => debtView.debt.id)).toEqual([manualDebt.id])
    expect(snapshot.unresolvedImportCount).toBe(0)
  })

  it('deletes a borrower with all debts, entries, and pending rows below it', async () => {
    const workbook = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))
    await applyImportPreview(workbook.preview)
    const snapshot = await buildSnapshot()
    const borrowerId = snapshot.borrowers[0]?.borrower.id

    await deleteBorrower(borrowerId!)

    const afterDelete = await buildSnapshot()
    expect(afterDelete.borrowers).toHaveLength(0)
    expect(afterDelete.debts).toHaveLength(0)
    expect(afterDelete.unresolvedImportCount).toBe(0)
    expect(afterDelete.importSessions).toHaveLength(1)
  })
})
