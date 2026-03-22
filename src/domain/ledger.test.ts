import { describe, expect, it } from 'vitest'
import { buildAppSnapshot, computeDebtView } from './ledger'
import type { BorrowerRecord, DebtRecord, LedgerEntryRecord, UnresolvedImportRecord } from './types'

const borrower: BorrowerRecord = {
  id: 'b1',
  name: 'Adel',
  notes: '',
  sourceKey: 'adel',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z'
}

const debt: DebtRecord = {
  id: 'd1',
  borrowerId: 'b1',
  label: 'Maison',
  notes: '',
  status: 'open',
  currency: 'EUR',
  sourceKey: 'adel:maison',
  createdAt: '2026-03-20T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
  closedAt: null
}

const entries: LedgerEntryRecord[] = [
  {
    id: 'e1',
    debtId: 'd1',
    kind: 'opening_balance',
    amountCents: 200_000,
    periodKey: '2024-01',
    occurredOn: '2024-01-10',
    description: '',
    sourceRef: null,
    signature: 'one',
    importSessionId: null,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z'
  },
  {
    id: 'e2',
    debtId: 'd1',
    kind: 'payment',
    amountCents: 25_000,
    periodKey: '2024-02',
    occurredOn: '2024-02-10',
    description: '',
    sourceRef: null,
    signature: 'two',
    importSessionId: null,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z'
  },
  {
    id: 'e3',
    debtId: 'd1',
    kind: 'advance',
    amountCents: 10_000,
    periodKey: '2024-03',
    occurredOn: '2024-03-12',
    description: '',
    sourceRef: null,
    signature: 'three',
    importSessionId: null,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z'
  }
]

const pendingImports: UnresolvedImportRecord[] = [
  {
    id: 'u1',
    fileName: 'suivi.ods',
    fingerprint: 'fingerprint',
    borrowerId: 'b1',
    borrowerSourceKey: 'adel',
    borrowerName: 'Adel',
    debtId: 'd1',
    debtSourceKey: 'adel:maison',
    debtLabel: 'Maison',
    kind: 'advance',
    amountCents: 15_000,
    occurredOn: null,
    description: 'Virement',
    sourceRef: 'dette_adel_1:2',
    sheetName: 'dette_adel_1',
    rowNumber: 2,
    reasonCode: 'missing_period',
    reasonMessage: 'Impossible de deduire la periode.',
    signature: 'pending-one',
    importSessionId: 'import-1',
    resolutionPeriodKey: null,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    resolvedAt: null
  }
]

describe('ledger', () => {
  it('computes outstanding balance and annual summaries', () => {
    const view = computeDebtView(debt, borrower, entries)

    expect(view.totalLentCents).toBe(210_000)
    expect(view.totalPaidCents).toBe(25_000)
    expect(view.outstandingCents).toBe(185_000)
    expect(view.annualSummaries[0]?.year).toBe('2024')
  })

  it('builds borrower rollups', () => {
    const snapshot = buildAppSnapshot({
      borrowers: [borrower],
      debts: [debt],
      entries,
      imports: [],
      unresolvedImports: pendingImports,
      meta: []
    })

    expect(snapshot.borrowers[0]?.outstandingCents).toBe(185_000)
    expect(snapshot.borrowers[0]?.pendingImportedCents).toBe(15_000)
    expect(snapshot.borrowers[0]?.pendingImports).toHaveLength(1)
    expect(snapshot.debts[0]?.pendingImports).toHaveLength(1)
    expect(snapshot.pendingImportedCents).toBe(15_000)
    expect(snapshot.totalPaidCents).toBe(25_000)
  })
})
