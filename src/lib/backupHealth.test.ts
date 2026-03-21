import { describe, expect, it } from 'vitest'
import { buildAppSnapshot } from '../domain/ledger'
import { deriveBackupHealth } from './backupHealth'

describe('backup health', () => {
  it('flags local data without any exported backup', () => {
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
      meta: []
    })

    const health = deriveBackupHealth(snapshot)
    expect(health.state).toBe('missing')
    expect(health.headline).toMatch(/sauvegarde requise/i)
  })

  it('flags a stale backup after a newer import session', () => {
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
          issueCount: 1,
          notes: 'Import test'
        }
      ],
      meta: [{ key: 'lastBackupAt', value: '2026-03-21T10:00:00.000Z' }]
    })

    const health = deriveBackupHealth(snapshot)
    expect(health.state).toBe('stale')
    expect(health.detail).toMatch(/changements plus recents/i)
  })
})
