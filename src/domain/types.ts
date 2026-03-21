export type EntryKind = 'opening_balance' | 'advance' | 'payment' | 'adjustment'

export interface BorrowerRecord {
  id: string
  name: string
  notes: string
  sourceKey: string | null
  createdAt: string
  updatedAt: string
}

export interface DebtRecord {
  id: string
  borrowerId: string
  label: string
  notes: string
  status: 'open' | 'closed'
  currency: 'EUR'
  sourceKey: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

export interface LedgerEntryRecord {
  id: string
  debtId: string
  kind: EntryKind
  amountCents: number
  periodKey: string
  occurredOn: string | null
  description: string
  sourceRef: string | null
  signature: string
  importSessionId: string | null
  createdAt: string
  updatedAt: string
}

export interface ImportSessionRecord {
  id: string
  createdAt: string
  fileName: string
  fingerprint: string
  appliedBorrowers: number
  appliedDebts: number
  appliedEntries: number
  duplicateEntries: number
  issueCount: number
  notes: string
}

export interface MetaRecord {
  key: string
  value: string
}

export interface AppBackupV1 {
  version: 'app-backup-v1'
  exportedAt: string
  borrowers: BorrowerRecord[]
  debts: DebtRecord[]
  entries: LedgerEntryRecord[]
  imports: ImportSessionRecord[]
  meta: MetaRecord[]
}

export interface ImportIssue {
  sheetName: string
  rowNumber: number
  code: 'missing_period' | 'invalid_amount' | 'ignored_sheet'
  message: string
}

export interface ImportCandidateEntry {
  debtSourceKey: string
  borrowerSourceKey: string
  borrowerName: string
  debtLabel: string
  kind: EntryKind
  amountCents: number
  periodKey: string
  occurredOn: string | null
  description: string
  signature: string
  sourceRef: string
  sheetName: string
  rowNumber: number
}

export interface ImportCandidateDebt {
  sourceKey: string
  borrowerSourceKey: string
  borrowerName: string
  label: string
  notes: string
  sheetName: string
  entries: ImportCandidateEntry[]
}

export interface ImportPreview {
  fileName: string
  fingerprint: string
  debts: ImportCandidateDebt[]
  entries: ImportCandidateEntry[]
  issues: ImportIssue[]
  summary: {
    debtCount: number
    borrowerCount: number
    entryCount: number
    paymentCount: number
    advanceCount: number
    outstandingImportedCents: number
  }
}

export interface WorkbookImportPreviewV1 {
  version: 'workbook-import-preview-v1'
  generatedAt: string
  preview: ImportPreview
}

export interface MonthlySummary {
  periodKey: string
  lentCents: number
  paidCents: number
  adjustmentCents: number
  netChangeCents: number
}

export interface AnnualSummary {
  year: string
  lentCents: number
  paidCents: number
  adjustmentCents: number
  netChangeCents: number
}

export interface DebtView {
  debt: DebtRecord
  borrower: BorrowerRecord
  entries: LedgerEntryRecord[]
  totalLentCents: number
  totalPaidCents: number
  totalAdjustmentCents: number
  outstandingCents: number
  annualSummaries: AnnualSummary[]
  monthlySummaries: MonthlySummary[]
  lastPaymentOn: string | null
}

export interface BorrowerView {
  borrower: BorrowerRecord
  debts: DebtView[]
  totalLentCents: number
  totalPaidCents: number
  totalAdjustmentCents: number
  outstandingCents: number
  openDebtCount: number
}

export interface AppSnapshot {
  borrowers: BorrowerView[]
  debts: DebtView[]
  debtMap: Record<string, DebtView>
  borrowerMap: Record<string, BorrowerView>
  totalLentCents: number
  totalPaidCents: number
  totalAdjustmentCents: number
  outstandingCents: number
  recentPayments: LedgerEntryRecord[]
  importSessions: ImportSessionRecord[]
  lastBackupAt: string | null
}
