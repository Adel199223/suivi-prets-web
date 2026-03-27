import { strFromU8, unzipSync } from 'fflate'
import type {
  EntryKind,
  ImportCandidateDebt,
  ImportCandidateEntry,
  ImportIssue,
  ImportIssueResolution,
  ImportPreview,
  ImportUnresolvedCandidate,
  WorkbookImportPreviewV1,
} from '../domain/types'
import { createImportEntrySignature, createUnresolvedImportSignature } from './importSignature'
import { buildResolvedImportDescription } from './resolvedImportDescription'

const NS = {
  office: 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
  table: 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
  text: 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
}

const RELEVANT_PREFIX = /^dette[_\s-]?/i

type SheetRows = Record<string, string[][]>
type ImportResolutionMap = Map<string, ImportIssueResolution>

function buildResolutionKey(sheetName: string, rowNumber: number): string {
  return `${sheetName}:${rowNumber}`
}

function createResolutionMap(resolutions: ImportIssueResolution[] = []): ImportResolutionMap {
  return new Map(
    resolutions.map((resolution) => [buildResolutionKey(resolution.sheetName, resolution.rowNumber), resolution]),
  )
}

function getResolution(
  resolutionMap: ImportResolutionMap,
  sheetName: string,
  rowNumber: number,
): ImportIssueResolution | null {
  return resolutionMap.get(buildResolutionKey(sheetName, rowNumber)) ?? null
}

function withResolutionNote(description: string, resolution: ImportIssueResolution | null): string {
  const normalized = normalizeWhitespace(description)
  if (!resolution) {
    return normalized
  }

  return buildResolvedImportDescription(normalized, resolution.periodKey)
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toSlug(value: string): string {
  const normalized = normalizeWhitespace(value)
  const withoutMarks = normalized.normalize('NFD').replace(/\p{M}+/gu, '')
  return withoutMarks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function titleFromToken(value: string): string {
  return normalizeWhitespace(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.slice(0, 1).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ')
}

function centsFromCell(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100)
  }

  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value
    .replaceAll('\u00a0', '')
    .replaceAll('€', '')
    .replaceAll(' ', '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replaceAll(',', '.')

  if (!cleaned || cleaned === '/' || cleaned.toLowerCase() === 'nan') {
    return null
  }

  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

function parseImportDate(value: string): string | null {
  const normalized = normalizeWhitespace(value)
  if (!normalized || normalized.includes('XX') || normalized === '/') {
    return null
  }

  const direct = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`
  }

  const slash = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!slash) {
    return null
  }

  const [, dayRaw, monthRaw, yearRaw] = slash
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
  return `${year}-${monthRaw.padStart(2, '0')}-${dayRaw.padStart(2, '0')}`
}

function periodKeyFromDate(value: string | null): string | null {
  return value ? value.slice(0, 7) : null
}

function periodKeyFromLooseText(value: string): string | null {
  const normalized = normalizeWhitespace(value)
  if (!normalized || normalized === '/' || /^\d{4}$/.test(normalized)) {
    return null
  }

  const fourDigit = normalized.match(/(\d{4})$/)
  const shortYear = normalized.match(/(\d{2})$/)
  const monthMatch = normalized.match(/\/(\d{1,2})\//) ?? normalized.match(/\/(\d{1,2})$/)
  if (!monthMatch) {
    return null
  }

  const month = monthMatch[1]!.padStart(2, '0')
  const year = fourDigit?.[1] ?? (shortYear ? `20${shortYear[1]}` : null)
  return year ? `${year}-${month}` : null
}

function dedupeBySignature(entries: ImportCandidateEntry[]): ImportCandidateEntry[] {
  const seen = new Set<string>()
  const output: ImportCandidateEntry[] = []

  for (const entry of entries) {
    if (seen.has(entry.signature)) {
      continue
    }

    seen.add(entry.signature)
    output.push(entry)
  }

  return output
}

function dedupeUnresolvedBySignature(entries: ImportUnresolvedCandidate[]): ImportUnresolvedCandidate[] {
  const seen = new Set<string>()
  const output: ImportUnresolvedCandidate[] = []

  for (const entry of entries) {
    if (seen.has(entry.signature)) {
      continue
    }

    seen.add(entry.signature)
    output.push(entry)
  }

  return output
}

function hasDuplicateImportedEntry(
  entries: ImportCandidateEntry[],
  candidate: Pick<ImportCandidateEntry, 'kind' | 'amountCents' | 'periodKey'>
): boolean {
  return entries.some(
    (entry) =>
      entry.kind === candidate.kind &&
      entry.amountCents === candidate.amountCents &&
      entry.periodKey === candidate.periodKey
  )
}

function inferNegativeKind(index: number): EntryKind {
  return index === 0 ? 'opening_balance' : 'advance'
}

function getAttr(element: Element, namespace: string, localName: string, prefixedName: string): string | null {
  return element.getAttributeNS(namespace, localName) ?? element.getAttribute(prefixedName)
}

function getChildElements(node: ParentNode, namespace: string, localName: string): Element[] {
  return Array.from(node.childNodes).filter(
    (child): child is Element =>
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).namespaceURI === namespace &&
      (child as Element).localName === localName,
  )
}

function extractTextContent(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as Element
  if (element.namespaceURI === NS.text && element.localName === 's') {
    const count = Number.parseInt(getAttr(element, NS.text, 'c', 'text:c') ?? '1', 10)
    return ' '.repeat(Number.isFinite(count) ? count : 1)
  }

  return Array.from(element.childNodes).map(extractTextContent).join('')
}

function extractCellValue(cell: Element): string {
  const paragraphs = Array.from(cell.getElementsByTagNameNS(NS.text, 'p'))
    .map((node) => normalizeWhitespace(extractTextContent(node)))
    .filter(Boolean)
  const rendered = paragraphs.join(' ')
  if (rendered) {
    return rendered
  }

  const valueType = getAttr(cell, NS.office, 'value-type', 'office:value-type')
  if (valueType === 'date') {
    const dateValue = getAttr(cell, NS.office, 'date-value', 'office:date-value')
    if (dateValue) {
      return dateValue
    }
  }

  return getAttr(cell, NS.office, 'value', 'office:value') ?? ''
}

function trimRow(row: string[]): string[] {
  const trimmed = [...row]
  while (trimmed.length > 0 && trimmed.at(-1) === '') {
    trimmed.pop()
  }
  return trimmed
}

function loadWorkbookRows(buffer: Uint8Array): SheetRows {
  const archive = unzipSync(buffer)
  const contentXml = archive['content.xml']
  if (!contentXml) {
    throw new Error('Impossible de lire le contenu du classeur .ods.')
  }

  const document = new DOMParser().parseFromString(strFromU8(contentXml), 'application/xml')
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Le classeur .ods contient un XML invalide.')
  }

  const body = document.getElementsByTagNameNS(NS.office, 'body').item(0)
  const spreadsheet = body ? getChildElements(body, NS.office, 'spreadsheet')[0] : null
  if (!spreadsheet) {
    throw new Error('Impossible de trouver office:spreadsheet dans ce classeur ODS.')
  }

  const sheets: SheetRows = {}

  for (const table of getChildElements(spreadsheet, NS.table, 'table')) {
    const sheetName = getAttr(table, NS.table, 'name', 'table:name') ?? 'Feuille'
    const rows: string[][] = []

    for (const rowNode of Array.from(table.getElementsByTagNameNS(NS.table, 'table-row'))) {
      const repeatedRows = Number.parseInt(getAttr(rowNode, NS.table, 'number-rows-repeated', 'table:number-rows-repeated') ?? '1', 10)
      const rowValues: string[] = []

      for (const child of Array.from(rowNode.childNodes)) {
        if (child.nodeType !== Node.ELEMENT_NODE) {
          continue
        }

        const cell = child as Element
        if (cell.namespaceURI !== NS.table || (cell.localName !== 'table-cell' && cell.localName !== 'covered-table-cell')) {
          continue
        }

        const repeatedCells = Number.parseInt(getAttr(cell, NS.table, 'number-columns-repeated', 'table:number-columns-repeated') ?? '1', 10)
        const value = cell.localName === 'covered-table-cell' ? '' : extractCellValue(cell)
        for (let index = 0; index < repeatedCells; index += 1) {
          rowValues.push(value)
        }
      }

      const trimmed = trimRow(rowValues)
      if (trimmed.length === 0) {
        continue
      }

      for (let index = 0; index < repeatedRows; index += 1) {
        rows.push([...trimmed])
      }
    }

    sheets[sheetName] = rows
  }

  return sheets
}

function parseBorrowerAndDebt(sheetName: string): [string, string, string] {
  const stem = sheetName.replace(RELEVANT_PREFIX, '')
  const tokens = stem.split(/[_\s-]+/).filter(Boolean)
  if (tokens.length === 0) {
    return ['import-inconnu', 'import-inconnu:dette-principale', 'Dette principale']
  }

  const borrowerToken = tokens[0]!
  const borrowerSourceKey = toSlug(borrowerToken)
  const tail = tokens.slice(1)

  const debtLabel =
    tail.length === 0
      ? 'Dette principale'
      : /^\d+$/.test(tail.join(' '))
        ? `Dette ${tail.join(' ')}`
        : titleFromToken(tail.join(' '))

  return [borrowerSourceKey, `${borrowerSourceKey}:${toSlug(debtLabel)}`, debtLabel]
}

function guessBorrowerName(sheetName: string, rows: string[][]): string {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const detail = normalizeWhitespace(row[7] ?? '')
    if (!detail) {
      continue
    }

    const match =
      detail.match(/POUR:\s*([^:]+?)(?:REF|MOTIF|CHEZ|CAIXA|PROVENANCE|$)/i) ??
      detail.match(/DE:\s*([^:]+?)(?:REF|DATE|PROVENANCE|$)/i)
    if (!match?.[1]) {
      continue
    }

    const name = titleFromToken(match[1])
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  if (counts.size > 0) {
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]![0]
  }

  const fallback = sheetName.replace(RELEVANT_PREFIX, '').split(/[_-]+/)[0] ?? sheetName
  return titleFromToken(fallback)
}

function isAnnualRow(row: string[]): boolean {
  const period = normalizeWhitespace(row[1] ?? '')
  const detail = normalizeWhitespace(row[7] ?? '').toLowerCase()
  return /^\d{4}$/.test(period) || detail.includes('total annuel')
}

function isSummaryLabelWithoutOperation(leftPeriod: string, detailAmountCents: number | null, detailText: string): boolean {
  const normalized = normalizeWhitespace(leftPeriod).toLowerCase()
  const normalizedDetail = normalizeWhitespace(detailText).toLowerCase()
  const hasOperation =
    ![null, 0].includes(detailAmountCents) ||
    (Boolean(normalizedDetail) &&
      ![
        "detail de l'ecriture",
        "détail de l'écriture",
        "montant de l'operation",
        "montant de l'opération",
      ].includes(normalizedDetail))

  if (hasOperation) {
    return false
  }

  return normalized.startsWith('total ') || normalized.startsWith('reste a payer') || normalized.startsWith('reste à payer')
}

function hasMeaningfulCellText(value: string): boolean {
  const normalized = normalizeWhitespace(value)
  return normalized !== '' && normalized !== '/'
}

function normalizeHeaderCell(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isColumnHeaderRow(input: {
  leftPeriod: string
  rawPayment: string
  rawLent: string
  detailDate: string
  detailText: string
  rawDetailAmount: string
}): boolean {
  const leftLabel = normalizeHeaderCell(input.leftPeriod)
  const paymentLabel = normalizeHeaderCell(input.rawPayment)
  const lentLabel = normalizeHeaderCell(input.rawLent)
  const detailDateLabel = normalizeHeaderCell(input.detailDate)
  const detailTextLabel = normalizeHeaderCell(input.detailText)
  const detailAmountLabel = normalizeHeaderCell(input.rawDetailAmount)

  const hasDetailHeaders =
    detailDateLabel === 'date de l operation' &&
    detailTextLabel === 'detail de l ecriture' &&
    detailAmountLabel === 'montant de l operation'

  if (leftLabel === 'date' && paymentLabel === 'paye' && lentLabel === 'prete') {
    return true
  }

  if (!hasDetailHeaders) {
    return false
  }

  return leftLabel === 'date' || leftLabel.startsWith('total ') || leftLabel.startsWith('reste')
}

function parseSheet(
  sheetName: string,
  rows: string[][],
  resolutionMap: ImportResolutionMap,
): { debt: ImportCandidateDebt | null; issues: ImportIssue[]; unresolvedEntries: ImportUnresolvedCandidate[] } {
  if (!RELEVANT_PREFIX.test(sheetName)) {
    return {
      debt: null,
      issues: [
        {
          sheetName,
          rowNumber: 0,
          code: 'ignored_sheet',
          message: 'Feuille ignoree car elle ne suit pas la famille de workbook attendue.',
        },
      ],
      unresolvedEntries: [],
    }
  }

  const [borrowerSourceKey, debtSourceKey, debtLabel] = parseBorrowerAndDebt(sheetName)
  const borrowerName = guessBorrowerName(sheetName, rows)
  const issues: ImportIssue[] = []
  const entries: ImportCandidateEntry[] = []
  const unresolvedEntries: ImportUnresolvedCandidate[] = []
  let lastResolvedPeriodKey: string | null = null
  let negativeCounter = 0

  rows.forEach((row, index) => {
    if (isAnnualRow(row)) {
      return
    }

    const rowNumber = index + 1
    const leftPeriod = row[1] ?? ''
    const paymentCents = centsFromCell(row[2] ?? '')
    const lentCents = centsFromCell(row[3] ?? '')
    const detailDate = row[6] ?? ''
    const detailText = row[7] ?? ''
    const detailAmountCents = centsFromCell(row[8] ?? '')
    const rawPayment = row[2] ?? ''
    const rawLent = row[3] ?? ''
    const rawDetailAmount = row[8] ?? ''
    const resolution = getResolution(resolutionMap, sheetName, rowNumber)
    const occurredOn = resolution?.occurredOn ?? parseImportDate(detailDate)
    let periodKey =
      periodKeyFromDate(occurredOn) ?? periodKeyFromLooseText(leftPeriod) ?? periodKeyFromLooseText(detailDate)
    const summaryPeriodKey = periodKeyFromLooseText(leftPeriod)

    if (
      ![null, 0].includes(detailAmountCents) &&
      !periodKey &&
      !normalizeWhitespace(leftPeriod) &&
      !normalizeWhitespace(detailDate) &&
      lastResolvedPeriodKey
    ) {
      periodKey = lastResolvedPeriodKey
    }

    if (isSummaryLabelWithoutOperation(leftPeriod, detailAmountCents, detailText)) {
      return
    }

    if (
      isColumnHeaderRow({
        leftPeriod,
        rawPayment,
        rawLent,
        detailDate,
        detailText,
        rawDetailAmount
      })
    ) {
      return
    }

    if (hasMeaningfulCellText(rawDetailAmount) && detailAmountCents === null && (hasMeaningfulCellText(detailText) || hasMeaningfulCellText(detailDate))) {
      issues.push({
        sheetName,
        rowNumber,
        code: 'invalid_amount',
        message: 'Le montant detaille de cette ligne ne peut pas etre lu de maniere fiable.',
      })
      return
    }

    if ([null, 0].includes(detailAmountCents) && hasMeaningfulCellText(rawPayment) && paymentCents === null && summaryPeriodKey) {
      issues.push({
        sheetName,
        rowNumber,
        code: 'invalid_amount',
        message: 'Le montant résumé de paiement de cette ligne ne peut pas être lu de manière fiable.',
      })
      return
    }

    if ([null, 0].includes(detailAmountCents) && hasMeaningfulCellText(rawLent) && lentCents === null && summaryPeriodKey) {
      issues.push({
        sheetName,
        rowNumber,
        code: 'invalid_amount',
        message: 'Le montant résumé d’avance de cette ligne ne peut pas être lu de manière fiable.',
      })
      return
    }

    if (![null, 0].includes(detailAmountCents)) {
      if (!periodKey && resolution) {
        periodKey = resolution.periodKey
      }

      const kind = (detailAmountCents ?? 0) > 0 ? 'payment' : inferNegativeKind(negativeCounter)
      if ((detailAmountCents ?? 0) <= 0) {
        negativeCounter += 1
      }

      const baseDescription = withResolutionNote(detailText, resolution)
      const amountCents = Math.abs(detailAmountCents ?? 0)

      if (!periodKey) {
        unresolvedEntries.push({
          sheetName,
          rowNumber,
          debtSourceKey,
          borrowerSourceKey,
          borrowerName,
          debtLabel,
          kind,
          amountCents,
          occurredOn,
          description: baseDescription,
          sourceRef: `${sheetName}:${rowNumber}`,
          reasonCode: 'missing_period',
          reasonMessage: 'Impossible de déduire la période de cette ligne détaillée.',
          signature: createUnresolvedImportSignature({
            borrowerSourceKey,
            debtSourceKey,
            kind,
            amountCents,
            occurredOn,
            description: baseDescription,
            sourceRef: `${sheetName}:${rowNumber}`,
          }),
        })
      } else {
        entries.push({
          debtSourceKey,
          borrowerSourceKey,
          borrowerName,
          debtLabel,
          kind,
          amountCents,
          periodKey,
          occurredOn,
          description: baseDescription,
          sourceRef: `${sheetName}:${rowNumber}`,
          sheetName,
          rowNumber,
          signature: createImportEntrySignature({
            borrowerSourceKey,
            debtSourceKey,
            kind,
            amountCents,
            periodKey,
            occurredOn,
            description: baseDescription,
          }),
        })
        lastResolvedPeriodKey = periodKey
      }

      return
    }

    let resolvedSummaryPeriodKey = summaryPeriodKey
    if ([null, 0].includes(detailAmountCents) && !resolvedSummaryPeriodKey && resolution) {
      resolvedSummaryPeriodKey = resolution.periodKey
    }

    if ([null, 0].includes(detailAmountCents) && !resolvedSummaryPeriodKey && paymentCents !== null && paymentCents > 0) {
      const description = withResolutionNote(detailText || 'Paiement importe', resolution)
      const sourceRef = `${sheetName}:${rowNumber}:summary-payment`
      unresolvedEntries.push({
        debtSourceKey,
        borrowerSourceKey,
        borrowerName,
        debtLabel,
        kind: 'payment',
        amountCents: paymentCents,
        occurredOn,
        description,
        sourceRef,
        sheetName,
        rowNumber,
        reasonCode: 'missing_period',
        reasonMessage: 'Une valeur de résumé existe sans période exploitable.',
        signature: createUnresolvedImportSignature({
          borrowerSourceKey,
          debtSourceKey,
          kind: 'payment',
          amountCents: paymentCents,
          occurredOn,
          description,
          sourceRef,
        }),
      })
      return
    }

    if ([null, 0].includes(detailAmountCents) && !resolvedSummaryPeriodKey && lentCents !== null && lentCents < 0) {
      const kind = inferNegativeKind(negativeCounter)
      negativeCounter += 1
      const amountCents = Math.abs(lentCents)
      const description = withResolutionNote(detailText || 'Avance importee', resolution)
      const sourceRef = `${sheetName}:${rowNumber}:summary-lent`
      unresolvedEntries.push({
        debtSourceKey,
        borrowerSourceKey,
        borrowerName,
        debtLabel,
        kind,
        amountCents,
        occurredOn,
        description,
        sourceRef,
        sheetName,
        rowNumber,
        reasonCode: 'missing_period',
        reasonMessage: 'Une valeur de résumé existe sans période exploitable.',
        signature: createUnresolvedImportSignature({
          borrowerSourceKey,
          debtSourceKey,
          kind,
          amountCents,
          occurredOn,
          description,
          sourceRef,
        }),
      })
      return
    }

    if ([null, 0].includes(detailAmountCents) && !resolvedSummaryPeriodKey) {
      if (hasMeaningfulCellText(rawPayment) || hasMeaningfulCellText(rawLent)) {
        issues.push({
          sheetName,
          rowNumber,
          code: 'missing_period',
          message: 'Une valeur de résumé existe mais ne peut pas encore être mise en attente de manière fiable.',
        })
      }
      return
    }

    if ([null, 0].includes(detailAmountCents) && resolvedSummaryPeriodKey && paymentCents !== null && paymentCents > 0) {
      const description = withResolutionNote(detailText || 'Paiement importe', resolution)
      const sourceRef = `${sheetName}:${rowNumber}:summary-payment`
      const typed: ImportCandidateEntry = {
        debtSourceKey,
        borrowerSourceKey,
        borrowerName,
        debtLabel,
        kind: 'payment',
        amountCents: paymentCents,
        periodKey: resolvedSummaryPeriodKey,
        occurredOn,
        description,
        sourceRef,
        sheetName,
        rowNumber,
        signature: createImportEntrySignature({
          borrowerSourceKey,
          debtSourceKey,
          kind: 'payment',
          amountCents: paymentCents,
          periodKey: resolvedSummaryPeriodKey,
          occurredOn,
          description,
        }),
      }

      if (!hasDuplicateImportedEntry(entries, typed)) {
        entries.push(typed)
      }
    }

    if ([null, 0].includes(detailAmountCents) && resolvedSummaryPeriodKey && lentCents !== null && lentCents < 0) {
      const kind = inferNegativeKind(negativeCounter)
      negativeCounter += 1
      const amountCents = Math.abs(lentCents)
      const description = withResolutionNote(detailText || 'Avance importee', resolution)
      const sourceRef = `${sheetName}:${rowNumber}:summary-lent`
      const typed: ImportCandidateEntry = {
        debtSourceKey,
        borrowerSourceKey,
        borrowerName,
        debtLabel,
        kind,
        amountCents,
        periodKey: resolvedSummaryPeriodKey,
        occurredOn,
        description,
        sourceRef,
        sheetName,
        rowNumber,
        signature: createImportEntrySignature({
          borrowerSourceKey,
          debtSourceKey,
          kind,
          amountCents,
          periodKey: resolvedSummaryPeriodKey,
          occurredOn,
          description,
        }),
      }

      const duplicate = hasDuplicateImportedEntry(entries, typed)

      if (!duplicate) {
        entries.push(typed)
      }

      lastResolvedPeriodKey = resolvedSummaryPeriodKey
    }
  })

  const dedupedEntries = dedupeBySignature(entries)
  const debt: ImportCandidateDebt = {
    sourceKey: debtSourceKey,
    borrowerSourceKey,
    borrowerName,
    label: debtLabel,
    notes: `Importe depuis ${sheetName}`,
    sheetName,
    entries: dedupedEntries,
  }

  return { debt, issues, unresolvedEntries: dedupeUnresolvedBySignature(unresolvedEntries) }
}

async function fingerprintBytes(bytes: Uint8Array): Promise<string> {
  const digestSource = Uint8Array.from(bytes)
  const digest = await crypto.subtle.digest('SHA-256', digestSource)
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function buildPreview(file: File, resolutions: ImportIssueResolution[] = []): Promise<ImportPreview> {
  const buffer = await file.arrayBuffer()
  const rawBytes = new Uint8Array(buffer)
  const workbook = loadWorkbookRows(rawBytes)
  const resolutionMap = createResolutionMap(resolutions)
  const debts: ImportCandidateDebt[] = []
  const issues: ImportIssue[] = []
  const unresolvedEntries: ImportUnresolvedCandidate[] = []

  Object.entries(workbook).forEach(([sheetName, rows]) => {
    const result = parseSheet(sheetName, rows, resolutionMap)
    if (result.debt) {
      debts.push(result.debt)
    }
    issues.push(...result.issues)
    unresolvedEntries.push(...result.unresolvedEntries)
  })

  const entries = debts.flatMap((debt) => debt.entries)
  const dedupedUnresolvedEntries = dedupeUnresolvedBySignature(unresolvedEntries)
  const borrowerCount = new Set(debts.map((debt) => debt.borrowerSourceKey)).size

  return {
    fileName: file.name,
    fingerprint: await fingerprintBytes(rawBytes),
    debts,
    entries,
    unresolvedEntries: dedupedUnresolvedEntries,
    issues,
    summary: {
      debtCount: debts.length,
      borrowerCount,
      entryCount: entries.length,
      unresolvedCount: dedupedUnresolvedEntries.length,
      paymentCount: entries.filter((entry) => entry.kind === 'payment').length,
      advanceCount: entries.filter((entry) => entry.kind !== 'payment' && entry.kind !== 'adjustment').length,
      outstandingImportedCents: entries.reduce(
        (sum, entry) => sum + (entry.kind === 'payment' ? -entry.amountCents : entry.amountCents),
        0,
      ),
    },
  }
}

export async function parseOdsWorkbookFile(
  file: File,
  options?: { resolutions?: ImportIssueResolution[] },
): Promise<WorkbookImportPreviewV1> {
  const preview = await buildPreview(file, options?.resolutions)

  return {
    version: 'workbook-import-preview-v1',
    generatedAt: new Date().toISOString(),
    preview,
  }
}
