import { buildAppSnapshot } from '../domain/ledger'
import { nowIso, periodKeyFromDate, toSlug } from '../domain/format'
import type {
  ApplyImportPreviewResult,
  AutoPersistResult,
  AppBackupV2,
  AppSnapshot,
  BorrowerRecord,
  DebtRecord,
  EntryKind,
  ImportPreview,
  ImportIssueResolution,
  ImportSessionRecord,
  LedgerEntryRecord,
  MetaRecord,
  UnresolvedImportRecord
} from '../domain/types'
import { db } from './db'
import { createImportEntrySignature } from './importSignature'
import { dedupeImportIssueResolutions, loadSavedImportResolutions, saveSavedImportResolutions } from './importResolutionMemory'
import { buildResolvedImportDescription } from './resolvedImportDescription'

function createId(): string {
  return crypto.randomUUID()
}

async function putMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value })
}

export async function recordAutoPersistResult(result: AutoPersistResult): Promise<void> {
  const attemptedAt = nowIso()

  await db.meta.bulkPut([
    { key: 'autoPersistAttemptedAt', value: attemptedAt } satisfies MetaRecord,
    { key: 'autoPersistResult', value: result ?? 'unsupported' } satisfies MetaRecord,
  ])
}

export async function buildSnapshot(): Promise<AppSnapshot> {
  const [borrowers, debts, entries, imports, unresolvedImports, meta] = await Promise.all([
    db.borrowers.toArray(),
    db.debts.toArray(),
    db.entries.toArray(),
    db.imports.toArray(),
    db.unresolvedImports.filter((record) => record.resolvedAt === null).toArray(),
    db.meta.toArray()
  ])

  return buildAppSnapshot({ borrowers, debts, entries, imports, unresolvedImports, meta })
}

export async function createBorrower(input: { name: string; notes?: string }): Promise<BorrowerRecord> {
  const now = nowIso()
  const record: BorrowerRecord = {
    id: createId(),
    name: input.name.trim(),
    notes: input.notes?.trim() ?? '',
    sourceKey: toSlug(input.name),
    createdAt: now,
    updatedAt: now
  }
  await db.borrowers.add(record)
  return record
}

export async function updateBorrower(borrowerId: string, input: { name: string; notes: string }): Promise<void> {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Ajoutez un nom d’emprunteur.')
  }

  const updated = await db.borrowers.update(borrowerId, {
    name,
    notes: input.notes.trim(),
    updatedAt: nowIso()
  })

  if (updated === 0) {
    throw new Error('Emprunteur introuvable.')
  }
}

export async function createDebt(input: {
  borrowerId: string
  label: string
  notes?: string
  openingBalanceCents?: number | null
  occurredOn?: string | null
}): Promise<DebtRecord> {
  const now = nowIso()
  const debt: DebtRecord = {
    id: createId(),
    borrowerId: input.borrowerId,
    label: input.label.trim(),
    notes: input.notes?.trim() ?? '',
    status: 'open',
    currency: 'EUR',
    sourceKey: null,
    createdAt: now,
    updatedAt: now,
    closedAt: null
  }

  await db.transaction('rw', db.debts, db.entries, async () => {
    await db.debts.add(debt)
    if (input.openingBalanceCents && input.openingBalanceCents > 0) {
      const occurredOn = input.occurredOn ?? null
      const periodKey = periodKeyFromDate(occurredOn) ?? now.slice(0, 7)
      const entry: LedgerEntryRecord = {
        id: createId(),
        debtId: debt.id,
        kind: 'opening_balance',
        amountCents: input.openingBalanceCents,
        periodKey,
        occurredOn,
        description: 'Creation de la dette',
        sourceRef: null,
        signature: `manual:${createId()}`,
        importSessionId: null,
        createdAt: now,
        updatedAt: now
      }
      await db.entries.add(entry)
    }
  })

  return debt
}

export async function updateDebt(debtId: string, input: { label: string; notes: string }): Promise<void> {
  const label = input.label.trim()
  if (!label) {
    throw new Error('Ajoutez un libellé de dette.')
  }

  const updated = await db.debts.update(debtId, {
    label,
    notes: input.notes.trim(),
    updatedAt: nowIso()
  })

  if (updated === 0) {
    throw new Error('Dette introuvable.')
  }
}

export async function addLedgerEntry(input: {
  debtId: string
  kind: EntryKind
  amountCents: number
  periodKey?: string | null
  occurredOn?: string | null
  description?: string
}): Promise<LedgerEntryRecord> {
  const now = nowIso()
  const occurredOn = input.occurredOn ?? null
  const periodKey = input.periodKey ?? periodKeyFromDate(occurredOn) ?? now.slice(0, 7)
  const entry: LedgerEntryRecord = {
    id: createId(),
    debtId: input.debtId,
    kind: input.kind,
    amountCents: input.amountCents,
    periodKey,
    occurredOn,
    description: input.description?.trim() ?? '',
    sourceRef: null,
    signature: `manual:${createId()}`,
    importSessionId: null,
    createdAt: now,
    updatedAt: now
  }

  await db.entries.add(entry)
  return entry
}

export async function updateLedgerEntry(entryId: string, input: {
  amountCents: number
  occurredOn: string | null
  description: string
}): Promise<void> {
  if (!input.amountCents || input.amountCents <= 0) {
    throw new Error('Entrez un montant valide.')
  }

  const existing = await db.entries.get(entryId)
  if (!existing) {
    throw new Error('Ecriture introuvable.')
  }

  const occurredOn = input.occurredOn?.trim() ? input.occurredOn.trim() : null
  const nextPeriodKey = occurredOn ? periodKeyFromDate(occurredOn) : existing.periodKey
  if (!nextPeriodKey) {
    throw new Error('Choisissez une date valide.')
  }

  await db.entries.put({
    ...existing,
    amountCents: input.amountCents,
    occurredOn,
    periodKey: nextPeriodKey,
    description: input.description.trim(),
    updatedAt: nowIso()
  })
}

export async function deleteLedgerEntry(entryId: string): Promise<void> {
  await db.entries.delete(entryId)
}

export async function deleteUnresolvedImport(unresolvedImportId: string): Promise<void> {
  await db.unresolvedImports.delete(unresolvedImportId)
}

export async function setDebtClosed(debtId: string, closed: boolean): Promise<void> {
  await db.debts.update(debtId, {
    status: closed ? 'closed' : 'open',
    closedAt: closed ? nowIso() : null,
    updatedAt: nowIso()
  })
}

export async function deleteDebt(debtId: string): Promise<void> {
  await db.transaction('rw', [db.debts, db.entries, db.unresolvedImports], async () => {
    await Promise.all([
      db.entries.where('debtId').equals(debtId).delete(),
      db.unresolvedImports.where('debtId').equals(debtId).delete(),
    ])
    await db.debts.delete(debtId)
  })
}

export async function deleteBorrower(borrowerId: string): Promise<void> {
  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.unresolvedImports], async () => {
    const debtIds = (await db.debts.where('borrowerId').equals(borrowerId).primaryKeys()) as string[]

    if (debtIds.length > 0) {
      await Promise.all([
        db.entries.where('debtId').anyOf(debtIds).delete(),
        db.unresolvedImports.where('debtId').anyOf(debtIds).delete(),
      ])
    }

    await Promise.all([
      db.unresolvedImports.where('borrowerId').equals(borrowerId).delete(),
      db.debts.where('borrowerId').equals(borrowerId).delete(),
    ])
    await db.borrowers.delete(borrowerId)
  })
}

async function ensureImportBorrowerAndDebt(
  input: {
    borrowerSourceKey: string
    borrowerName: string
    debtSourceKey: string
    debtLabel: string
    debtNotes: string
  },
  state: {
    borrowersBySource: Map<string, BorrowerRecord>
    debtsBySource: Map<string, DebtRecord>
  },
  now: string,
): Promise<{ borrower: BorrowerRecord; debt: DebtRecord }> {
  let borrower = state.borrowersBySource.get(input.borrowerSourceKey)
  if (!borrower) {
    borrower = {
      id: createId(),
      name: input.borrowerName,
      notes: '',
      sourceKey: input.borrowerSourceKey,
      createdAt: now,
      updatedAt: now,
    }
    await db.borrowers.add(borrower)
    state.borrowersBySource.set(input.borrowerSourceKey, borrower)
  }

  let debt = state.debtsBySource.get(input.debtSourceKey)
  if (!debt) {
    debt = {
      id: createId(),
      borrowerId: borrower.id,
      label: input.debtLabel,
      notes: input.debtNotes,
      status: 'open',
      currency: 'EUR',
      sourceKey: input.debtSourceKey,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    }
    await db.debts.add(debt)
    state.debtsBySource.set(input.debtSourceKey, debt)
  }

  return { borrower, debt }
}

export async function exportBackup(): Promise<AppBackupV2> {
  const [borrowers, debts, entries, imports, unresolvedImports, meta] = await Promise.all([
    db.borrowers.toArray(),
    db.debts.toArray(),
    db.entries.toArray(),
    db.imports.toArray(),
    db.unresolvedImports.toArray(),
    db.meta.toArray()
  ])

  const exportedAt = nowIso()
  const nextMeta = [
    ...meta.filter((record) => record.key !== 'lastBackupAt'),
    { key: 'lastBackupAt', value: exportedAt } satisfies MetaRecord
  ]

  await putMeta('lastBackupAt', exportedAt)

  return {
    version: 'app-backup-v2',
    exportedAt,
    borrowers,
    debts,
    entries,
    imports,
    unresolvedImports,
    meta: nextMeta
  }
}

export async function replaceFromBackup(backup: AppBackupV2): Promise<void> {
  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.imports, db.unresolvedImports, db.meta], async () => {
    await Promise.all([
      db.borrowers.clear(),
      db.debts.clear(),
      db.entries.clear(),
      db.imports.clear(),
      db.unresolvedImports.clear(),
      db.meta.clear()
    ])

    if (backup.borrowers.length > 0) {
      await db.borrowers.bulkAdd(backup.borrowers)
    }
    if (backup.debts.length > 0) {
      await db.debts.bulkAdd(backup.debts)
    }
    if (backup.entries.length > 0) {
      await db.entries.bulkAdd(backup.entries)
    }
    if (backup.imports.length > 0) {
      await db.imports.bulkAdd(backup.imports)
    }
    if (backup.unresolvedImports.length > 0) {
      await db.unresolvedImports.bulkAdd(backup.unresolvedImports)
    }
    if (backup.meta.length > 0) {
      await db.meta.bulkPut(backup.meta)
    }
  })
}

export async function applyImportPreview(preview: ImportPreview): Promise<ApplyImportPreviewResult> {
  const now = nowIso()
  const importSession: ImportSessionRecord = {
    id: createId(),
    createdAt: now,
    fileName: preview.fileName,
    fingerprint: preview.fingerprint,
    appliedBorrowers: 0,
    appliedDebts: 0,
    appliedEntries: 0,
    duplicateEntries: 0,
    queuedUnresolvedCount: 0,
    issueCount: preview.issues.length,
    notes: `Import ${preview.summary.entryCount} ecritures + ${preview.summary.unresolvedCount} ligne(s) en attente`
  }
  const affectedBorrowerIds = new Set<string>()
  const affectedDebtIds = new Set<string>()

  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.imports, db.unresolvedImports], async () => {
    const borrowersBySource = new Map<string, BorrowerRecord>()
    const debtsBySource = new Map<string, DebtRecord>()

    for (const borrower of await db.borrowers.toArray()) {
      if (borrower.sourceKey) {
        borrowersBySource.set(borrower.sourceKey, borrower)
      }
    }

    for (const debt of await db.debts.toArray()) {
      if (debt.sourceKey) {
        debtsBySource.set(debt.sourceKey, debt)
      }
    }

    for (const candidateDebt of preview.debts) {
      const borrowerExisted = borrowersBySource.has(candidateDebt.borrowerSourceKey)
      const debtExisted = debtsBySource.has(candidateDebt.sourceKey)
      const { borrower, debt } = await ensureImportBorrowerAndDebt(
        {
          borrowerSourceKey: candidateDebt.borrowerSourceKey,
          borrowerName: candidateDebt.borrowerName,
          debtSourceKey: candidateDebt.sourceKey,
          debtLabel: candidateDebt.label,
          debtNotes: candidateDebt.notes,
        },
        { borrowersBySource, debtsBySource },
        now,
      )
      affectedBorrowerIds.add(borrower.id)
      affectedDebtIds.add(debt.id)
      if (!borrowerExisted) {
        importSession.appliedBorrowers += 1
      }
      if (!debtExisted) {
        importSession.appliedDebts += 1
      }

      for (const candidateEntry of candidateDebt.entries) {
        const existing = await db.entries.where('signature').equals(candidateEntry.signature).first()
        if (existing) {
          importSession.duplicateEntries += 1
          continue
        }

        const entry: LedgerEntryRecord = {
          id: createId(),
          debtId: debt.id,
          kind: candidateEntry.kind,
          amountCents: candidateEntry.amountCents,
          periodKey: candidateEntry.periodKey,
          occurredOn: candidateEntry.occurredOn,
          description: candidateEntry.description,
          sourceRef: candidateEntry.sourceRef,
          signature: candidateEntry.signature,
          importSessionId: importSession.id,
          createdAt: now,
          updatedAt: now
        }

        await db.entries.add(entry)
        importSession.appliedEntries += 1
      }
    }

    for (const unresolvedEntry of preview.unresolvedEntries) {
      const borrowerExisted = borrowersBySource.has(unresolvedEntry.borrowerSourceKey)
      const debtExisted = debtsBySource.has(unresolvedEntry.debtSourceKey)
      const { borrower, debt } = await ensureImportBorrowerAndDebt(
        {
          borrowerSourceKey: unresolvedEntry.borrowerSourceKey,
          borrowerName: unresolvedEntry.borrowerName,
          debtSourceKey: unresolvedEntry.debtSourceKey,
          debtLabel: unresolvedEntry.debtLabel,
          debtNotes: `Importe depuis ${unresolvedEntry.sheetName}`,
        },
        { borrowersBySource, debtsBySource },
        now,
      )
      affectedBorrowerIds.add(borrower.id)
      affectedDebtIds.add(debt.id)
      if (!borrowerExisted) {
        importSession.appliedBorrowers += 1
      }
      if (!debtExisted) {
        importSession.appliedDebts += 1
      }

      const existing = await db.unresolvedImports.where('signature').equals(unresolvedEntry.signature).first()
      if (existing) {
        continue
      }

      const record: UnresolvedImportRecord = {
        id: createId(),
        fileName: preview.fileName,
        fingerprint: preview.fingerprint,
        borrowerId: borrower.id,
        borrowerSourceKey: unresolvedEntry.borrowerSourceKey,
        borrowerName: unresolvedEntry.borrowerName,
        debtId: debt.id,
        debtSourceKey: unresolvedEntry.debtSourceKey,
        debtLabel: unresolvedEntry.debtLabel,
        kind: unresolvedEntry.kind,
        amountCents: unresolvedEntry.amountCents,
        occurredOn: unresolvedEntry.occurredOn,
        description: unresolvedEntry.description,
        sourceRef: unresolvedEntry.sourceRef,
        sheetName: unresolvedEntry.sheetName,
        rowNumber: unresolvedEntry.rowNumber,
        reasonCode: unresolvedEntry.reasonCode,
        reasonMessage: unresolvedEntry.reasonMessage,
        signature: unresolvedEntry.signature,
        importSessionId: importSession.id,
        resolutionPeriodKey: null,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      }

      await db.unresolvedImports.add(record)
      importSession.queuedUnresolvedCount += 1
    }

    await db.imports.add(importSession)
  })

  return {
    session: importSession,
    mode: importSession.queuedUnresolvedCount > 0 ? 'partial' : 'full',
    affectedBorrowerIds: [...affectedBorrowerIds],
    affectedDebtIds: [...affectedDebtIds],
  }
}

export async function resolveUnresolvedImport(unresolvedImportId: string, periodKey: string): Promise<void> {
  const normalizedPeriodKey = periodKey.trim()
  if (!/^\d{4}-\d{2}$/.test(normalizedPeriodKey)) {
    throw new Error('Choisissez une période valide au format AAAA-MM.')
  }

  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.unresolvedImports, db.meta], async () => {
    const pending = await db.unresolvedImports.get(unresolvedImportId)
    if (!pending || pending.resolvedAt) {
      throw new Error('Cette ligne en attente est introuvable ou deja resolue.')
    }

    const borrowersBySource = new Map<string, BorrowerRecord>()
    const debtsBySource = new Map<string, DebtRecord>()
    for (const borrower of await db.borrowers.toArray()) {
      if (borrower.sourceKey) {
        borrowersBySource.set(borrower.sourceKey, borrower)
      }
    }
    for (const debt of await db.debts.toArray()) {
      if (debt.sourceKey) {
        debtsBySource.set(debt.sourceKey, debt)
      }
    }

    const { borrower, debt } = await ensureImportBorrowerAndDebt(
      {
        borrowerSourceKey: pending.borrowerSourceKey,
        borrowerName: pending.borrowerName,
        debtSourceKey: pending.debtSourceKey,
        debtLabel: pending.debtLabel,
        debtNotes: `Importe depuis ${pending.sheetName}`,
      },
      { borrowersBySource, debtsBySource },
      nowIso(),
    )

    const now = nowIso()
    const description = buildResolvedImportDescription(pending.description, normalizedPeriodKey)
    const signature = createImportEntrySignature({
      borrowerSourceKey: pending.borrowerSourceKey,
      debtSourceKey: pending.debtSourceKey,
      kind: pending.kind,
      amountCents: pending.amountCents,
      periodKey: normalizedPeriodKey,
      occurredOn: pending.occurredOn,
      description,
    })

    const existingEntry = await db.entries.where('signature').equals(signature).first()
    if (!existingEntry) {
      const entry: LedgerEntryRecord = {
        id: createId(),
        debtId: debt.id,
        kind: pending.kind,
        amountCents: pending.amountCents,
        periodKey: normalizedPeriodKey,
        occurredOn: pending.occurredOn,
        description,
        sourceRef: pending.sourceRef,
        signature,
        importSessionId: pending.importSessionId,
        createdAt: now,
        updatedAt: now,
      }
      await db.entries.add(entry)
    }

    await db.unresolvedImports.update(pending.id, {
      borrowerId: borrower.id,
      debtId: debt.id,
      resolutionPeriodKey: normalizedPeriodKey,
      resolvedAt: now,
      updatedAt: now,
    })

    const savedResolutions = await loadSavedImportResolutions(pending.fingerprint)
    const nextResolutions = dedupeImportIssueResolutions([
      ...savedResolutions,
      {
        sheetName: pending.sheetName,
        rowNumber: pending.rowNumber,
        periodKey: normalizedPeriodKey,
        occurredOn: pending.occurredOn,
      } satisfies ImportIssueResolution,
    ])
    await saveSavedImportResolutions(pending.fingerprint, nextResolutions)
  })
}

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.imports, db.unresolvedImports, db.meta], async () => {
    await Promise.all([
      db.borrowers.clear(),
      db.debts.clear(),
      db.entries.clear(),
      db.imports.clear(),
      db.unresolvedImports.clear(),
      db.meta.clear()
    ])
  })
}
