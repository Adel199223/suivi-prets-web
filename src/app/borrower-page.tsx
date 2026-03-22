import { Link } from 'react-router-dom'
import { useState } from 'react'
import { EntryComposer } from '../components/EntryComposer'
import { MetricCard } from '../components/MetricCard'
import { formatDate, formatMoney, parseEuroInput } from '../domain/format'
import type { BorrowerView, DebtView, EntryKind } from '../domain/types'

interface BorrowerPageProps {
  borrowerView: BorrowerView
  onCreateDebt: (input: {
    borrowerId: string
    label: string
    notes?: string
    openingBalanceCents?: number | null
    occurredOn?: string | null
  }) => Promise<void>
  onAddEntry: (debtId: string, input: { kind: EntryKind; amountCents: number; occurredOn: string | null; description: string }) => Promise<void>
  onToggleDebtClosed: (debtId: string, closed: boolean) => Promise<void>
  onUpdateBorrowerNotes: (borrowerId: string, notes: string) => Promise<void>
}

function DebtCard({
  debtView,
  onAddEntry,
  onToggleDebtClosed
}: {
  debtView: DebtView
  onAddEntry: BorrowerPageProps['onAddEntry']
  onToggleDebtClosed: BorrowerPageProps['onToggleDebtClosed']
}) {
  const [composer, setComposer] = useState<'payment' | 'advance' | null>(null)

  return (
    <article className="debt-card">
      <div className="debt-card-header">
        <div>
          <p className="eyebrow">{debtView.debt.status === 'open' ? 'Ouverte' : 'Cloturee'}</p>
          <h3>{debtView.debt.label}</h3>
        </div>
        <strong>{formatMoney(debtView.outstandingCents)}</strong>
      </div>

      <div className="mini-metrics">
        <MetricCard label="Prete" value={formatMoney(debtView.totalLentCents)} />
        <MetricCard label="Paye" value={formatMoney(debtView.totalPaidCents)} tone="accent" />
        <MetricCard label="Dernier paiement" value={formatDate(debtView.lastPaymentOn)} />
      </div>

      {debtView.unresolvedImportCount > 0 ? (
        <div className="compact-status-row compact-status-row-inline">
          <span className="status-chip status-chip-warning">
            {debtView.unresolvedImportCount} ligne(s) en attente
          </span>
          <p className="section-note">
            {formatMoney(debtView.pendingImportedCents)} restent hors solde tant que le mois manque.
          </p>
        </div>
      ) : null}

      <div className="button-row">
        <button type="button" onClick={() => setComposer(composer === 'payment' ? null : 'payment')}>
          Enregistrer un paiement
        </button>
        <button type="button" className="secondary-button" onClick={() => setComposer(composer === 'advance' ? null : 'advance')}>
          Ajouter une avance
        </button>
        <button type="button" className="ghost-button" onClick={() => onToggleDebtClosed(debtView.debt.id, debtView.debt.status === 'open')}>
          {debtView.debt.status === 'open' ? 'Clore la dette' : 'Rouvrir la dette'}
        </button>
        <Link className="inline-link" to={`/dettes/${debtView.debt.id}`}>
          Voir le detail
        </Link>
      </div>

      {composer === 'payment' ? (
        <EntryComposer
          title="Nouveau paiement"
          submitLabel="Valider le paiement"
          kind="payment"
          onSubmit={(input) => onAddEntry(debtView.debt.id, input)}
        />
      ) : null}
      {composer === 'advance' ? (
        <EntryComposer
          title="Nouvelle avance"
          submitLabel="Valider l’avance"
          kind="advance"
          onSubmit={(input) => onAddEntry(debtView.debt.id, input)}
        />
      ) : null}
    </article>
  )
}

export function BorrowerPage({
  borrowerView,
  onCreateDebt,
  onAddEntry,
  onToggleDebtClosed,
  onUpdateBorrowerNotes
}: BorrowerPageProps) {
  const [label, setLabel] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [notes, setNotes] = useState('')
  const [borrowerNotes, setBorrowerNotes] = useState(borrowerView.borrower.notes)
  const [showBorrowerNotesEditor, setShowBorrowerNotesEditor] = useState(Boolean(borrowerView.borrower.notes.trim()))
  const [error, setError] = useState<string | null>(null)

  async function handleCreateDebt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim()) {
      setError('Ajoutez un libelle de dette.')
      return
    }

    setError(null)
    await onCreateDebt({
      borrowerId: borrowerView.borrower.id,
      label,
      notes,
      occurredOn: occurredOn || null,
      openingBalanceCents: parseEuroInput(openingBalance)
    })
    setLabel('')
    setOpeningBalance('')
    setOccurredOn('')
    setNotes('')
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Emprunteur</p>
          <h1>{borrowerView.borrower.name}</h1>
          <p className="lede">Gardez plusieurs dettes pour la meme personne sans perdre l’historique des avances ni des paiements.</p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Reste a encaisser" value={formatMoney(borrowerView.outstandingCents)} tone="warning" />
          <MetricCard label="Total prete" value={formatMoney(borrowerView.totalLentCents)} />
          <MetricCard label="Total paye" value={formatMoney(borrowerView.totalPaidCents)} tone="accent" />
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fiche emprunteur</p>
            <h2>Notes</h2>
          </div>
          {showBorrowerNotesEditor ? (
            <button type="button" onClick={() => onUpdateBorrowerNotes(borrowerView.borrower.id, borrowerNotes)}>
              Enregistrer les notes
            </button>
          ) : (
            <button type="button" className="ghost-button" onClick={() => setShowBorrowerNotesEditor(true)}>
              Ajouter des notes
            </button>
          )}
        </div>
        {showBorrowerNotesEditor ? (
          <textarea
            aria-label="Notes emprunteur"
            className="notes-area notes-area-compact"
            value={borrowerNotes}
            onChange={(event) => setBorrowerNotes(event.target.value)}
          />
        ) : (
          <p className="empty-state">Aucune note pour le moment.</p>
        )}
      </section>

      {borrowerView.unresolvedImportCount > 0 ? (
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import partiel</p>
              <h2>Lignes en attente pour cet emprunteur</h2>
            </div>
            <Link className="inline-link" to="/import">
              Completer depuis Import & sauvegarde
            </Link>
          </div>
          <div className="notice-panel notice-panel-warning notice-panel-compact">
            <strong>{borrowerView.unresolvedImportCount} ligne(s) d’import attendent encore leur mois.</strong>
            <p className="section-note">
              Solde deja utilisable maintenant: <strong>{formatMoney(borrowerView.outstandingCents)}</strong>. Montant encore
              hors total: <strong>{formatMoney(borrowerView.pendingImportedCents)}</strong>.
            </p>
          </div>
          <details className="details-disclosure">
            <summary>Voir le detail des lignes en attente</summary>
            <div className="list-stack">
              {borrowerView.pendingImports.map((item) => (
                <article className="resolution-row" key={item.id}>
                  <div>
                    <strong>{item.debtLabel}</strong>
                    <p>
                      {formatMoney(item.amountCents)} · {item.sheetName} · ligne {item.rowNumber}
                    </p>
                    <p>{item.reasonMessage}</p>
                  </div>
                </article>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nouvelle dette</p>
            <h2>Ajouter une dette</h2>
          </div>
        </div>
        <form className="inline-form debt-create-form" onSubmit={handleCreateDebt}>
          <label>
            Libelle
            <input aria-label="Libelle" value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label>
            Solde initial (€)
            <input
              aria-label="Solde initial (€)"
              inputMode="decimal"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
            />
          </label>
          <label>
            Date precise
            <input aria-label="Date precise dette" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
          </label>
          <label>
            Notes
            <input aria-label="Notes dette" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button type="submit">Creer la dette</button>
        </form>
        {error ? <p className="inline-error">{error}</p> : null}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dettes</p>
            <h2>Suivi par dette</h2>
          </div>
        </div>
        <div className="list-stack">
          {borrowerView.debts.map((debtView) => (
            <DebtCard key={debtView.debt.id} debtView={debtView} onAddEntry={onAddEntry} onToggleDebtClosed={onToggleDebtClosed} />
          ))}
        </div>
      </section>
    </div>
  )
}
