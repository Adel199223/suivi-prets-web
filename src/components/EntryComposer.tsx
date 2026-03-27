import { useState } from 'react'
import { parseEuroInput } from '../domain/format'
import type { EntryKind } from '../domain/types'

interface EntryComposerProps {
  title: string
  submitLabel: string
  kind: EntryKind
  onSubmit: (input: {
    kind: EntryKind
    amountCents: number
    occurredOn: string | null
    description: string
  }) => Promise<void>
}

export function EntryComposer({ title, submitLabel, kind, onSubmit }: EntryComposerProps) {
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountCents = parseEuroInput(amount)
    if (!amountCents || amountCents <= 0) {
      setError('Entrez un montant valide.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        kind,
        amountCents,
        occurredOn: occurredOn || null,
        description
      })
      setAmount('')
      setOccurredOn('')
      setDescription('')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Action impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="entry-composer" onSubmit={handleSubmit}>
      <h4>{title}</h4>
      <label>
        Montant (€)
        <input
          aria-label="Montant (€)"
          inputMode="decimal"
          placeholder="500"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label>
        Date précise
        <input
          aria-label="Date précise"
          type="date"
          value={occurredOn}
          onChange={(event) => setOccurredOn(event.target.value)}
        />
      </label>
      <label>
        Detail
        <input
          aria-label="Detail"
          placeholder="Virement recu"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error ? <p className="inline-error">{error}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? 'Enregistrement...' : submitLabel}
      </button>
    </form>
  )
}
