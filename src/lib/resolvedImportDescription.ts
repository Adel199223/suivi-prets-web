import { normalizeWhitespace } from '../domain/format'

const VISIBLE_RESOLVED_IMPORT_FALLBACK = 'Import détail'
const LEGACY_SIGNATURE_RESOLVED_IMPORT_FALLBACK = 'Import detail'
const RESOLVED_IMPORT_SUFFIX_PATTERN =
  /^(.*)\s\[(?:période résolue|periode resolue) dans l'app: (\d{4}-\d{2})\]$/u

function isResolvedImportFallbackPrefix(value: string): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase()
  return (
    normalized === VISIBLE_RESOLVED_IMPORT_FALLBACK.toLowerCase() ||
    normalized === LEGACY_SIGNATURE_RESOLVED_IMPORT_FALLBACK.toLowerCase()
  )
}

export function buildResolvedImportDescription(description: string, periodKey: string): string {
  const normalized = normalizeWhitespace(description)
  return `${normalized || VISIBLE_RESOLVED_IMPORT_FALLBACK} [période résolue dans l'app: ${periodKey}]`
}

export function canonicalizeResolvedImportDescriptionForSignature(description: string): string {
  const match = normalizeWhitespace(description).match(RESOLVED_IMPORT_SUFFIX_PATTERN)
  if (!match) {
    return description
  }

  const prefix = normalizeWhitespace(match[1] ?? '')
  const periodKey = match[2]
  const canonicalPrefix =
    prefix && !isResolvedImportFallbackPrefix(prefix)
      ? prefix
      : LEGACY_SIGNATURE_RESOLVED_IMPORT_FALLBACK

  return `${canonicalPrefix} [periode resolue dans l'app: ${periodKey}]`
}
