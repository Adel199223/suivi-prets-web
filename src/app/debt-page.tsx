import { Link } from 'react-router-dom'
import { useState } from 'react'
import { EntryComposer } from '../components/EntryComposer'
import { MetricCard } from '../components/MetricCard'
import { PendingImportResolutionCard } from '../components/PendingImportResolutionCard'
import { describeEntryKind, formatDate, formatMoney } from '../domain/format'
import type { DebtView, EntryKind } from '../domain/types'

interface DebtPageProps {
  debtView: DebtView
  onAddEntry: (debtId: string, input: { kind: EntryKind; amountCents: number; occurredOn: string | null; description: string }) => Promise<void>
  onToggleDebtClosed: (debtId: string, closed: boolean) => Promise<void>
  onUpdateDebtNotes: (debtId: string, notes: string) => Promise<void>
  pendingResolutionDrafts: Record<string, string>
  pendingResolutionErrors: Record<string, string>
  onChangePendingResolution: (unresolvedImportId: string, periodKey: string) => void
  onResolvePendingImport: (unresolvedImportId: string) => Promise<void>
}

export function DebtPage({
  debtView,
  onAddEntry,
  onToggleDebtClosed,
  onUpdateDebtNotes,
  pendingResolutionDrafts,
  pendingResolutionErrors,
  onChangePendingResolution,
  onResolvePendingImport
}: DebtPageProps) {
  const [composer, setComposer] = useState<'payment' | 'advance' | null>(null)

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
              <p className="eyebrow">Notes</p>
              <h2>Memo de cette dette</h2>
            </div>
          </div>
          <textarea
            aria-label="Notes de la dette"
            className="notes-area"
            defaultValue={debtView.debt.notes}
            onBlur={(event) => void onUpdateDebtNotes(debtView.debt.id, event.target.value)}
          />
          <p className="section-note">
            Statut actuel: <strong>{debtView.debt.status === 'open' ? 'Ouverte' : 'Cloturee'}</strong>
          </p>
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
                <div className="table-row table-row-data table-head">
                  <span>Type</span>
                  <span>Date</span>
                  <span>Periode</span>
                  <span>Montant</span>
                </div>
                {debtView.entries.map((entry) => (
                  <div className="table-row table-row-data" key={entry.id}>
                    <span className="table-cell" data-label="Type">{describeEntryKind(entry.kind)}</span>
                    <span className="table-cell" data-label="Date">{formatDate(entry.occurredOn)}</span>
                    <span className="table-cell" data-label="Periode">{entry.periodKey}</span>
                    <span className="table-cell" data-label="Montant">{formatMoney(entry.amountCents)}</span>
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
                <div className="table-row table-row-data table-head">
                  <span>Annee</span>
                  <span>Prete</span>
                  <span>Paye</span>
                  <span>Net</span>
                </div>
                {debtView.annualSummaries.map((summary) => (
                  <div className="table-row table-row-data" key={summary.year}>
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
    </div>
  )
}
