import Dexie, { type Table } from 'dexie'
import type {
  BorrowerRecord,
  DebtRecord,
  ImportSessionRecord,
  LedgerEntryRecord,
  MetaRecord
} from '../domain/types'

class SuiviPretsDb extends Dexie {
  borrowers!: Table<BorrowerRecord, string>
  debts!: Table<DebtRecord, string>
  entries!: Table<LedgerEntryRecord, string>
  imports!: Table<ImportSessionRecord, string>
  meta!: Table<MetaRecord, string>

  constructor() {
    super('suivi-prets-web')

    this.version(1).stores({
      borrowers: 'id, sourceKey, updatedAt',
      debts: 'id, borrowerId, sourceKey, status, updatedAt',
      entries: 'id, debtId, kind, periodKey, occurredOn, &signature',
      imports: 'id, createdAt, fingerprint',
      meta: 'key'
    })
  }
}

export const db = new SuiviPretsDb()
