import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EntryComposer } from '../components/EntryComposer'
import { MetricCard } from '../components/MetricCard'
import { PageActionsMenu } from '../components/PageActionsMenu'
import { PendingImportResolutionCard } from '../components/PendingImportResolutionCard'
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
  onUpdateBorrower: (borrowerId: string, input: { name: string; notes: string }) => Promise<void>
  pendingResolutionDrafts: Record<string, string>
  pendingResolutionErrors: Record<string, string>
  onChangePendingResolution: (unresolvedImportId: string, periodKey: string) => void
  onResolvePendingImport: (unresolvedImportId: string) => Promise<void>
  onDeletePendingImport: (unresolvedImportId: string) => Promise<void>
  onDeleteDebt: (debtId: string) => Promise<void>
  onDeleteBorrower: (borrowerId: string) => Promise<void>
}

function BorrowerProfileForm({
  borrowerId,
  initialName,
  initialNotes,
  onUpdateBorrower,
  onRequireAttention,
}: {
  borrowerId: string
  initialName: string
  initialNotes: string
  onUpdateBorrower: BorrowerPageProps['onUpdateBorrower']
  onRequireAttention: () => void
}) {
  const [borrowerName, setBorrowerName] = useState(initialName)
  const [borrowerNotes, setBorrowerNotes] = useState(initialNotes)
  const [profileError, setProfileError] = useState<string | null>(null)

  async function handleSaveBorrower(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!borrowerName.trim()) {
      onRequireAttention()
      setProfileError('Ajoutez un nom d’emprunteur.')
      return
    }

    setProfileError(null)
    await onUpdateBorrower(borrowerId, {
      name: borrowerName,
      notes: borrowerNotes,
    })
  }

  return (
    <form className="list-stack" onSubmit={handleSaveBorrower}>
      <label>
        Nom
        <input
          aria-label="Nom emprunteur"
          value={borrowerName}
          onChange={(event) => setBorrowerName(event.target.value)}
        />
      </label>
      <label>
        Notes
        <textarea
          aria-label="Notes emprunteur"
          className="notes-area notes-area-compact"
          value={borrowerNotes}
          onChange={(event) => setBorrowerNotes(event.target.value)}
        />
      </label>
      {profileError ? <p className="inline-error">{profileError}</p> : null}
      <button type="submit">Enregistrer la fiche</button>
    </form>
  )
}

function DebtCard({
  debtView,
  onAddEntry,
  onToggleDebtClosed,
  onDeleteDebt,
}: {
  debtView: DebtView
  onAddEntry: BorrowerPageProps['onAddEntry']
  onToggleDebtClosed: BorrowerPageProps['onToggleDebtClosed']
  onDeleteDebt: BorrowerPageProps['onDeleteDebt']
}) {
  const [composer, setComposer] = useState<'payment' | 'advance' | null>(null)

  return (
    <article className="debt-card">
      <div className="debt-card-header">
        <div>
          <p className="eyebrow">{debtView.debt.status === 'open' ? 'Ouverte' : 'Clôturée'}</p>
          <h3>{debtView.debt.label}</h3>
        </div>
        <div className="debt-card-header-actions">
          <strong>{formatMoney(debtView.outstandingCents)}</strong>
          <PageActionsMenu label={`Ouvrir les actions de la dette ${debtView.debt.label}`}>
            <button
              type="button"
              className="ghost-button danger-button"
              role="menuitem"
              onClick={() => void onDeleteDebt(debtView.debt.id)}
            >
              Supprimer cette dette
            </button>
          </PageActionsMenu>
        </div>
      </div>

      <div className="mini-metrics">
        <MetricCard label="Prêté" value={formatMoney(debtView.totalLentCents)} />
        <MetricCard label="Payé" value={formatMoney(debtView.totalPaidCents)} tone="accent" />
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

      <div className="debt-card-actions">
        <div className="debt-card-primary-actions">
          <button type="button" onClick={() => setComposer(composer === 'payment' ? null : 'payment')}>
            Enregistrer un paiement
          </button>
          <button type="button" className="secondary-button" onClick={() => setComposer(composer === 'advance' ? null : 'advance')}>
            Ajouter une avance
          </button>
        </div>
        <div className="debt-card-secondary-actions">
          <button type="button" className="ghost-button" onClick={() => onToggleDebtClosed(debtView.debt.id, debtView.debt.status === 'open')}>
            {debtView.debt.status === 'open' ? 'Clore la dette' : 'Rouvrir la dette'}
          </button>
          <Link className="inline-link debt-card-link" to={`/dettes/${debtView.debt.id}`}>
            Voir le détail
          </Link>
        </div>
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
  onUpdateBorrower,
  onDeleteDebt,
  pendingResolutionDrafts,
  pendingResolutionErrors,
  onChangePendingResolution,
  onResolvePendingImport,
  onDeletePendingImport,
  onDeleteBorrower,
}: BorrowerPageProps) {
  const [label, setLabel] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [notes, setNotes] = useState('')
  const [createDebtError, setCreateDebtError] = useState<string | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(() => !borrowerView.borrower.name.trim())

  async function handleCreateDebt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim()) {
      setCreateDebtError('Ajoutez un libellé de dette.')
      return
    }

    setCreateDebtError(null)
    await onCreateDebt({
      borrowerId: borrowerView.borrower.id,
      label,
      notes,
      occurredOn: occurredOn || null,
      openingBalanceCents: parseEuroInput(openingBalance),
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
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Emprunteur</p>
              <h1>{borrowerView.borrower.name}</h1>
            </div>
            <PageActionsMenu label="Ouvrir les actions de l’emprunteur">
              <button
                type="button"
                className="ghost-button danger-button"
                role="menuitem"
                onClick={() => void onDeleteBorrower(borrowerView.borrower.id)}
              >
                Supprimer cet emprunteur
              </button>
            </PageActionsMenu>
          </div>
          <p className="lede">Gardez plusieurs dettes pour la même personne sans perdre l’historique des avances ni des paiements.</p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Reste à encaisser" value={formatMoney(borrowerView.outstandingCents)} tone="warning" />
          <MetricCard label="Total prêté" value={formatMoney(borrowerView.totalLentCents)} />
          <MetricCard label="Total payé" value={formatMoney(borrowerView.totalPaidCents)} tone="accent" />
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Fiche emprunteur</p>
            <h2>Informations emprunteur</h2>
          </div>
          <button
            type="button"
            className="ghost-button ghost-button-inline section-toggle-button"
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            {isProfileOpen ? 'Masquer la fiche' : 'Modifier la fiche'}
          </button>
        </div>
        {isProfileOpen ? (
          <BorrowerProfileForm
            key={`${borrowerView.borrower.updatedAt}:${borrowerView.borrower.name}`}
            borrowerId={borrowerView.borrower.id}
            initialName={borrowerView.borrower.name}
            initialNotes={borrowerView.borrower.notes}
            onUpdateBorrower={onUpdateBorrower}
            onRequireAttention={() => setIsProfileOpen(true)}
          />
        ) : (
          <div className="section-summary-row">
            <p className="section-note">
              Nom actuel: <strong>{borrowerView.borrower.name}</strong>.
            </p>
            {borrowerView.borrower.notes ? <p className="section-note">Notes: {borrowerView.borrower.notes}</p> : null}
          </div>
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
              Compléter depuis Import & sauvegarde
            </Link>
          </div>
          <div className="notice-panel notice-panel-warning notice-panel-compact">
            <strong>{borrowerView.unresolvedImportCount} ligne(s) d’import attendent encore leur mois.</strong>
            <p className="section-note">
              Solde déjà utilisable maintenant: <strong>{formatMoney(borrowerView.outstandingCents)}</strong>. Montant encore
              hors total: <strong>{formatMoney(borrowerView.pendingImportedCents)}</strong>.
            </p>
          </div>
          <details className="details-disclosure">
            <summary>Voir le détail des lignes en attente</summary>
            <div className="list-stack">
              {borrowerView.pendingImports.map((item) => (
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

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nouvelle dette</p>
            <h2>Ajouter une dette</h2>
          </div>
        </div>
        <form className="inline-form debt-create-form" onSubmit={handleCreateDebt}>
          <label>
            Libellé
            <input aria-label="Libellé" value={label} onChange={(event) => setLabel(event.target.value)} />
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
            Date précise
            <input aria-label="Date précise dette" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
          </label>
          <label>
            Notes
            <input aria-label="Notes dette" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button type="submit">Créer la dette</button>
        </form>
        {createDebtError ? <p className="inline-error">{createDebtError}</p> : null}
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
            <DebtCard
              key={debtView.debt.id}
              debtView={debtView}
              onAddEntry={onAddEntry}
              onToggleDebtClosed={onToggleDebtClosed}
              onDeleteDebt={onDeleteDebt}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
