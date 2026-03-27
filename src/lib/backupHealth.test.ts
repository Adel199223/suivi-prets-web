import { describe, expect, it } from 'vitest'
import { buildAppSnapshot } from '../domain/ledger'
import { deriveBackupHealth } from './backupHealth'
import type { StorageStatus } from './storagePersistence'

const persistedStorage: StorageStatus = {
  persisted: true,
  quotaMb: 1024,
  usageMb: 8
}

const volatileStorage: StorageStatus = {
  persisted: false,
  quotaMb: 1024,
  usageMb: 8
}

describe('backup health', () => {
  it('treats local data without exported backup as locally saved but only lightly protected', () => {
    const snapshot = buildAppSnapshot({
      borrowers: [
        {
          id: 'borrower-1',
          name: 'Amina',
          notes: '',
          sourceKey: null,
          createdAt: '2026-03-21T10:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z'
        }
      ],
      debts: [],
      entries: [],
      imports: [],
      unresolvedImports: [],
      meta: []
    })

    const health = deriveBackupHealth(snapshot, volatileStorage)
    expect(health.state).toBe('local_volatile')
    expect(health.headline).toMatch(/données déjà enregistrées sur cet appareil/i)
    expect(health.detail).toMatch(/aucune action n’est requise pour continuer/i)
  })

  it('flags only the external json copy as stale after newer local changes', () => {
    const snapshot = buildAppSnapshot({
      borrowers: [],
      debts: [],
      entries: [],
      imports: [
        {
          id: 'import-1',
          createdAt: '2026-03-21T11:00:00.000Z',
          fileName: 'suivi.ods',
          fingerprint: 'fingerprint',
          appliedBorrowers: 2,
          appliedDebts: 4,
          appliedEntries: 10,
          duplicateEntries: 0,
          queuedUnresolvedCount: 0,
          issueCount: 1,
          notes: 'Import test'
        }
      ],
      unresolvedImports: [],
      meta: [{ key: 'lastBackupAt', value: '2026-03-21T10:00:00.000Z' }]
    })

    const health = deriveBackupHealth(snapshot, persistedStorage)
    expect(health.state).toBe('backup_stale')
    expect(health.detail).toMatch(/copie de secours/i)
  })

  it('treats pending unresolved imports as local data already saved on this device', () => {
    const snapshot = buildAppSnapshot({
      borrowers: [],
      debts: [],
      entries: [],
      imports: [],
      unresolvedImports: [
        {
          id: 'pending-1',
          fileName: 'suivi.ods',
          fingerprint: 'fingerprint',
          borrowerId: null,
          borrowerSourceKey: 'adel',
          borrowerName: 'Adel',
          debtId: null,
          debtSourceKey: 'adel:dette-1',
          debtLabel: 'Dette 1',
          kind: 'advance',
          amountCents: 125000,
          occurredOn: null,
          description: 'Virement',
          sourceRef: 'dette_adel_1:2',
          sheetName: 'dette_adel_1',
          rowNumber: 2,
          reasonCode: 'missing_period',
          reasonMessage: 'Impossible de déduire la période.',
          signature: 'pending-signature',
          importSessionId: null,
          resolutionPeriodKey: null,
          createdAt: '2026-03-21T11:00:00.000Z',
          updatedAt: '2026-03-21T11:00:00.000Z',
          resolvedAt: null
        }
      ],
      meta: []
    })

    const health = deriveBackupHealth(snapshot, persistedStorage)
    expect(health.state).toBe('local_persistent')
    expect(health.detail).toMatch(/aucune action n’est requise pour continuer/i)
  })

  it('keeps a current external backup as the highest protection state', () => {
    const snapshot = buildAppSnapshot({
      borrowers: [
        {
          id: 'borrower-1',
          name: 'Amina',
          notes: '',
          sourceKey: null,
          createdAt: '2026-03-21T10:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z'
        }
      ],
      debts: [],
      entries: [],
      imports: [],
      unresolvedImports: [],
      meta: [{ key: 'lastBackupAt', value: '2026-03-21T10:30:00.000Z' }]
    })

    const health = deriveBackupHealth(snapshot, persistedStorage)
    expect(health.state).toBe('backup_current')
    expect(health.headline).toMatch(/copie de secours à jour/i)
  })
})
