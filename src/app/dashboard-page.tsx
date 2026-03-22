import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatDate, formatMoney } from '../domain/format'
import { ledgerKindImpactCents } from '../domain/ledger'
import type { AppSnapshot, BackupHealth, BorrowerView, RecentImportOutcome } from '../domain/types'
import { MetricCard } from '../components/MetricCard'

interface DashboardPageProps {
  snapshot: AppSnapshot
  backupHealth: BackupHealth
  lastImportOutcome: RecentImportOutcome | null
  onDismissImportOutcome: () => void
  onCreateBorrower: (input: { name: string; notes?: string }) => Promise<void>
}

export function DashboardPage({
  snapshot,
  backupHealth,
  lastImportOutcome,
  onDismissImportOutcome,
  onCreateBorrower
}: DashboardPageProps) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showProtectionDetails, setShowProtectionDetails] = useState(false)
  const lastImportPendingItems = lastImportOutcome
    ? snapshot.unresolvedImports.filter((item) => item.importSessionId === lastImportOutcome.sessionId)
    : []
  const lastImportPendingCount = lastImportPendingItems.length
  const lastImportPendingCents = lastImportPendingItems.reduce(
    (sum, item) => sum + ledgerKindImpactCents(item.kind, item.amountCents),
    0
  )
  const affectedBorrowers = (lastImportOutcome?.affectedBorrowerIds ?? [])
    .map((borrowerId) => snapshot.borrowerMap[borrowerId])
    .filter((value): value is BorrowerView => Boolean(value))
  const highlightedBorrowers = affectedBorrowers.slice(0, 4)
  const hiddenBorrowerCount = Math.max(0, affectedBorrowers.length - highlightedBorrowers.length)
  const showFullProtectionPanel = backupHealth.state === 'backup_stale'
  const quietProtectionLabel =
    backupHealth.state === 'empty'
      ? 'Pret a enregistrer ici'
      : backupHealth.state === 'backup_current'
        ? 'Enregistre ici + copie de secours a jour'
        : 'Enregistre sur cet appareil'

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
          {!showFullProtectionPanel ? (
            <div className="compact-status-row">
              <span className="status-chip status-chip-neutral">{quietProtectionLabel}</span>
              <button
                type="button"
                className="ghost-button ghost-button-inline"
                onClick={() => setShowProtectionDetails((current) => !current)}
              >
                {showProtectionDetails ? 'Moins de details' : 'Details protection'}
              </button>
            </div>
          ) : null}
        </div>
        <div className="metric-grid">
          <MetricCard label="Total prete" value={formatMoney(snapshot.totalLentCents)} />
          <MetricCard label="Total encaisse" value={formatMoney(snapshot.totalPaidCents)} tone="accent" />
          <MetricCard label="Reste a encaisser" value={formatMoney(snapshot.outstandingCents)} tone="warning" />
        </div>
      </section>

      {!showFullProtectionPanel && showProtectionDetails ? (
        <section className="section-card section-card-compact">
          <div className={`notice-panel notice-panel-${backupHealth.state}`}>
            <strong>{backupHealth.headline}</strong>
            <p className="section-note">{backupHealth.detail}</p>
            <p className="section-note">
              {snapshot.lastBackupAt
                ? `Derniere copie de secours exportee: ${formatDate(snapshot.lastBackupAt)}.`
                : 'Aucune copie de secours exportee pour l’instant. Ce n’est pas necessaire pour continuer ici.'}
            </p>
          </div>
        </section>
      ) : null}

      {lastImportOutcome ? (
        <section className="section-card">
          <div
            className={`notice-panel ${
              lastImportOutcome.mode === 'partial' && lastImportPendingCount > 0
                ? 'notice-panel-warning'
                : 'notice-panel-current'
            }`}
          >
            <div className="notice-panel-header">
              <strong>
                {lastImportOutcome.mode === 'partial'
                  ? lastImportPendingCount > 0
                    ? 'Import partiel termine: les donnees sures sont deja visibles.'
                    : 'Import partiel complete: toutes les lignes connues sont maintenant integrees.'
                  : 'Import termine: les donnees sont visibles dans ce navigateur.'}
              </strong>
              <button type="button" className="ghost-button" onClick={onDismissImportOutcome}>
                Masquer ce resume
              </button>
            </div>
            <p className="section-note">Fichier source: {lastImportOutcome.fileName}</p>
            <p className="section-note">
              {lastImportOutcome.appliedEntries} ligne(s) ajoutee(s)
              {lastImportOutcome.duplicateEntries > 0
                ? `, ${lastImportOutcome.duplicateEntries} deja presente(s)`
                : ''}
              {lastImportPendingCount > 0 ? `, ${lastImportPendingCount} encore en attente` : ''}.
            </p>
            {lastImportOutcome.mode === 'partial' ? (
              <p className="section-note">
                Les emprunteurs et dettes importes sont deja utilisables. Seule la ligne signalee comme en attente reste
                hors des totaux tant que son mois n’est pas complete.
              </p>
            ) : null}
            {lastImportPendingCount > 0 ? (
              <p className="section-note">
                Montant encore en attente, non inclus dans les totaux: <strong>{formatMoney(lastImportPendingCents)}</strong>.
              </p>
            ) : null}
            <div className="link-chip-row">
              {highlightedBorrowers.map((borrowerView) => (
                <Link className="inline-link" key={borrowerView.borrower.id} to={`/emprunteurs/${borrowerView.borrower.id}`}>
                  Ouvrir {borrowerView.borrower.name}
                </Link>
              ))}
              <Link className="inline-link" to="/import">
                {lastImportPendingCount > 0 ? 'Completer la file d’attente' : 'Voir Import & sauvegarde'}
              </Link>
            </div>
            {hiddenBorrowerCount > 0 ? (
              <p className="section-note">
                {hiddenBorrowerCount} autre(s) emprunteur(s) importes sont deja disponibles plus bas dans le tableau de bord.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

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

      {showFullProtectionPanel ? (
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Protection</p>
              <h2>Protection des donnees</h2>
            </div>
          </div>
          <div className={`notice-panel notice-panel-${backupHealth.state}`}>
            <strong>{backupHealth.headline}</strong>
            <p className="section-note">{backupHealth.detail}</p>
            <p className="section-note">
              {snapshot.lastBackupAt
                ? `Derniere copie de secours exportee: ${formatDate(snapshot.lastBackupAt)}.`
                : 'Aucune copie de secours exportee pour l’instant.'}
            </p>
            <Link className="inline-link" to="/import">
              Ouvrir Import & sauvegarde
            </Link>
          </div>
        </section>
      ) : null}

      {snapshot.unresolvedImportCount > 0 ? (
        <section className="section-card">
          <div className="notice-panel notice-panel-warning notice-panel-compact">
            <div className="notice-panel-header">
              <strong>{snapshot.unresolvedImportCount} ligne(s) d’import restent en attente.</strong>
              <span className="status-chip status-chip-warning">Encore {formatMoney(snapshot.pendingImportedCents)}</span>
            </div>
            <p className="section-note">
              Les donnees deja fiables sont utilisables maintenant. Seul ce montant attend encore son mois avant
              d’entrer dans les totaux.
            </p>
            <div className="link-chip-row">
              <Link className="inline-link" to="/import">
                Completer la file d’attente
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
