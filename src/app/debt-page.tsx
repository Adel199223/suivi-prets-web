import { EntryComposer } from '../components/EntryComposer'
import { MetricCard } from '../components/MetricCard'
import { describeEntryKind, formatDate, formatMoney } from '../domain/format'
import type { DebtView, EntryKind } from '../domain/types'

interface DebtPageProps {
  debtView: DebtView
  onAddEntry: (debtId: string, input: { kind: EntryKind; amountCents: number; occurredOn: string | null; description: string }) => Promise<void>
  onToggleDebtClosed: (debtId: string, closed: boolean) => Promise<void>
  onUpdateDebtNotes: (debtId: string, notes: string) => Promise<void>
}

export function DebtPage({ debtView, onAddEntry, onToggleDebtClosed, onUpdateDebtNotes }: DebtPageProps) {
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
          <div className="dual-stack">
            <EntryComposer
              title="Enregistrer un paiement"
              submitLabel="Valider le paiement"
              kind="payment"
              onSubmit={(input) => onAddEntry(debtView.debt.id, input)}
            />
            <EntryComposer
              title="Ajouter une avance"
              submitLabel="Valider l’avance"
              kind="advance"
              onSubmit={(input) => onAddEntry(debtView.debt.id, input)}
            />
          </div>
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
            <div className="table-row table-head">
              <span>Type</span>
              <span>Date</span>
              <span>Periode</span>
              <span>Montant</span>
            </div>
            {debtView.entries.map((entry) => (
              <div className="table-row" key={entry.id}>
                <span>{describeEntryKind(entry.kind)}</span>
                <span>{formatDate(entry.occurredOn)}</span>
                <span>{entry.periodKey}</span>
                <span>{formatMoney(entry.amountCents)}</span>
              </div>
            ))}
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
            <div className="table-row table-head">
              <span>Annee</span>
              <span>Prete</span>
              <span>Paye</span>
              <span>Net</span>
            </div>
            {debtView.annualSummaries.map((summary) => (
              <div className="table-row" key={summary.year}>
                <span>{summary.year}</span>
                <span>{formatMoney(summary.lentCents)}</span>
                <span>{formatMoney(summary.paidCents)}</span>
                <span>{formatMoney(summary.netChangeCents)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
