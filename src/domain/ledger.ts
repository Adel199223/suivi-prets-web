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
  MonthlySummary
} from './types'

function comparePeriodsDescending(a: string, b: string): number {
  return b.localeCompare(a)
}

function entrySortKey(entry: LedgerEntryRecord): string {
  return entry.occurredOn ?? `${entry.periodKey}-99`
}

export function entryImpactCents(entry: LedgerEntryRecord): number {
  switch (entry.kind) {
    case 'opening_balance':
    case 'advance':
      return entry.amountCents
    case 'payment':
      return -entry.amountCents
    case 'adjustment':
      return entry.amountCents
  }
}

export function computeDebtView(
  debt: DebtRecord,
  borrower: BorrowerRecord,
  entries: LedgerEntryRecord[]
): DebtView {
  const sortedEntries = [...entries].sort((left, right) =>
    entrySortKey(right).localeCompare(entrySortKey(left))
  )

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
  meta: MetaRecord[]
}): AppSnapshot {
  const borrowerById = new Map(input.borrowers.map((borrower) => [borrower.id, borrower]))
  const entriesByDebt = new Map<string, LedgerEntryRecord[]>()

  for (const entry of input.entries) {
    const bucket = entriesByDebt.get(entry.debtId) ?? []
    bucket.push(entry)
    entriesByDebt.set(entry.debtId, bucket)
  }

  const debtViews = input.debts
    .map((debt) => {
      const borrower = borrowerById.get(debt.borrowerId)
      if (!borrower) {
        return null
      }

      return computeDebtView(debt, borrower, entriesByDebt.get(debt.id) ?? [])
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

      return {
        borrower,
        debts,
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

  return {
    borrowers: borrowerViews,
    debts: debtViews,
    debtMap: Object.fromEntries(debtViews.map((view) => [view.debt.id, view])),
    borrowerMap: Object.fromEntries(borrowerViews.map((view) => [view.borrower.id, view])),
    totalLentCents: debtViews.reduce((sum, debt) => sum + debt.totalLentCents, 0),
    totalPaidCents: debtViews.reduce((sum, debt) => sum + debt.totalPaidCents, 0),
    totalAdjustmentCents: debtViews.reduce((sum, debt) => sum + debt.totalAdjustmentCents, 0),
    outstandingCents: debtViews.reduce((sum, debt) => sum + debt.outstandingCents, 0),
    recentPayments,
    importSessions: [...input.imports].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    lastBackupAt
  }
}

export function createEmptySnapshot(): AppSnapshot {
  return buildAppSnapshot({
    borrowers: [],
    debts: [],
    entries: [],
    imports: [],
    meta: [{ key: 'generatedAt', value: nowIso() }]
  })
}
