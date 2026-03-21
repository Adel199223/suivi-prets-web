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
})
