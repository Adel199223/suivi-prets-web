import type { EntryKind } from './types'

export const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
})

export const shortDate = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

export function formatMoney(cents: number): string {
  return euro.format(cents / 100)
}

export function formatDate(value: string | null): string {
  if (!value) {
    return 'Date non precisee'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : shortDate.format(parsed)
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function toSlug(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function titleFromToken(value: string): string {
  return normalizeWhitespace(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ')
}

export function parseEuroInput(value: string): number | null {
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}

export function centsFromCell(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100)
  }

  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value
    .replace(/\u00a0/g, '')
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.')

  if (!cleaned || cleaned === '/' || cleaned.toLowerCase() === 'nan') {
    return null
  }

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

export function parseImportDate(value: string): string | null {
  const normalized = normalizeWhitespace(value)
  if (!normalized || normalized.includes('XX') || normalized === '/') {
    return null
  }

  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) {
    return null
  }

  const [, dayRaw, monthRaw, yearRaw] = match
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
  const day = dayRaw.padStart(2, '0')
  const month = monthRaw.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function periodKeyFromDate(value: string | null): string | null {
  return value ? value.slice(0, 7) : null
}

export function periodKeyFromLooseText(value: string): string | null {
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

  const month = monthMatch[1].padStart(2, '0')
  const year = fourDigit ? fourDigit[1] : shortYear ? `20${shortYear[1]}` : null
  return year ? `${year}-${month}` : null
}

export function describeEntryKind(kind: EntryKind): string {
  switch (kind) {
    case 'opening_balance':
      return 'Solde initial'
    case 'advance':
      return 'Avance'
    case 'payment':
      return 'Paiement'
    case 'adjustment':
      return 'Ajustement'
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}
