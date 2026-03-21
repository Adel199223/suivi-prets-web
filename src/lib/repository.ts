import { buildAppSnapshot } from '../domain/ledger'
import { nowIso, periodKeyFromDate, toSlug } from '../domain/format'
import type {
  AppBackupV1,
  AppSnapshot,
  BorrowerRecord,
  DebtRecord,
  EntryKind,
  ImportPreview,
  ImportSessionRecord,
  LedgerEntryRecord,
  MetaRecord
} from '../domain/types'
import { db } from './db'

function createId(): string {
  return crypto.randomUUID()
}

async function putMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value })
}

export async function buildSnapshot(): Promise<AppSnapshot> {
  const [borrowers, debts, entries, imports, meta] = await Promise.all([
    db.borrowers.toArray(),
    db.debts.toArray(),
    db.entries.toArray(),
    db.imports.toArray(),
    db.meta.toArray()
  ])

  return buildAppSnapshot({ borrowers, debts, entries, imports, meta })
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

export async function updateBorrowerNotes(borrowerId: string, notes: string): Promise<void> {
  await db.borrowers.update(borrowerId, {
    notes: notes.trim(),
    updatedAt: nowIso()
  })
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

export async function updateDebtNotes(debtId: string, notes: string): Promise<void> {
  await db.debts.update(debtId, {
    notes: notes.trim(),
    updatedAt: nowIso()
  })
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

export async function setDebtClosed(debtId: string, closed: boolean): Promise<void> {
  await db.debts.update(debtId, {
    status: closed ? 'closed' : 'open',
    closedAt: closed ? nowIso() : null,
    updatedAt: nowIso()
  })
}

export async function exportBackup(): Promise<AppBackupV1> {
  const [borrowers, debts, entries, imports, meta] = await Promise.all([
    db.borrowers.toArray(),
    db.debts.toArray(),
    db.entries.toArray(),
    db.imports.toArray(),
    db.meta.toArray()
  ])

  const exportedAt = nowIso()
  const nextMeta = [
    ...meta.filter((record) => record.key !== 'lastBackupAt'),
    { key: 'lastBackupAt', value: exportedAt } satisfies MetaRecord
  ]

  await putMeta('lastBackupAt', exportedAt)

  return {
    version: 'app-backup-v1',
    exportedAt,
    borrowers,
    debts,
    entries,
    imports,
    meta: nextMeta
  }
}

export async function replaceFromBackup(backup: AppBackupV1): Promise<void> {
  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.imports, db.meta], async () => {
    await Promise.all([
      db.borrowers.clear(),
      db.debts.clear(),
      db.entries.clear(),
      db.imports.clear(),
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
    if (backup.meta.length > 0) {
      await db.meta.bulkPut(backup.meta)
    }
  })
}

export async function applyImportPreview(preview: ImportPreview): Promise<ImportSessionRecord> {
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
    issueCount: preview.issues.length,
    notes: `Import ${preview.summary.entryCount} ecritures`
  }

  await db.transaction('rw', db.borrowers, db.debts, db.entries, db.imports, async () => {
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
      let borrower = borrowersBySource.get(candidateDebt.borrowerSourceKey)
      if (!borrower) {
        borrower = {
          id: createId(),
          name: candidateDebt.borrowerName,
          notes: '',
          sourceKey: candidateDebt.borrowerSourceKey,
          createdAt: now,
          updatedAt: now
        }
        await db.borrowers.add(borrower)
        borrowersBySource.set(candidateDebt.borrowerSourceKey, borrower)
        importSession.appliedBorrowers += 1
      }

      let debt = debtsBySource.get(candidateDebt.sourceKey)
      if (!debt) {
        debt = {
          id: createId(),
          borrowerId: borrower.id,
          label: candidateDebt.label,
          notes: candidateDebt.notes,
          status: 'open',
          currency: 'EUR',
          sourceKey: candidateDebt.sourceKey,
          createdAt: now,
          updatedAt: now,
          closedAt: null
        }
        await db.debts.add(debt)
        debtsBySource.set(candidateDebt.sourceKey, debt)
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

    await db.imports.add(importSession)
  })

  return importSession
}

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', [db.borrowers, db.debts, db.entries, db.imports, db.meta], async () => {
    await Promise.all([
      db.borrowers.clear(),
      db.debts.clear(),
      db.entries.clear(),
      db.imports.clear(),
      db.meta.clear()
    ])
  })
}
