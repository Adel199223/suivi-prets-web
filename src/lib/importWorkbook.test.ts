import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildWorkbookFile } from '../../test/fixtures/import/files'
import { parseImportWorkbookFile } from './importWorkbook'
import { applyImportPreview, buildSnapshot, resetAllData } from './repository'

const tempDirs: string[] = []
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

function buildStructuredDateWorkbookFile(options: StructuredDateWorkbookOptions): File {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suivi-prets-date-value-'))
  tempDirs.push(outputDir)
  const workbookPath = path.join(outputDir, options.fileName)
  const contentXml = buildStructuredDateWorkbookXml(options)

  const result = spawnSync(
    pythonCommand,
    [
      ...pythonArgsPrefix,
      '-c',
      `import sys, zipfile
path = sys.argv[1]
content = sys.argv[2]
with zipfile.ZipFile(path, 'w') as archive:
    archive.writestr('content.xml', content)
`,
      workbookPath,
      contentXml,
    ],
    { encoding: 'utf8' }
  )

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to create date-value ODS test fixture.')
  }

  return new File([fs.readFileSync(workbookPath)], options.fileName, {
    type: 'application/vnd.oasis.opendocument.spreadsheet'
  })
}

describe('browser ods import parser', () => {
  beforeEach(async () => {
    await resetAllData()
  })

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('parses a valid workbook into safe entries without unresolved rows', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))

    expect(actual.version).toBe('workbook-import-preview-v1')
    expect(actual.preview.summary.borrowerCount).toBeGreaterThan(0)
    expect(actual.preview.summary.entryCount).toBeGreaterThan(0)
    expect(actual.preview.summary.unresolvedCount).toBe(0)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.issues).toHaveLength(0)
  })

  it('keeps queueable missing-period rows as unresolved instead of blocking the whole workbook', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('broken-workbook.ods'))

    expect(actual.preview.summary.entryCount).toBe(0)
    expect(actual.preview.summary.unresolvedCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(1)
    expect(actual.preview.unresolvedEntries[0]?.sheetName).toBe('dette_adel_1')
    expect(actual.preview.unresolvedEntries[0]?.rowNumber).toBe(2)
    expect(actual.preview.issues).toHaveLength(0)
    expect(actual.preview.debts).toHaveLength(1)
  })

  it('inherits the previous period for continuation rows while queueing only the truly ambiguous one', async () => {
    const actual = await parseImportWorkbookFile(buildWorkbookFile('continuation-workbook.ods'))

    expect(actual.preview.debts[0]?.entries).toHaveLength(3)
    expect(actual.preview.summary.unresolvedCount).toBe(1)
    expect(actual.preview.unresolvedEntries[0]?.rowNumber).toBe(2)
  })

  it('dedupes a repeated workbook import end to end', async () => {
    const firstWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const secondWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))

    const firstSession = await applyImportPreview(firstWorkbook.preview)
    const secondSession = await applyImportPreview(secondWorkbook.preview)

    expect(firstSession.session.appliedEntries).toBeGreaterThan(0)
    expect(firstSession.mode).toBe('full')
    expect(secondSession.session.appliedEntries).toBe(0)
    expect(secondSession.session.duplicateEntries).toBe(firstSession.session.appliedEntries)
  })

  it('merges only unseen people and debts from a later fuller workbook', async () => {
    const firstWorkbook = await parseImportWorkbookFile(buildWorkbookFile('partial-workbook.ods'))
    const fullWorkbook = await parseImportWorkbookFile(buildWorkbookFile('full-workbook.ods'))

    await applyImportPreview(firstWorkbook.preview)
    const secondSession = await applyImportPreview(fullWorkbook.preview)
    const snapshot = await buildSnapshot()

    expect(secondSession.session.appliedBorrowers).toBeGreaterThan(0)
    expect(secondSession.session.appliedDebts).toBeGreaterThan(0)
    expect(secondSession.affectedBorrowerIds.length).toBeGreaterThan(0)
    expect(snapshot.borrowers.length).toBeGreaterThanOrEqual(4)
  })

  it('prefers structured LibreOffice date values over rendered text for payment chronology', async () => {
    const actual = await parseImportWorkbookFile(buildStructuredDateWorkbookFile({
      fileName: 'date-value-workbook.ods',
      periodCell: { text: 'XX/03/2026' },
      detailDateCell: { text: '02 mars 2026', valueType: 'date', dateValue: '2026-03-02' },
      detailText: 'VIR RECU TEST',
      detailAmountCell: { text: '500', valueType: 'float', value: '500' },
    }))

    expect(actual.preview.summary.entryCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.entries[0]?.periodKey).toBe('2026-03')
    expect(actual.preview.entries[0]?.occurredOn).toBe('2026-03-02')
  })

  it('keeps rendered month text when a detailed row period cell is stored as a structured date', async () => {
    const actual = await parseImportWorkbookFile(buildStructuredDateWorkbookFile({
      fileName: 'period-date-workbook.ods',
      periodCell: { text: 'XX/03/2026', valueType: 'date', dateValue: '2026-03-01' },
      detailText: 'VIR RECU TEST',
      detailAmountCell: { text: '500', valueType: 'float', value: '500' },
    }))

    expect(actual.preview.summary.entryCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.entries[0]?.periodKey).toBe('2026-03')
    expect(actual.preview.entries[0]?.occurredOn).toBeNull()
  })

  it('keeps summary fallback imports when the period cell is stored as a structured date', async () => {
    const actual = await parseImportWorkbookFile(buildStructuredDateWorkbookFile({
      fileName: 'summary-period-date-workbook.ods',
      periodCell: { text: 'XX/03/2026', valueType: 'date', dateValue: '2026-03-01' },
      detailText: 'Paiement résumé',
      summaryPaymentCell: { text: '500', valueType: 'float', value: '500' },
    }))

    expect(actual.preview.summary.entryCount).toBe(1)
    expect(actual.preview.unresolvedEntries).toHaveLength(0)
    expect(actual.preview.entries[0]?.kind).toBe('payment')
    expect(actual.preview.entries[0]?.periodKey).toBe('2026-03')
    expect(actual.preview.entries[0]?.occurredOn).toBeNull()
  })
})
