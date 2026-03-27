import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { importFixturePath } from '../fixtures/import/files'

const tempDirs: string[] = []
const repoRoot = path.resolve(path.dirname(importFixturePath('partial-workbook.ods')), '../../..')
const pythonCommand = process.platform === 'win32' ? 'wsl' : 'python3'
const pythonArgsPrefix = process.platform === 'win32' ? ['python3'] : []

interface WorkbookCellOptions {
  text?: string | null
  valueType?: 'date' | 'float'
  dateValue?: string
  value?: string
  repeat?: number
}

interface StructuredDateWorkbookOptions {
  fileName: string
  periodCell: WorkbookCellOptions
  detailDateCell?: WorkbookCellOptions
  detailText?: string | null
  detailAmountCell?: WorkbookCellOptions
  summaryPaymentCell?: WorkbookCellOptions
  summaryLentCell?: WorkbookCellOptions
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function buildTableCellXml(options: WorkbookCellOptions = {}): string {
  const attributes: string[] = []
  if (options.repeat && options.repeat > 1) {
    attributes.push(`table:number-columns-repeated="${options.repeat}"`)
  }
  if (options.valueType) {
    attributes.push(`office:value-type="${options.valueType}"`)
  }
  if (options.dateValue) {
    attributes.push(`office:date-value="${escapeXml(options.dateValue)}"`)
  }
  if (options.value) {
    attributes.push(`office:value="${escapeXml(options.value)}"`)
  }

  const attributeText = attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
  if (!options.text) {
    return `<table:table-cell${attributeText} />`
  }

  return `<table:table-cell${attributeText}>
            <text:p>${escapeXml(options.text)}</text:p>
          </table:table-cell>`
}

function buildStructuredDateWorkbookXml(options: StructuredDateWorkbookOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="dette_adel_test">
        <table:table-row>
          ${buildTableCellXml()}
          ${buildTableCellXml({ text: 'Date' })}
          ${buildTableCellXml({ text: 'Payé' })}
          ${buildTableCellXml({ text: 'Prêté' })}
          ${buildTableCellXml({ repeat: 2 })}
          ${buildTableCellXml({ text: "Date de l'opération" })}
          ${buildTableCellXml({ text: "Détail de l'écriture" })}
          ${buildTableCellXml({ text: "Montant de l'opération" })}
        </table:table-row>
        <table:table-row>
          ${buildTableCellXml()}
          ${buildTableCellXml(options.periodCell)}
          ${buildTableCellXml(options.summaryPaymentCell)}
          ${buildTableCellXml(options.summaryLentCell)}
          ${buildTableCellXml({ repeat: 2 })}
          ${buildTableCellXml(options.detailDateCell)}
          ${buildTableCellXml(options.detailText ? { text: options.detailText } : undefined)}
          ${buildTableCellXml(options.detailAmountCell)}
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`
}

function writeStructuredDateWorkbook(outputDir: string, options: StructuredDateWorkbookOptions): string {
  const workbookPath = path.join(outputDir, options.fileName)
  const contentXml = buildStructuredDateWorkbookXml(options)

  const result = spawnSync(
    pythonCommand,
    [...pythonArgsPrefix, '-c', `import sys, zipfile
path = sys.argv[1]
content = sys.argv[2]
with zipfile.ZipFile(path, 'w') as archive:
    archive.writestr('content.xml', content)
`, workbookPath, contentXml],
    {
      cwd: repoRoot,
      encoding: 'utf8'
    }
  )

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to create date-value ODS test fixture.')
  }

  return workbookPath
}

describe('import preview tooling', () => {
  it('generates the expected preview artifact for the partial workbook fixture', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'partial-preview.json')

    const result = spawnSync(pythonCommand, [...pythonArgsPrefix, 'tooling/import_workbook_preview.py', '--input', importFixturePath('partial-workbook.ods'), '--output', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(typeof actual.generatedAt).toBe('string')
    expect(actual.preview.fileName).toBe('partial-workbook.ods')
    expect(actual.preview.debts).toHaveLength(4)
    expect(actual.preview.entries).toHaveLength(13)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.summary.unresolvedCount).toBe(0)
    expect(actual.preview.issues).toHaveLength(0)
  })

  it('queues missing-period rows instead of blocking the whole workbook', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'broken-preview.json')

    const result = spawnSync(pythonCommand, [...pythonArgsPrefix, 'tooling/import_workbook_preview.py', '--input', importFixturePath('broken-workbook.ods'), '--output', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(actual.preview.fileName).toBe('broken-workbook.ods')
    expect(actual.preview.unresolvedEntries).toHaveLength(1)
    expect(actual.preview.summary.entryCount).toBe(0)
    expect(actual.preview.summary.unresolvedCount).toBe(1)
    expect(actual.preview.issues).toHaveLength(0)
    expect(actual.preview.debts[0].entries).toHaveLength(0)
  })

  it('queues continuation rows with missing periods and ignores summary label rows', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'continuation-preview.json')

    const result = spawnSync(pythonCommand, [...pythonArgsPrefix, 'tooling/import_workbook_preview.py', '--input', importFixturePath('continuation-workbook.ods'), '--output', outputPath], {
      cwd: repoRoot,
      encoding: 'utf8'
    })

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.preview.fileName).toBe('continuation-workbook.ods')
    expect(actual.preview.unresolvedEntries).toHaveLength(1)
    expect(actual.preview.summary.unresolvedCount).toBe(1)
    expect(actual.preview.issues).toHaveLength(0)
    expect(actual.preview.unresolvedEntries[0].rowNumber).toBe(2)
    expect(actual.preview.debts[0].entries).toHaveLength(3)
  })

  it('applies explicit local resolutions only to the targeted workbook rows', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const outputPath = path.join(outputDir, 'continuation-preview-resolved.json')

    const result = spawnSync(
      pythonCommand,
      [
        ...pythonArgsPrefix,
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
    expect(actual.preview.fileName).toBe('continuation-workbook.ods')
    expect(actual.preview.issues).toHaveLength(0)
    expect(actual.preview.entries).toHaveLength(4)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.summary.unresolvedCount).toBe(0)
    expect(actual.preview.summary.entryCount).toBe(4)
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
      pythonCommand,
      [
        ...pythonArgsPrefix,
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

  it('prefers structured LibreOffice date values over rendered text when exporting preview JSON', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const workbookPath = writeStructuredDateWorkbook(outputDir, {
      fileName: 'date-value-workbook.ods',
      periodCell: { text: 'XX/03/2026' },
      detailDateCell: { text: '02 mars 2026', valueType: 'date', dateValue: '2026-03-02' },
      detailText: 'VIR RECU TEST',
      detailAmountCell: { text: '500', valueType: 'float', value: '500' },
    })
    const outputPath = path.join(outputDir, 'date-value-preview.json')

    const result = spawnSync(
      pythonCommand,
      [...pythonArgsPrefix, 'tooling/import_workbook_preview.py', '--input', workbookPath, '--output', outputPath],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    )

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.preview.summary.entryCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.entries[0]?.periodKey).toBe('2026-03')
    expect(actual.preview.entries[0]?.occurredOn).toBe('2026-03-02')
  })

  it('keeps rendered month text when a detailed row period cell is stored as a structured date', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const workbookPath = writeStructuredDateWorkbook(outputDir, {
      fileName: 'period-date-workbook.ods',
      periodCell: { text: 'XX/03/2026', valueType: 'date', dateValue: '2026-03-01' },
      detailText: 'VIR RECU TEST',
      detailAmountCell: { text: '500', valueType: 'float', value: '500' },
    })
    const outputPath = path.join(outputDir, 'period-date-preview.json')

    const result = spawnSync(
      pythonCommand,
      [...pythonArgsPrefix, 'tooling/import_workbook_preview.py', '--input', workbookPath, '--output', outputPath],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    )

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.preview.summary.entryCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.entries[0]?.periodKey).toBe('2026-03')
    expect(actual.preview.entries[0]?.occurredOn).toBeNull()
  })

  it('keeps summary fallback imports when the period cell is stored as a structured date', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-import-preview-'))
    tempDirs.push(outputDir)
    const workbookPath = writeStructuredDateWorkbook(outputDir, {
      fileName: 'summary-period-date-workbook.ods',
      periodCell: { text: 'XX/03/2026', valueType: 'date', dateValue: '2026-03-01' },
      detailText: 'Paiement résumé',
      summaryPaymentCell: { text: '500', valueType: 'float', value: '500' },
    })
    const outputPath = path.join(outputDir, 'summary-period-date-preview.json')

    const result = spawnSync(
      pythonCommand,
      [...pythonArgsPrefix, 'tooling/import_workbook_preview.py', '--input', workbookPath, '--output', outputPath],
      {
        cwd: repoRoot,
        encoding: 'utf8'
      }
    )

    expect(result.status, result.stderr).toBe(0)

    const actual = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    expect(actual.preview.summary.entryCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.entries[0]?.kind).toBe('payment')
    expect(actual.preview.entries[0]?.periodKey).toBe('2026-03')
    expect(actual.preview.entries[0]?.occurredOn).toBeNull()
  })
})
