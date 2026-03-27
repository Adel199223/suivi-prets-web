import { describe, expect, it } from 'vitest'
import { createImportEntrySignature } from './importSignature'
import {
  buildResolvedImportDescription,
  canonicalizeResolvedImportDescriptionForSignature,
} from './resolvedImportDescription'

describe('resolved import description helpers', () => {
  it('builds the accented visible fallback label for resolved rows without detail text', () => {
    expect(buildResolvedImportDescription('', '2024-01')).toBe("Import détail [période résolue dans l'app: 2024-01]")
  })

  it('treats accented and legacy resolved-note variants as the same import signature', () => {
    const baseCandidate = {
      borrowerSourceKey: 'adel',
      debtSourceKey: 'adel:dette-1',
      kind: 'payment' as const,
      amountCents: 30000,
      periodKey: '2024-01',
      occurredOn: null,
    }

    expect(
      createImportEntrySignature({
        ...baseCandidate,
        description: "Paiement sans periode [période résolue dans l'app: 2024-01]",
      }),
    ).toBe(
      createImportEntrySignature({
        ...baseCandidate,
        description: "Paiement sans periode [periode resolue dans l'app: 2024-01]",
      }),
    )

    expect(
      createImportEntrySignature({
        ...baseCandidate,
        description: "Import détail [période résolue dans l'app: 2024-01]",
      }),
    ).toBe(
      createImportEntrySignature({
        ...baseCandidate,
        description: "Import detail [periode resolue dans l'app: 2024-01]",
      }),
    )
  })

  it('leaves normal non-resolved descriptions unchanged by the compatibility canonicalizer', () => {
    expect(canonicalizeResolvedImportDescriptionForSignature('Paiement régulier')).toBe('Paiement régulier')
  })
})
