import { nowIso } from './format'
import type {
  AnnualSummary,
  AppSnapshot,
  BorrowerRecord,
  BorrowerView,
  DebtRecord,
  DebtView,
  ImportSessionRecord,
  LedgerEntryRecord,
  MetaRecord,
  MonthlySummary,
  UnresolvedImportRecord,
} from './types'

function comparePeriodsDescending(a: string, b: string): number {
  return b.localeCompare(a)
}

function entrySortKey(entry: LedgerEntryRecord): string {
  return entry.occurredOn ?? `${entry.periodKey}-99`
}

export function ledgerKindImpactCents(kind: LedgerEntryRecord['kind'], amountCents: number): number {
  switch (kind) {
    case 'opening_balance':
    case 'advance':
      return amountCents
    case 'payment':
      return -amountCents
    case 'adjustment':
      return amountCents
  }
}

export function entryImpactCents(entry: LedgerEntryRecord): number {
  return ledgerKindImpactCents(entry.kind, entry.amountCents)
}

export function computeDebtView(
  debt: DebtRecord,
  borrower: BorrowerRecord,
  entries: LedgerEntryRecord[],
  pendingImports: UnresolvedImportRecord[] = []
): DebtView {
  const sortedEntries = [...entries].sort((left, right) =>
    entrySortKey(right).localeCompare(entrySortKey(left))
  )
  const sortedPendingImports = [...pendingImports].sort((left, right) => {
    if (right.createdAt !== left.createdAt) {
      return right.createdAt.localeCompare(left.createdAt)
    }

    if (left.sheetName !== right.sheetName) {
      return left.sheetName.localeCompare(right.sheetName)
    }

    return left.rowNumber - right.rowNumber
  })

  let totalLentCents = 0
  let totalPaidCents = 0
  let totalAdjustmentCents = 0
  let lastPaymentOn: string | null = null
  const monthlyMap = new Map<string, MonthlySummary>()
  const annualMap = new Map<string, AnnualSummary>()

  for (const entry of sortedEntries) {
    const year = entry.periodKey.slice(0, 4)
    const monthly = monthlyMap.get(entry.periodKey) ?? {
      periodKey: entry.periodKey,
      lentCents: 0,
      paidCents: 0,
      adjustmentCents: 0,
      netChangeCents: 0
    }
    const annual = annualMap.get(year) ?? {
      year,
      lentCents: 0,
      paidCents: 0,
      adjustmentCents: 0,
      netChangeCents: 0
    }

    if (entry.kind === 'opening_balance' || entry.kind === 'advance') {
      totalLentCents += entry.amountCents
      monthly.lentCents += entry.amountCents
      annual.lentCents += entry.amountCents
    } else if (entry.kind === 'payment') {
      totalPaidCents += entry.amountCents
      monthly.paidCents += entry.amountCents
      annual.paidCents += entry.amountCents
      lastPaymentOn = lastPaymentOn ?? entry.occurredOn ?? `${entry.periodKey}-01`
    } else {
      totalAdjustmentCents += entry.amountCents
      monthly.adjustmentCents += entry.amountCents
      annual.adjustmentCents += entry.amountCents
    }

    const impact = entryImpactCents(entry)
    monthly.netChangeCents += impact
    annual.netChangeCents += impact
    monthlyMap.set(entry.periodKey, monthly)
    annualMap.set(year, annual)
  }

  return {
    debt,
    borrower,
    entries: sortedEntries,
    unresolvedImportCount: sortedPendingImports.length,
    pendingImports: sortedPendingImports,
    pendingImportedCents: sortedPendingImports.reduce(
      (sum, entry) => sum + ledgerKindImpactCents(entry.kind, entry.amountCents),
      0
    ),
    totalLentCents,
    totalPaidCents,
    totalAdjustmentCents,
    outstandingCents: totalLentCents + totalAdjustmentCents - totalPaidCents,
    annualSummaries: [...annualMap.values()].sort((left, right) => right.year.localeCompare(left.year)),
    monthlySummaries: [...monthlyMap.values()].sort((left, right) =>
      comparePeriodsDescending(left.periodKey, right.periodKey)
    ),
    lastPaymentOn
  }
}

export function buildAppSnapshot(input: {
  borrowers: BorrowerRecord[]
  debts: DebtRecord[]
  entries: LedgerEntryRecord[]
  imports: ImportSessionRecord[]
  unresolvedImports: UnresolvedImportRecord[]
  meta: MetaRecord[]
}): AppSnapshot {
  const borrowerById = new Map(input.borrowers.map((borrower) => [borrower.id, borrower]))
  const entriesByDebt = new Map<string, LedgerEntryRecord[]>()
  const unresolvedByDebt = new Map<string, UnresolvedImportRecord[]>()
  const unresolvedByBorrower = new Map<string, UnresolvedImportRecord[]>()

  for (const entry of input.entries) {
    const bucket = entriesByDebt.get(entry.debtId) ?? []
    bucket.push(entry)
    entriesByDebt.set(entry.debtId, bucket)
  }

  for (const unresolvedImport of input.unresolvedImports) {
    if (unresolvedImport.debtId) {
      const bucket = unresolvedByDebt.get(unresolvedImport.debtId) ?? []
      bucket.push(unresolvedImport)
      unresolvedByDebt.set(unresolvedImport.debtId, bucket)
    }
    if (unresolvedImport.borrowerId) {
      const bucket = unresolvedByBorrower.get(unresolvedImport.borrowerId) ?? []
      bucket.push(unresolvedImport)
      unresolvedByBorrower.set(unresolvedImport.borrowerId, bucket)
    }
  }

  const debtViews = input.debts
    .map((debt) => {
      const borrower = borrowerById.get(debt.borrowerId)
      if (!borrower) {
        return null
      }

      return computeDebtView(
        debt,
        borrower,
        entriesByDebt.get(debt.id) ?? [],
        unresolvedByDebt.get(debt.id) ?? []
      )
    })
    .filter((value): value is DebtView => value !== null)
    .sort((left, right) => {
      if (right.outstandingCents !== left.outstandingCents) {
        return right.outstandingCents - left.outstandingCents
      }

      return left.debt.label.localeCompare(right.debt.label)
    })

  const borrowerViews = input.borrowers
    .map((borrower) => {
      const debts = debtViews.filter((view) => view.borrower.id === borrower.id)
      const totalLentCents = debts.reduce((sum, debt) => sum + debt.totalLentCents, 0)
      const totalPaidCents = debts.reduce((sum, debt) => sum + debt.totalPaidCents, 0)
      const totalAdjustmentCents = debts.reduce((sum, debt) => sum + debt.totalAdjustmentCents, 0)
      const outstandingCents = debts.reduce((sum, debt) => sum + debt.outstandingCents, 0)
      const pendingImports = unresolvedByBorrower.get(borrower.id) ?? []

      return {
        borrower,
        debts,
        unresolvedImportCount: pendingImports.length,
        pendingImports: [...pendingImports].sort((left, right) => {
          if (right.createdAt !== left.createdAt) {
            return right.createdAt.localeCompare(left.createdAt)
          }

          if (left.debtLabel !== right.debtLabel) {
            return left.debtLabel.localeCompare(right.debtLabel)
          }

          return left.rowNumber - right.rowNumber
        }),
        pendingImportedCents: pendingImports.reduce(
          (sum, entry) => sum + ledgerKindImpactCents(entry.kind, entry.amountCents),
          0
        ),
        totalLentCents,
        totalPaidCents,
        totalAdjustmentCents,
        outstandingCents,
        openDebtCount: debts.filter((view) => view.debt.status === 'open').length
      } satisfies BorrowerView
    })
    .sort((left, right) => {
      if (right.outstandingCents !== left.outstandingCents) {
        return right.outstandingCents - left.outstandingCents
      }

      return left.borrower.name.localeCompare(right.borrower.name)
    })

  const recentPayments = input.entries
    .filter((entry) => entry.kind === 'payment')
    .sort((left, right) => entrySortKey(right).localeCompare(entrySortKey(left)))
    .slice(0, 8)

  const lastBackupAt = input.meta.find((record) => record.key === 'lastBackupAt')?.value ?? null
  const autoPersistAttemptedAt = input.meta.find((record) => record.key === 'autoPersistAttemptedAt')?.value ?? null
  const autoPersistResultValue = input.meta.find((record) => record.key === 'autoPersistResult')?.value ?? null

  return {
    borrowers: borrowerViews,
    debts: debtViews,
    debtMap: Object.fromEntries(debtViews.map((view) => [view.debt.id, view])),
    borrowerMap: Object.fromEntries(borrowerViews.map((view) => [view.borrower.id, view])),
    unresolvedImports: [...input.unresolvedImports].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    unresolvedImportCount: input.unresolvedImports.length,
    pendingImportedCents: input.unresolvedImports.reduce(
      (sum, entry) => sum + ledgerKindImpactCents(entry.kind, entry.amountCents),
      0
    ),
    totalLentCents: debtViews.reduce((sum, debt) => sum + debt.totalLentCents, 0),
    totalPaidCents: debtViews.reduce((sum, debt) => sum + debt.totalPaidCents, 0),
    totalAdjustmentCents: debtViews.reduce((sum, debt) => sum + debt.totalAdjustmentCents, 0),
    outstandingCents: debtViews.reduce((sum, debt) => sum + debt.outstandingCents, 0),
    recentPayments,
    importSessions: [...input.imports].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    lastBackupAt,
    autoPersistAttemptedAt,
    autoPersistResult:
      autoPersistResultValue === 'granted' ||
      autoPersistResultValue === 'denied' ||
      autoPersistResultValue === 'unsupported'
        ? autoPersistResultValue
        : null
  }
}

export function createEmptySnapshot(): AppSnapshot {
  return buildAppSnapshot({
    borrowers: [],
    debts: [],
    entries: [],
    imports: [],
    unresolvedImports: [],
    meta: [{ key: 'generatedAt', value: nowIso() }]
  })
}
