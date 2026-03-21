import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatDate, formatMoney } from '../domain/format'
import type { AppSnapshot } from '../domain/types'
import { MetricCard } from '../components/MetricCard'

interface DashboardPageProps {
  snapshot: AppSnapshot
  onCreateBorrower: (input: { name: string; notes?: string }) => Promise<void>
}

export function DashboardPage({ snapshot, onCreateBorrower }: DashboardPageProps) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Entrez un nom pour l’emprunteur.')
      return
    }

    setError(null)
    await onCreateBorrower({ name, notes })
    setName('')
    setNotes('')
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1>Suivi Prets</h1>
          <p className="lede">
            Suivez plusieurs dettes, ajoutez vite un paiement, fusionnez un import de tableur et gardez une sauvegarde locale propre.
          </p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Total prete" value={formatMoney(snapshot.totalLentCents)} />
          <MetricCard label="Total encaisse" value={formatMoney(snapshot.totalPaidCents)} tone="accent" />
          <MetricCard label="Reste a encaisser" value={formatMoney(snapshot.outstandingCents)} tone="warning" />
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Operation rapide</p>
            <h2>Ajouter un emprunteur</h2>
          </div>
          <p className="section-note">Commencez ici avant d’ajouter une ou plusieurs dettes.</p>
        </div>
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            Nom
            <input aria-label="Nom" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Notes
            <input aria-label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button type="submit">Creer l’emprunteur</button>
        </form>
        {error ? <p className="inline-error">{error}</p> : null}
      </section>

      <div className="split-grid">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Classement</p>
              <h2>Emprunteurs</h2>
            </div>
          </div>
          <div className="list-stack">
            {snapshot.borrowers.length === 0 ? (
              <p className="empty-state">Aucun emprunteur pour le moment.</p>
            ) : (
              snapshot.borrowers.map((borrowerView) => (
                <Link className="borrower-row" key={borrowerView.borrower.id} to={`/emprunteurs/${borrowerView.borrower.id}`}>
                  <div>
                    <strong>{borrowerView.borrower.name}</strong>
                    <p>
                      {borrowerView.openDebtCount} dette(s) ouverte(s) · {formatMoney(borrowerView.totalPaidCents)} deja recu
                    </p>
                  </div>
                  <strong>{formatMoney(borrowerView.outstandingCents)}</strong>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Flux recent</p>
              <h2>Derniers paiements</h2>
            </div>
            <Link className="inline-link" to="/import">
              Import & sauvegarde
            </Link>
          </div>
          <div className="list-stack">
            {snapshot.recentPayments.length === 0 ? (
              <p className="empty-state">Aucun paiement enregistre.</p>
            ) : (
              snapshot.recentPayments.map((payment) => (
                <article className="activity-row" key={payment.id}>
                  <div>
                    <strong>{formatMoney(payment.amountCents)}</strong>
                    <p>{payment.description || 'Paiement'}</p>
                  </div>
                  <span>{formatDate(payment.occurredOn)}</span>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rappel</p>
            <h2>Sauvegarde locale</h2>
          </div>
        </div>
        <p className="section-note">
          {snapshot.lastBackupAt
            ? `Derniere sauvegarde: ${formatDate(snapshot.lastBackupAt)}.`
            : 'Aucune sauvegarde exportee pour l’instant. Pensez a exporter un JSON depuis la page Import & sauvegarde.'}
        </p>
      </section>
    </div>
  )
}
