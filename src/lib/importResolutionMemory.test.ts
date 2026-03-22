import { beforeEach, describe, expect, it } from 'vitest'
import type { ImportIssueResolution } from '../domain/types'
import { exportBackup, replaceFromBackup, resetAllData } from './repository'
import {
  clearSavedImportResolutions,
  loadSavedImportResolutions,
  saveSavedImportResolutions,
} from './importResolutionMemory'

const FINGERPRINT = 'abc123'

const SAMPLE_RESOLUTION: ImportIssueResolution = {
  sheetName: 'dette_adel_1',
  rowNumber: 2,
  periodKey: '2024-01',
  occurredOn: null,
}

describe('import resolution memory', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  it('stores deduped fingerprint-scoped resolutions', async () => {
    await saveSavedImportResolutions(FINGERPRINT, [
      SAMPLE_RESOLUTION,
      { ...SAMPLE_RESOLUTION, periodKey: '2024-02' },
      { ...SAMPLE_RESOLUTION, rowNumber: 0, periodKey: 'bad' },
    ])

    expect(await loadSavedImportResolutions(FINGERPRINT)).toEqual([
      { ...SAMPLE_RESOLUTION, periodKey: '2024-02' },
    ])
    expect(await loadSavedImportResolutions('other-fingerprint')).toEqual([])
  })

  it('survives backup export and restore because it lives in app meta storage', async () => {
    await saveSavedImportResolutions(FINGERPRINT, [SAMPLE_RESOLUTION])
    const backup = await exportBackup()

    await resetAllData()
    expect(await loadSavedImportResolutions(FINGERPRINT)).toEqual([])

    await replaceFromBackup(backup)
    expect(await loadSavedImportResolutions(FINGERPRINT)).toEqual([SAMPLE_RESOLUTION])

    await clearSavedImportResolutions(FINGERPRINT)
    expect(await loadSavedImportResolutions(FINGERPRINT)).toEqual([])
  })
})
