import { beforeEach, describe, expect, it } from 'vitest'
import { readImportPreview } from '../../test/fixtures/import/files'
import { applyImportPreview, buildSnapshot, resetAllData } from './repository'

describe('repository import merge', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  it('dedupes a repeated import', async () => {
    const preview = readImportPreview('partial-preview.json')
    const first = await applyImportPreview(preview)
    const second = await applyImportPreview(preview)

    expect(first.appliedEntries).toBeGreaterThan(0)
    expect(second.appliedEntries).toBe(0)
    expect(second.duplicateEntries).toBe(first.appliedEntries)
  })

  it('adds only unseen debts and borrowers from a later full workbook import', async () => {
    await applyImportPreview(readImportPreview('partial-preview.json'))
    const second = await applyImportPreview(readImportPreview('full-preview.json'))
    const snapshot = await buildSnapshot()

    expect(second.appliedBorrowers).toBeGreaterThan(0)
    expect(second.appliedDebts).toBeGreaterThan(0)
    expect(snapshot.borrowers.length).toBeGreaterThanOrEqual(4)
  })
})
