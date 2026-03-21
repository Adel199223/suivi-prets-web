import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { importFixturePath, readImportPreviewArtifact } from '../fixtures/import/files'

const tempDirs: string[] = []
const repoRoot = path.resolve(path.dirname(importFixturePath('partial-workbook.ods')), '../../..')

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('import preview tooling', () => {
  it('generates the expected preview artifact for the partial workbook fixture', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'partial-preview.json')

    const result = spawnSync('python3', ['tooling/import_workbook_preview.py', '--input', importFixturePath('partial-workbook.ods'), '--output', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    const expected = readImportPreviewArtifact('partial-preview.json')
    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(typeof actual.generatedAt).toBe('string')
    expect(actual.preview).toEqual(expected.preview)
  })

  it('reports malformed workbook rows as issues instead of importing them', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'broken-preview.json')

    const result = spawnSync('python3', ['tooling/import_workbook_preview.py', '--input', importFixturePath('broken-workbook.ods'), '--output', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(actual.preview.issues.length).toBeGreaterThan(0)
    expect(actual.preview.summary.entryCount).toBe(0)
  })

  it('inherits the previous period for continuation rows and ignores summary label rows', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'continuation-preview.json')

    const result = spawnSync('python3', ['tooling/import_workbook_preview.py', '--input', importFixturePath('continuation-workbook.ods'), '--output', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    const expected = readImportPreviewArtifact('continuation-preview.json')
    expect(actual.preview).toEqual(expected.preview)
    expect(actual.preview.issues).toHaveLength(1)
    expect(actual.preview.issues[0].rowNumber).toBe(2)
    expect(actual.preview.debts[0].entries).toHaveLength(3)
  })

  it('applies explicit local resolutions only to the targeted workbook rows', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'continuation-preview-resolved.json')

    const result = spawnSync(
      'python3',
      [
        'tooling/import_workbook_preview.py',
        '--input',
        importFixturePath('continuation-workbook.ods'),
        '--output',
        outputPath,
        '--resolutions',
        importFixturePath('continuation-resolutions.json')
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    )

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    const expected = readImportPreviewArtifact('continuation-preview-resolved.json')
    expect(actual.preview).toEqual(expected.preview)
    expect(actual.preview.issues).toHaveLength(0)
    expect(actual.preview.entries).toHaveLength(4)
    const resolvedEntry = actual.preview.entries.find((entry: { sourceRef: string }) => entry.sourceRef === 'dette_adel_inconnue:2')
    expect(resolvedEntry?.description).toContain('[periode resolue manuellement: 2021-01]')
  })

  it('rejects resolution files that target the wrong workbook fingerprint', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'continuation-preview-invalid.json')
    const resolutionsPath = path.join(outputDir, 'invalid-resolutions.json')

    fs.writeFileSync(
      resolutionsPath,
      JSON.stringify(
        {
          version: 'workbook-import-resolutions-v1',
          targetFingerprint: 'not-the-right-fingerprint',
          resolutions: [
            {
              sheetName: 'dette_adel_inconnue',
              rowNumber: 2,
              periodKey: '2021-01',
              occurredOn: null
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    )

    const result = spawnSync(
      'python3',
      [
        'tooling/import_workbook_preview.py',
        '--input',
        importFixturePath('continuation-workbook.ods'),
        '--output',
        outputPath,
        '--resolutions',
        resolutionsPath
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    )

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('fingerprint')
  })
})
