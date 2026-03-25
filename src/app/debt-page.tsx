import { Link } from 'react-router-dom'
import { useState } from 'react'
import { EntryComposer } from '../components/EntryComposer'
import { MetricCard } from '../components/MetricCard'
import { PendingImportResolutionCard } from '../components/PendingImportResolutionCard'
import { describeEntryKind, formatDate, formatMoney, parseEuroInput } from '../domain/format'
import type { DebtView, EntryKind } from '../domain/types'

interface DebtPageProps {
  debtView: DebtView
  onAddEntry: (debtId: string, input: { kind: EntryKind; amountCents: number; occurredOn: string | null; description: string }) => Promise<void>
  onToggleDebtClosed: (debtId: string, closed: boolean) => Promise<void>
  onUpdateDebt: (debtId: string, input: { label: string; notes: string }) => Promise<void>
  onDeleteDebt: (debtId: string) => Promise<void>
  onUpdateEntry: (entryId: string, input: { amountCents: number; occurredOn: string | null; description: string }) => Promise<void>
  onDeleteEntry: (entryId: string) => Promise<void>
  pendingResolutionDrafts: Record<string, string>
  pendingResolutionErrors: Record<string, string>
  onChangePendingResolution: (unresolvedImportId: string, periodKey: string) => void
  onResolvePendingImport: (unresolvedImportId: string) => Promise<void>
  onDeletePendingImport: (unresolvedImportId: string) => Promise<void>
}

function DebtInfoForm({
  borrowerId,
  debt,
  onUpdateDebt,
}: {
  borrowerId: string
  debt: DebtView['debt']
  onUpdateDebt: DebtPageProps['onUpdateDebt']
}) {
  const [debtLabel, setDebtLabel] = useState(debt.label)
  const [debtNotes, setDebtNotes] = useState(debt.notes)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  async function handleSaveDebt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!debtLabel.trim()) {
      setDetailsError('Ajoutez un libelle de dette.')
      return
    }

    setDetailsError(null)
    await onUpdateDebt(debt.id, {
      label: debtLabel,
      notes: debtNotes,
    })
  }

  return (
    <form className="list-stack" onSubmit={handleSaveDebt}>
      <label>
        Libelle
        <input
          aria-label="Libelle de la dette"
          value={debtLabel}
          onChange={(event) => setDebtLabel(event.target.value)}
        />
      </label>
      <label>
        Notes
        <textarea
          aria-label="Notes de la dette"
          className="notes-area"
          value={debtNotes}
          onChange={(event) => setDebtNotes(event.target.value)}
        />
      </label>
      <div className="button-row">
        <button type="submit">Enregistrer les informations</button>
        <Link className="inline-link" to={`/emprunteurs/${borrowerId}`}>
          Ajouter une autre dette pour cet emprunteur
        </Link>
      </div>
      {detailsError ? <p className="inline-error">{detailsError}</p> : null}
      <p className="section-note">
        Statut actuel: <strong>{debt.status === 'open' ? 'Ouverte' : 'Cloturee'}</strong>
      </p>
    </form>
  )
}

export function DebtPage({
  debtView,
  onAddEntry,
  onToggleDebtClosed,
  onUpdateDebt,
  onDeleteDebt,
  onUpdateEntry,
  onDeleteEntry,
  pendingResolutionDrafts,
  pendingResolutionErrors,
  onChangePendingResolution,
  onResolvePendingImport,
  onDeletePendingImport
}: DebtPageProps) {
  const [composer, setComposer] = useState<'payment' | 'advance' | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState('')
  const [editingOccurredOn, setEditingOccurredOn] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingError, setEditingError] = useState<string | null>(null)

  function startEditingEntry(entry: DebtView['entries'][number]) {
    setEditingEntryId(entry.id)
    setEditingAmount((entry.amountCents / 100).toFixed(2).replace('.', ','))
    setEditingOccurredOn(entry.occurredOn ?? '')
    setEditingDescription(entry.description)
    setEditingError(null)
  }

  function stopEditingEntry() {
    setEditingEntryId(null)
    setEditingAmount('')
    setEditingOccurredOn('')
    setEditingDescription('')
    setEditingError(null)
  }

  async function handleSaveEntry(entryId: string) {
    const amountCents = parseEuroInput(editingAmount)
    if (!amountCents || amountCents <= 0) {
      setEditingError('Entrez un montant valide.')
      return
    }

    setEditingError(null)
    try {
      await onUpdateEntry(entryId, {
        amountCents,
        occurredOn: editingOccurredOn || null,
        description: editingDescription,
      })
      stopEditingEntry()
    } catch (error) {
      setEditingError(error instanceof Error ? error.message : 'Modification impossible.')
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Dette</p>
          <h1>{debtView.debt.label}</h1>
          <p className="lede">
            Emprunteur: <strong>{debtView.borrower.name}</strong>. Gardez une vue claire du solde, des avances et de chaque paiement.
          </p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Reste a encaisser" value={formatMoney(debtView.outstandingCents)} tone="warning" />
          <MetricCard label="Total prete" value={formatMoney(debtView.totalLentCents)} />
          <MetricCard label="Total paye" value={formatMoney(debtView.totalPaidCents)} tone="accent" />
        </div>
      </section>

      {debtView.unresolvedImportCount > 0 ? (
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Import partiel</p>
              <h2>Lignes en attente pour cette dette</h2>
            </div>
            <Link className="inline-link" to="/import">
              Completer depuis Import & sauvegarde
            </Link>
          </div>
          <div className="notice-panel notice-panel-warning notice-panel-compact">
            <strong>{debtView.unresolvedImportCount} ligne(s) attendent encore leur mois pour cette dette.</strong>
            <p className="section-note">
              Solde deja utilisable maintenant: <strong>{formatMoney(debtView.outstandingCents)}</strong>. Montant encore hors
              solde: <strong>{formatMoney(debtView.pendingImportedCents)}</strong>.
            </p>
          </div>
          <details className="details-disclosure">
            <summary>Voir la ligne en attente</summary>
            <div className="list-stack">
              {debtView.pendingImports.map((item) => (
                <PendingImportResolutionCard
                  key={item.id}
                  item={item}
                  periodKey={pendingResolutionDrafts[item.id] ?? ''}
                  error={pendingResolutionErrors[item.id] ?? null}
                  onChangePeriodKey={onChangePendingResolution}
                  onResolve={onResolvePendingImport}
                  onDelete={onDeletePendingImport}
                  showFileName
                />
              ))}
            </div>
          </details>
        </section>
      ) : null}

      <div className="split-grid">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Actions rapides</p>
              <h2>Mettre a jour la dette</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => onToggleDebtClosed(debtView.debt.id, debtView.debt.status === 'open')}>
              {debtView.debt.status === 'open' ? 'Clore la dette' : 'Rouvrir la dette'}
            </button>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => setComposer((current) => (current === 'payment' ? null : 'payment'))}>
              {composer === 'payment' ? 'Masquer le paiement' : 'Enregistrer un paiement'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setComposer((current) => (current === 'advance' ? null : 'advance'))}
            >
              {composer === 'advance' ? 'Masquer l’avance' : 'Ajouter une avance'}
            </button>
          </div>
          {composer === 'payment' ? (
            <EntryComposer
              title="Enregistrer un paiement"
              submitLabel="Valider le paiement"
              kind="payment"
              onSubmit={(input) => onAddEntry(debtView.debt.id, input)}
            />
          ) : null}
          {composer === 'advance' ? (
            <EntryComposer
              title="Ajouter une avance"
              submitLabel="Valider l’avance"
              kind="advance"
              onSubmit={(input) => onAddEntry(debtView.debt.id, input)}
            />
          ) : null}
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fiche dette</p>
              <h2>Informations de la dette</h2>
            </div>
          </div>
          <DebtInfoForm
            key={`${debtView.debt.updatedAt}:${debtView.debt.label}`}
            borrowerId={debtView.borrower.id}
            debt={debtView.debt}
            onUpdateDebt={onUpdateDebt}
          />
        </section>
      </div>

      <div className="split-grid">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Historique</p>
              <h2>Timeline</h2>
            </div>
          </div>
          <div className="table-stack">
            {debtView.entries.length === 0 ? (
              <div className="notice-panel notice-panel-empty notice-panel-compact">
                <strong>Aucune ecriture comptabilisee pour le moment.</strong>
                <p className="section-note">Les lignes valides apparaitront ici des qu’un paiement, une avance ou une ouverture sera enregistree.</p>
              </div>
            ) : (
              <>
                <div className="table-row table-row-data table-row-timeline table-head">
                  <span>Type</span>
                  <span>Detail</span>
                  <span>Date</span>
                  <span>Periode</span>
                  <span>Montant</span>
                  <span>Action</span>
                </div>
                {debtView.entries.map((entry) => (
                  <div className="list-stack" key={entry.id}>
                    <div className="table-row table-row-data table-row-timeline">
                      <span className="table-cell" data-label="Type">{describeEntryKind(entry.kind)}</span>
                      <span className="table-cell" data-label="Detail">{entry.description || 'Aucun detail'}</span>
                      <span className="table-cell" data-label="Date">{formatDate(entry.occurredOn)}</span>
                      <span className="table-cell" data-label="Periode">{entry.periodKey}</span>
                      <span className="table-cell" data-label="Montant">{formatMoney(entry.amountCents)}</span>
                      <span className="table-cell" data-label="Action">
                        <span className="table-action-group">
                          <button
                            type="button"
                            className="ghost-button table-action-button"
                            aria-label={`Modifier la ligne ${describeEntryKind(entry.kind)} de ${formatMoney(entry.amountCents)}`}
                            onClick={() => startEditingEntry(entry)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="ghost-button danger-button table-action-button"
                            aria-label={`Supprimer la ligne ${describeEntryKind(entry.kind)} de ${formatMoney(entry.amountCents)}`}
                            onClick={() => void onDeleteEntry(entry.id)}
                          >
                            Supprimer
                          </button>
                        </span>
                      </span>
                    </div>
                    {editingEntryId === entry.id ? (
                      <div className="table-row">
                        <form
                          className="entry-composer"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void handleSaveEntry(entry.id)
                          }}
                        >
                          <h4>Modifier cette ligne</h4>
                          <label>
                            Montant (€)
                            <input
                              aria-label="Montant (€) de la ligne"
                              inputMode="decimal"
                              value={editingAmount}
                              onChange={(event) => setEditingAmount(event.target.value)}
                            />
                          </label>
                          <label>
                            Date precise
                            <input
                              aria-label="Date precise de la ligne"
                              type="date"
                              value={editingOccurredOn}
                              onChange={(event) => setEditingOccurredOn(event.target.value)}
                            />
                          </label>
                          <label>
                            Detail
                            <input
                              aria-label="Detail de la ligne"
                              value={editingDescription}
                              onChange={(event) => setEditingDescription(event.target.value)}
                            />
                          </label>
                          {editingError ? <p className="inline-error">{editingError}</p> : null}
                          <div className="button-row">
                            <button type="submit">Enregistrer la ligne</button>
                            <button type="button" className="ghost-button" onClick={stopEditingEntry}>
                              Annuler
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Synthese</p>
              <h2>Par annee</h2>
            </div>
          </div>
          <div className="table-stack">
            {debtView.annualSummaries.length === 0 ? (
              <div className="notice-panel notice-panel-empty notice-panel-compact">
                <strong>Aucune synthese annuelle pour l’instant.</strong>
                <p className="section-note">Cette vue se remplira automatiquement des qu’au moins une ligne sure sera comptabilisee.</p>
              </div>
            ) : (
              <>
                <div className="table-row table-row-data table-row-summary table-head">
                  <span>Annee</span>
                  <span>Prete</span>
                  <span>Paye</span>
                  <span>Net</span>
                </div>
                {debtView.annualSummaries.map((summary) => (
                  <div className="table-row table-row-data table-row-summary" key={summary.year}>
                    <span className="table-cell" data-label="Annee">{summary.year}</span>
                    <span className="table-cell" data-label="Prete">{formatMoney(summary.lentCents)}</span>
                    <span className="table-cell" data-label="Paye">{formatMoney(summary.paidCents)}</span>
                    <span className="table-cell" data-label="Net">{formatMoney(summary.netChangeCents)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      <section className="section-card section-card-compact">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Zone dangereuse</p>
            <h2>Supprimer cette dette</h2>
          </div>
        </div>
        <div className="notice-panel notice-panel-warning action-panel">
          <strong>Suppression definitive de cette dette</strong>
          <p className="section-note">
            Les paiements, avances, ajustements et lignes d’import en attente lies a cette dette seront aussi supprimes sur cet appareil.
          </p>
          <button
            type="button"
            className="ghost-button danger-button"
            onClick={() => void onDeleteDebt(debtView.debt.id)}
          >
            Supprimer cette dette
          </button>
        </div>
      </section>
    </div>
  )
}
