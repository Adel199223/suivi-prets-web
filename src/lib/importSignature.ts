import { normalizeWhitespace } from '../domain/format'
import type { EntryKind } from '../domain/types'
import { canonicalizeResolvedImportDescriptionForSignature } from './resolvedImportDescription'

export function createImportEntrySignature(candidate: {
  borrowerSourceKey: string
  debtSourceKey: string
  kind: EntryKind
  amountCents: number
  periodKey: string
  occurredOn: string | null
  description: string
}): string {
  return [
    candidate.borrowerSourceKey,
    candidate.debtSourceKey,
    candidate.kind,
    candidate.amountCents,
    candidate.periodKey,
    candidate.occurredOn ?? '',
    normalizeWhitespace(canonicalizeResolvedImportDescriptionForSignature(candidate.description)).toLowerCase(),
  ].join('|')
}

export function createUnresolvedImportSignature(candidate: {
  borrowerSourceKey: string
  debtSourceKey: string
  kind: EntryKind
  amountCents: number
  occurredOn: string | null
  description: string
  sourceRef: string
}): string {
  return [
    candidate.borrowerSourceKey,
    candidate.debtSourceKey,
    candidate.kind,
    candidate.amountCents,
    candidate.occurredOn ?? '',
    normalizeWhitespace(candidate.description).toLowerCase(),
    candidate.sourceRef,
  ].join('|')
}
