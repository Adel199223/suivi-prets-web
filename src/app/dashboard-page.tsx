import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatMoney } from '../domain/format'
import { ledgerKindImpactCents } from '../domain/ledger'
import { PageActionsMenu } from '../components/PageActionsMenu'
import type { AppSnapshot, BackupHealth, BorrowerView, DebtView, RecentImportOutcome } from '../domain/types'
import { MetricCard } from '../components/MetricCard'

interface RecentPaymentRow {
  payment: AppSnapshot['paymentHistory'][number]
  debtView: DebtView
  isSettledDebt: boolean
}

interface DashboardPageProps {
  snapshot: AppSnapshot
  backupHealth: BackupHealth
  lastImportOutcome: RecentImportOutcome | null
  isImportOutcomeCollapsed: boolean
  onCollapseImportOutcome: () => void
  onExpandImportOutcome: () => void
  onCreateBorrower: (input: { name: string; notes?: string }) => Promise<void>
  onDeleteBorrower: (borrowerId: string) => Promise<void>
  onOpenSettings: () => void
}

type HistoryMode = 'all' | 'active' | 'settled'
const DEFAULT_VISIBLE_PAYMENT_COUNT = 2

function isSettledBorrower(borrowerView: BorrowerView): boolean {
  return borrowerView.debts.length > 0 && borrowerView.debts.every((debtView) => debtView.outstandingCents <= 0)
}

export function DashboardPage({
  snapshot,
  backupHealth,
  lastImportOutcome,
  isImportOutcomeCollapsed,
  onCollapseImportOutcome,
  onExpandImportOutcome,
  onCreateBorrower,
  onDeleteBorrower,
  onOpenSettings,
}: DashboardPageProps) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [borrowerHistoryMode, setBorrowerHistoryMode] = useState<HistoryMode>('all')
  const [paymentHistoryMode, setPaymentHistoryMode] = useState<HistoryMode>('all')
  const [isPaymentHistoryExpanded, setIsPaymentHistoryExpanded] = useState(false)
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
  const activeBorrowers = snapshot.borrowers.filter((borrowerView) => !isSettledBorrower(borrowerView))
  const settledBorrowers = snapshot.borrowers.filter(isSettledBorrower)
  const visibleBorrowers =
    borrowerHistoryMode === 'all'
      ? snapshot.borrowers
      : borrowerHistoryMode === 'settled'
        ? settledBorrowers
        : activeBorrowers
  const recentPaymentRows = snapshot.paymentHistory
    .map((payment) => {
      const debtView = snapshot.debtMap[payment.debtId]
      if (!debtView) {
        return null
      }

      return {
        payment,
        debtView,
        isSettledDebt: debtView.outstandingCents <= 0,
      } satisfies RecentPaymentRow
    })
    .filter((value): value is RecentPaymentRow => value !== null)
  const activePaymentRows = recentPaymentRows.filter((row) => !row.isSettledDebt)
  const settledPaymentRows = recentPaymentRows.filter((row) => row.isSettledDebt)
  const visiblePaymentRows =
    paymentHistoryMode === 'all'
      ? recentPaymentRows
      : paymentHistoryMode === 'settled'
        ? settledPaymentRows
        : activePaymentRows
  const hasCollapsedPaymentOverflow = visiblePaymentRows.length > DEFAULT_VISIBLE_PAYMENT_COUNT
  const hiddenPaymentCount = Math.max(0, visiblePaymentRows.length - DEFAULT_VISIBLE_PAYMENT_COUNT)
  const isPaymentHistoryExpandedVisible = hasCollapsedPaymentOverflow && isPaymentHistoryExpanded
  const displayedPaymentRows = isPaymentHistoryExpandedVisible
    ? visiblePaymentRows
    : visiblePaymentRows.slice(0, DEFAULT_VISIBLE_PAYMENT_COUNT)
  const showBackupWarning = backupHealth.state === 'backup_stale'

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
          <h1>Suivi Prêts</h1>
          <p className="lede">
            Suivez plusieurs dettes, ajoutez vite un paiement et gardez l’essentiel du suivi sous la main.
          </p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Total prêté" value={formatMoney(snapshot.totalLentCents)} />
          <MetricCard label="Total encaissé" value={formatMoney(snapshot.totalPaidCents)} tone="accent" />
          <MetricCard label="Reste à encaisser" value={formatMoney(snapshot.outstandingCents)} tone="warning" />
        </div>
      </section>

      {showBackupWarning ? (
        <section className="section-card section-card-compact">
          <div className="notice-panel notice-panel-warning notice-panel-compact">
            <div className="notice-panel-header">
              <strong>{backupHealth.headline}</strong>
              <button type="button" className="ghost-button" onClick={onOpenSettings}>
                Ouvrir les réglages
              </button>
            </div>
            <p className="section-note">{backupHealth.detail}</p>
          </div>
        </section>
      ) : null}

      {lastImportOutcome && !isImportOutcomeCollapsed ? (
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
                    ? 'Import partiel terminé: les données sûres sont déjà visibles.'
                    : 'Import partiel complété: toutes les lignes connues sont maintenant intégrées.'
                  : 'Import terminé: les données sont visibles dans ce navigateur.'}
              </strong>
              <button type="button" className="ghost-button" onClick={onCollapseImportOutcome}>
                Masquer ce résumé
              </button>
            </div>
            <p className="section-note">Fichier source: {lastImportOutcome.fileName}</p>
            <p className="section-note">
              {lastImportOutcome.appliedEntries} ligne(s) ajoutée(s)
              {lastImportOutcome.duplicateEntries > 0
                ? `, ${lastImportOutcome.duplicateEntries} déjà présente(s)`
                : ''}
              {lastImportPendingCount > 0 ? `, ${lastImportPendingCount} encore en attente` : ''}.
            </p>
            {lastImportOutcome.mode === 'partial' ? (
              <p className="section-note">
                Les emprunteurs et dettes importés sont déjà utilisables. Seule la ligne signalée comme en attente reste
                hors des totaux tant que son mois n’est pas complété.
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
                {lastImportPendingCount > 0 ? 'Compléter la file d’attente' : 'Voir Import & sauvegarde'}
              </Link>
            </div>
            {hiddenBorrowerCount > 0 ? (
              <p className="section-note">
                {hiddenBorrowerCount} autre(s) emprunteur(s) importé(s) sont déjà disponibles plus bas dans le tableau de bord.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {lastImportOutcome && isImportOutcomeCollapsed ? (
        <section className="section-card section-card-compact">
          <div
            className={`notice-panel notice-panel-compact ${
              lastImportOutcome.mode === 'partial' && lastImportPendingCount > 0
                ? 'notice-panel-warning'
                : 'notice-panel-current'
            }`}
          >
            <div className="notice-panel-header">
              <strong>Résumé d’import masqué</strong>
              <button type="button" className="ghost-button" onClick={onExpandImportOutcome}>
                Réafficher le résumé
              </button>
            </div>
            <p className="section-note">
              {lastImportOutcome.fileName} · {lastImportOutcome.appliedEntries} ligne(s) ajoutée(s)
              {lastImportPendingCount > 0 ? ` · ${lastImportPendingCount} encore en attente` : ''}.
            </p>
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Opération rapide</p>
            <h2>Ajouter un emprunteur</h2>
          </div>
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
          <button type="submit">Créer l’emprunteur</button>
        </form>
        {error ? <p className="inline-error">{error}</p> : null}
      </section>

      <div className="split-grid">
        <section className="section-card">
          <div className="dashboard-card-header">
            <div>
              <p className="eyebrow">Classement</p>
              <h2>Emprunteurs</h2>
            </div>
          </div>
          {snapshot.borrowers.length > 0 ? (
            <div className="dashboard-filter-shell">
              <div className="compact-status-row dashboard-filter-row">
                <button
                  type="button"
                  className={borrowerHistoryMode === 'all' ? '' : 'ghost-button'}
                  aria-pressed={borrowerHistoryMode === 'all'}
                  onClick={() => setBorrowerHistoryMode('all')}
                >
                  Tous ({snapshot.borrowers.length})
                </button>
                <button
                  type="button"
                  className={borrowerHistoryMode === 'active' ? '' : 'ghost-button'}
                  aria-pressed={borrowerHistoryMode === 'active'}
                  onClick={() => setBorrowerHistoryMode('active')}
                >
                  Emprunteurs actifs ({activeBorrowers.length})
                </button>
                <button
                  type="button"
                  className={borrowerHistoryMode === 'settled' ? '' : 'ghost-button'}
                  aria-pressed={borrowerHistoryMode === 'settled'}
                  onClick={() => setBorrowerHistoryMode('settled')}
                >
                  Emprunteurs soldés ({settledBorrowers.length})
                </button>
              </div>
            </div>
          ) : null}
          <div className="list-stack">
            {snapshot.borrowers.length === 0 ? (
              <p className="empty-state">Aucun emprunteur pour le moment.</p>
            ) : visibleBorrowers.length === 0 ? (
              <p className="empty-state">
                {borrowerHistoryMode === 'settled'
                  ? 'Aucun emprunteur entièrement soldé pour le moment.'
                  : 'Aucun emprunteur actif pour le moment.'}
              </p>
            ) : (
              visibleBorrowers.map((borrowerView) => (
                <article className="borrower-row borrower-row-shell" key={borrowerView.borrower.id}>
                  <Link className="borrower-row-main" to={`/emprunteurs/${borrowerView.borrower.id}`}>
                    <div>
                      <strong>{borrowerView.borrower.name}</strong>
                      <p>
                        {borrowerView.debts.length === 0
                          ? 'Aucune dette pour le moment'
                          : isSettledBorrower(borrowerView)
                            ? 'Toutes les dettes sont soldées'
                            : `${borrowerView.openDebtCount} dette(s) ouverte(s)`}{' '}
                        · {formatMoney(borrowerView.totalPaidCents)} déjà reçu
                      </p>
                    </div>
                    <strong>{formatMoney(borrowerView.outstandingCents)}</strong>
                  </Link>
                  <PageActionsMenu label={`Ouvrir les actions de l’emprunteur ${borrowerView.borrower.name}`}>
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      role="menuitem"
                      onClick={() => void onDeleteBorrower(borrowerView.borrower.id)}
                    >
                      Supprimer cet emprunteur
                    </button>
                  </PageActionsMenu>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="dashboard-card-header">
            <div>
              <p className="eyebrow">Flux récent</p>
              <h2>Derniers paiements</h2>
            </div>
            <div className="dashboard-card-link-wrap">
              <Link className="inline-link dashboard-card-link" to="/import">
                Import & sauvegarde
              </Link>
            </div>
          </div>
          {recentPaymentRows.length > 0 ? (
            <div className="dashboard-filter-shell">
              <div className="compact-status-row dashboard-filter-row">
                <button
                  type="button"
                  className={paymentHistoryMode === 'all' ? '' : 'ghost-button'}
                  aria-pressed={paymentHistoryMode === 'all'}
                  onClick={() => {
                    setPaymentHistoryMode('all')
                    setIsPaymentHistoryExpanded(false)
                  }}
                >
                  Tous ({recentPaymentRows.length})
                </button>
                <button
                  type="button"
                  className={paymentHistoryMode === 'active' ? '' : 'ghost-button'}
                  aria-pressed={paymentHistoryMode === 'active'}
                  onClick={() => {
                    setPaymentHistoryMode('active')
                    setIsPaymentHistoryExpanded(false)
                  }}
                >
                  Dettes encore ouvertes ({activePaymentRows.length})
                </button>
                <button
                  type="button"
                  className={paymentHistoryMode === 'settled' ? '' : 'ghost-button'}
                  aria-pressed={paymentHistoryMode === 'settled'}
                  onClick={() => {
                    setPaymentHistoryMode('settled')
                    setIsPaymentHistoryExpanded(false)
                  }}
                >
                  Dettes soldées ({settledPaymentRows.length})
                </button>
              </div>
            </div>
          ) : null}
          <div className="list-stack">
            {recentPaymentRows.length === 0 ? (
              <p className="empty-state">Aucun paiement enregistré.</p>
            ) : visiblePaymentRows.length === 0 ? (
              <p className="empty-state">
                {paymentHistoryMode === 'settled'
                  ? 'Aucun paiement récent sur une dette entièrement soldée.'
                  : 'Aucun paiement récent sur une dette encore ouverte.'}
              </p>
            ) : (
              displayedPaymentRows.map((row) => (
                <article className="activity-row" key={row.payment.id}>
                  <div>
                    <strong>{formatMoney(row.payment.amountCents)}</strong>
                    <p>
                      {row.debtView.borrower.name} · {row.debtView.debt.label}
                    </p>
                    <p>{row.payment.description || 'Paiement'}</p>
                  </div>
                  <span>{formatDate(row.payment.occurredOn)}</span>
                </article>
              ))
            )}
          </div>
          {hasCollapsedPaymentOverflow ? (
            <div className="dashboard-disclosure-row">
                <button type="button" className="ghost-button" onClick={() => setIsPaymentHistoryExpanded((current) => !current)}>
                  {isPaymentHistoryExpandedVisible ? 'Masquer le reste' : `Voir les autres paiements (${hiddenPaymentCount})`}
                </button>
            </div>
          ) : null}
        </section>
      </div>

      {snapshot.unresolvedImportCount > 0 ? (
        <section className="section-card">
          <div className="notice-panel notice-panel-warning notice-panel-compact">
            <div className="notice-panel-header">
              <strong>{snapshot.unresolvedImportCount} ligne(s) d’import restent en attente.</strong>
              <span className="status-chip status-chip-warning">Encore {formatMoney(snapshot.pendingImportedCents)}</span>
            </div>
            <p className="section-note">
              Les données déjà fiables sont utilisables maintenant. Seul ce montant attend encore son mois avant
              d’entrer dans les totaux.
            </p>
            <div className="link-chip-row">
              <Link className="inline-link" to="/import">
                Compléter la file d’attente
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
