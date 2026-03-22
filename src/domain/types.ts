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
  queuedUnresolvedCount: number
  issueCount: number
  notes: string
}

export interface ApplyImportPreviewResult {
  session: ImportSessionRecord
  mode: 'full' | 'partial'
  affectedBorrowerIds: string[]
  affectedDebtIds: string[]
}

export interface MetaRecord {
  key: string
  value: string
}

export interface UnresolvedImportRecord {
  id: string
  fileName: string
  fingerprint: string
  borrowerId: string | null
  borrowerSourceKey: string
  borrowerName: string
  debtId: string | null
  debtSourceKey: string
  debtLabel: string
  kind: EntryKind
  amountCents: number
  occurredOn: string | null
  description: string
  sourceRef: string
  sheetName: string
  rowNumber: number
  reasonCode: 'missing_period'
  reasonMessage: string
  signature: string
  importSessionId: string | null
  resolutionPeriodKey: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
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

export interface AppBackupV2 {
  version: 'app-backup-v2'
  exportedAt: string
  borrowers: BorrowerRecord[]
  debts: DebtRecord[]
  entries: LedgerEntryRecord[]
  imports: ImportSessionRecord[]
  unresolvedImports: UnresolvedImportRecord[]
  meta: MetaRecord[]
}

export type AppBackup = AppBackupV1 | AppBackupV2

export interface ImportIssue {
  sheetName: string
  rowNumber: number
  code: 'missing_period' | 'invalid_amount' | 'ignored_sheet'
  message: string
}

export interface ImportIssueResolution {
  sheetName: string
  rowNumber: number
  periodKey: string
  occurredOn: string | null
}

export interface ImportUnresolvedCandidate {
  debtSourceKey: string
  borrowerSourceKey: string
  borrowerName: string
  debtLabel: string
  kind: EntryKind
  amountCents: number
  occurredOn: string | null
  description: string
  sourceRef: string
  sheetName: string
  rowNumber: number
  reasonCode: 'missing_period'
  reasonMessage: string
  signature: string
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
  unresolvedEntries: ImportUnresolvedCandidate[]
  issues: ImportIssue[]
  summary: {
    debtCount: number
    borrowerCount: number
    entryCount: number
    unresolvedCount: number
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

export type AutoPersistResult = 'granted' | 'denied' | 'unsupported' | null

export interface BackupHealth {
  state: 'empty' | 'local_volatile' | 'local_persistent' | 'backup_stale' | 'backup_current'
  headline: string
  detail: string
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
  unresolvedImportCount: number
  pendingImports: UnresolvedImportRecord[]
  pendingImportedCents: number
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
  unresolvedImportCount: number
  pendingImports: UnresolvedImportRecord[]
  pendingImportedCents: number
  totalLentCents: number
  totalPaidCents: number
  totalAdjustmentCents: number
  outstandingCents: number
  openDebtCount: number
}

export interface RecentImportOutcome {
  sessionId: string
  fileName: string
  mode: 'full' | 'partial'
  appliedEntries: number
  duplicateEntries: number
  affectedBorrowerIds: string[]
  affectedDebtIds: string[]
}

export interface AppSnapshot {
  borrowers: BorrowerView[]
  debts: DebtView[]
  debtMap: Record<string, DebtView>
  borrowerMap: Record<string, BorrowerView>
  unresolvedImports: UnresolvedImportRecord[]
  unresolvedImportCount: number
  pendingImportedCents: number
  totalLentCents: number
  totalPaidCents: number
  totalAdjustmentCents: number
  outstandingCents: number
  recentPayments: LedgerEntryRecord[]
  importSessions: ImportSessionRecord[]
  lastBackupAt: string | null
  autoPersistAttemptedAt: string | null
  autoPersistResult: AutoPersistResult
}
