import { useEffect, useRef, useState } from 'react'
import { PendingImportResolutionCard } from '../components/PendingImportResolutionCard'
import { formatDate, formatMoney } from '../domain/format'
import type {
  ImportIssueResolution,
  ImportSessionRecord,
  UnresolvedImportRecord,
  WorkbookImportPreviewV1,
} from '../domain/types'
import { getBlockingImportIssues, getInformationalImportIssues } from '../lib/importIssues'
import type { StorageStatus } from '../lib/storagePersistence'

const FIRST_SESSION_SETUP_KEY = 'suivi-prets-web:first-session-setup-seen'

interface ImportPageProps {
  importArtifact: WorkbookImportPreviewV1 | null
  activeImportResolutions: ImportIssueResolution[]
  isImportLoading: boolean
  importSessions: ImportSessionRecord[]
  lastBackupAt: string | null
  unresolvedImports: UnresolvedImportRecord[]
  pendingResolutionDrafts: Record<string, string>
  pendingResolutionErrors: Record<string, string>
  rememberedImportResolutions: ImportIssueResolution[]
  storageStatus: StorageStatus | null
  onSelectImportWorkbook: (file: File) => Promise<void>
  onChangePendingResolution: (unresolvedImportId: string, periodKey: string) => void
  onResolvePendingImport: (unresolvedImportId: string) => Promise<void>
  onDeletePendingImport: (unresolvedImportId: string) => Promise<void>
  onForgetSavedImportResolutions: () => Promise<void>
  onApplyImport: () => Promise<void>
  onExportBackup: () => Promise<void>
  onRestoreBackup: (file: File) => Promise<void>
}

interface PreviewBorrowerRow {
  borrowerSourceKey: string
  borrowerName: string
  debtCount: number
  safeEntryCount: number
  unresolvedCount: number
}

interface PreviewDebtRow {
  sourceKey: string
  borrowerName: string
  label: string
  safeEntryCount: number
  unresolvedCount: number
  outstandingImportedCents: number
}

function buildBorrowerPreviewRows(importPreview: WorkbookImportPreviewV1['preview'] | null): PreviewBorrowerRow[] {
  if (!importPreview) {
    return []
  }

  const rows = new Map<string, PreviewBorrowerRow>()

  for (const debt of importPreview.debts) {
    const current = rows.get(debt.borrowerSourceKey)
    if (current) {
      current.debtCount += 1
      current.safeEntryCount += debt.entries.length
      continue
    }

    rows.set(debt.borrowerSourceKey, {
      borrowerSourceKey: debt.borrowerSourceKey,
      borrowerName: debt.borrowerName,
      debtCount: 1,
      safeEntryCount: debt.entries.length,
      unresolvedCount: 0,
    })
  }

  for (const unresolvedEntry of importPreview.unresolvedEntries) {
    const current = rows.get(unresolvedEntry.borrowerSourceKey)
    if (current) {
      current.unresolvedCount += 1
      continue
    }

    rows.set(unresolvedEntry.borrowerSourceKey, {
      borrowerSourceKey: unresolvedEntry.borrowerSourceKey,
      borrowerName: unresolvedEntry.borrowerName,
      debtCount: 1,
      safeEntryCount: 0,
      unresolvedCount: 1,
    })
  }

  return [...rows.values()]
}

function buildDebtPreviewRows(importPreview: WorkbookImportPreviewV1['preview'] | null): PreviewDebtRow[] {
  if (!importPreview) {
    return []
  }

  const rows = new Map<string, PreviewDebtRow>()

  for (const debt of importPreview.debts) {
    rows.set(debt.sourceKey, {
      sourceKey: debt.sourceKey,
      borrowerName: debt.borrowerName,
      label: debt.label,
      safeEntryCount: debt.entries.length,
      unresolvedCount: 0,
      outstandingImportedCents: debt.entries.reduce(
        (sum, entry) => sum + (entry.kind === 'payment' ? -entry.amountCents : entry.amountCents),
        0
      ),
    })
  }

  for (const unresolvedEntry of importPreview.unresolvedEntries) {
    const current = rows.get(unresolvedEntry.debtSourceKey)
    if (current) {
      current.unresolvedCount += 1
      continue
    }

    rows.set(unresolvedEntry.debtSourceKey, {
      sourceKey: unresolvedEntry.debtSourceKey,
      borrowerName: unresolvedEntry.borrowerName,
      label: unresolvedEntry.debtLabel,
      safeEntryCount: 0,
      unresolvedCount: 1,
      outstandingImportedCents: 0,
    })
  }

  return [...rows.values()]
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7.5h.01" />
    </svg>
  )
}

export function ImportPage({
  importArtifact,
  activeImportResolutions,
  isImportLoading,
  importSessions,
  lastBackupAt,
  unresolvedImports,
  pendingResolutionDrafts,
  pendingResolutionErrors,
  rememberedImportResolutions,
  storageStatus,
  onSelectImportWorkbook,
  onChangePendingResolution,
  onResolvePendingImport,
  onDeletePendingImport,
  onForgetSavedImportResolutions,
  onApplyImport,
  onExportBackup,
  onRestoreBackup,
}: ImportPageProps) {
  const importPreview = importArtifact?.preview ?? null
  const blockingIssues = importPreview ? getBlockingImportIssues(importPreview) : []
  const informationalIssues = importPreview ? getInformationalImportIssues(importPreview) : []
  const borrowerPreviewRows = buildBorrowerPreviewRows(importPreview)
  const debtPreviewRows = buildDebtPreviewRows(importPreview)
  const unresolvedImportedCents = importPreview
    ? importPreview.unresolvedEntries.reduce(
        (sum, entry) => sum + (entry.kind === 'payment' ? -entry.amountCents : entry.amountCents),
        0
      )
    : 0
  const canPartiallyImport = Boolean(importPreview) && blockingIssues.length === 0
  const importLabel =
    importPreview && importPreview.unresolvedEntries.length > 0
      ? 'Importer les lignes sûres maintenant'
      : 'Importer ce classeur'
  const [showFirstSessionSetup, setShowFirstSessionSetup] = useState(() => {
    try {
      return window.localStorage.getItem(FIRST_SESSION_SETUP_KEY) !== '1'
    } catch {
      return true
    }
  })
  const [isImportHelpOpen, setIsImportHelpOpen] = useState(false)
  const importHelpRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isImportHelpOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!importHelpRef.current?.contains(event.target as Node)) {
        setIsImportHelpOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsImportHelpOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isImportHelpOpen])

  function dismissFirstSessionSetup() {
    try {
      window.localStorage.setItem(FIRST_SESSION_SETUP_KEY, '1')
    } catch {
      // best effort
    }
    setShowFirstSessionSetup(false)
  }

  return (
    <div className="page-stack">
      {showFirstSessionSetup ? (
        <section className="section-card section-card-compact">
          <div className="notice-panel notice-panel-empty">
            <strong>Nouvelle session sur ce navigateur</strong>
            <p className="section-note">
              Avant un changement d’appareil, exportez une copie de secours puis utilisez la restauration sur le nouvel appareil pour repasser vos données.
            </p>
            <p className="section-note">
              La restauration est un import de fichier local et remplace la base de données locale actuelle.
            </p>
            <button type="button" className="ghost-button" onClick={dismissFirstSessionSetup}>
              J’ai compris
            </button>
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-heading">
          <div className="import-heading-copy">
            <p className="eyebrow">Classeur .ods</p>
            <div className="import-title-row">
              <h1>Importer un classeur</h1>
              <div className="import-help-anchor" ref={importHelpRef}>
                <button
                  type="button"
                  className="ghost-button icon-button import-help-button"
                  aria-label="Voir l’aide import"
                  aria-expanded={isImportHelpOpen}
                  onClick={() => setIsImportHelpOpen((current) => !current)}
                >
                  <InfoIcon />
                </button>
                {isImportHelpOpen ? (
                  <div className="import-help-popover" role="dialog" aria-label="Aide import">
                    <strong>Aide import</strong>
                    <p className="section-note">Le fichier reste dans ce navigateur.</p>
                    <p className="section-note">
                      Le dépôt public contient seulement le code de l’app, pas vos données.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="compact-status-row compact-status-row-inline">
            <span className="status-chip status-chip-neutral">Local uniquement</span>
            <span className="status-chip status-chip-neutral">
              {lastBackupAt ? `Copie: ${formatDate(lastBackupAt)}` : 'Pas de copie exportée'}
            </span>
          </div>
        </div>
        <label className="file-label">
          Choisir un classeur .ods
          <input
            aria-label="Choisir un classeur .ods"
            type="file"
            accept=".ods,application/vnd.oasis.opendocument.spreadsheet"
            onChange={(event) => {
              const input = event.currentTarget
              const file = input.files?.[0]
              input.value = ''
              if (file) {
                void onSelectImportWorkbook(file)
              }
            }}
          />
        </label>
        {isImportLoading ? <p className="section-note">Analyse du classeur en cours...</p> : null}
        {importPreview ? (
          <div className="preview-panel">
            <h2>Résultat de l’analyse pour {importPreview.fileName}</h2>
            <p className="section-note">Analyse terminée le {formatDate(importArtifact?.generatedAt ?? null)}. Vérifiez l’aperçu avant d’importer.</p>

            <div className="mini-metrics">
              <div className="metric-card">
                <p className="metric-label">Emprunteurs détectés</p>
                <strong className="metric-value">{importPreview.summary.borrowerCount}</strong>
              </div>
              <div className="metric-card">
                <p className="metric-label">Dettes détectées</p>
                <strong className="metric-value">{importPreview.summary.debtCount}</strong>
              </div>
              <div className="metric-card">
                <p className="metric-label">Lignes sûres maintenant</p>
                <strong className="metric-value">{importPreview.summary.entryCount}</strong>
              </div>
              <div className="metric-card">
                <p className="metric-label">Lignes en attente</p>
                <strong className="metric-value">{importPreview.summary.unresolvedCount}</strong>
              </div>
            </div>

            <p className="section-note">
              {importPreview.summary.entryCount} écriture(s) sûre(s), {importPreview.summary.unresolvedCount} ligne(s) en attente
              {blockingIssues.length > 0 ? `, ${blockingIssues.length} ligne(s) encore bloquantes` : ''}
              {informationalIssues.length > 0 ? `, ${informationalIssues.length} feuille(s) ignorée(s).` : '.'}
            </p>

            {importPreview.unresolvedEntries.length > 0 && blockingIssues.length === 0 ? (
              <div className="notice-panel notice-panel-warning action-panel">
                <strong>Import partiel disponible</strong>
                <p className="section-note">Les lignes sûres peuvent être importées maintenant. Les lignes en attente resteront disponibles ici pour être complétées plus tard.</p>
                <p className="section-note">
                  Valeur encore en attente: <strong>{formatMoney(unresolvedImportedCents)}</strong>.
                </p>
              </div>
            ) : null}

            {blockingIssues.length > 0 ? (
              <div className="notice-panel notice-panel-warning action-panel">
                <strong>Des lignes doivent encore être corrigées dans le classeur source</strong>
                <p className="section-note">
                  L’app ne peut pas encore les mettre en attente de manière assez fiable. Tant que ces lignes existent, ce classeur ne peut pas être fusionné.
                </p>
              </div>
            ) : null}

            <div className="preview-grid">
              <section className="preview-block">
                <h3>Emprunteurs repérés</h3>
                <div className="list-stack">
                  {borrowerPreviewRows.map((borrower) => (
                    <article className="preview-row" key={borrower.borrowerSourceKey}>
                      <div>
                        <strong>{borrower.borrowerName}</strong>
                        <p>
                          {borrower.debtCount} dette(s) · {borrower.safeEntryCount} ligne(s) sûre(s)
                          {borrower.unresolvedCount > 0 ? ` · ${borrower.unresolvedCount} en attente` : ''}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="preview-block">
                <h3>Dettes repérées</h3>
                <div className="list-stack">
                  {debtPreviewRows.map((debt) => (
                    <article className="preview-row" key={debt.sourceKey}>
                      <div>
                        <strong>
                          {debt.borrowerName} · {debt.label}
                        </strong>
                        <p>
                          {debt.safeEntryCount} ligne(s) sûre(s)
                          {debt.unresolvedCount > 0 ? ` · ${debt.unresolvedCount} en attente` : ''}
                        </p>
                      </div>
                      <strong>{formatMoney(debt.outstandingImportedCents)}</strong>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            {importPreview.unresolvedEntries.length > 0 ? (
              <section className="preview-block">
                <h3>Lignes qui resteront en attente après l’import</h3>
                <div className="list-stack">
                  {importPreview.unresolvedEntries.map((entry) => (
                    <article className="resolution-row" key={`${entry.sheetName}-${entry.rowNumber}-${entry.signature}`}>
                      <div>
                        <strong>
                          {entry.borrowerName} · {entry.debtLabel}
                        </strong>
                        <p>
                          {entry.sheetName} · ligne {entry.rowNumber} · {formatMoney(entry.amountCents)}
                        </p>
                        <p>{entry.reasonMessage}</p>
                        <p className="section-note">
                          Cette ligne pourra être ajoutée plus tard dès qu’un mois/période sera choisi.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {informationalIssues.length > 0 ? (
              <div className="notice-panel notice-panel-empty">
                <strong>{informationalIssues.length} feuille(s) hors famille dette ignorée(s).</strong>
                <p className="section-note">Le système ne garde que les feuilles `dette_*` pertinentes pour la fusion.</p>
              </div>
            ) : null}

            {activeImportResolutions.length > 0 ? (
              <div className="notice-panel notice-panel-current">
                <strong>
                  {rememberedImportResolutions.length > 0
                    ? `${rememberedImportResolutions.length} correction(s) locale(s) réappliquée(s) pour ce fichier.`
                    : `${activeImportResolutions.length} correction(s) locale(s) déjà prêtes pour cet import.`}
                </strong>
                <p className="section-note">Ces corrections resteront disponibles ici si vous réimportez le même fichier.</p>
                <div className="list-stack">
                  {activeImportResolutions.map((resolution) => (
                    <article className="preview-row" key={`${resolution.sheetName}-${resolution.rowNumber}-active`}>
                      <div>
                        <strong>
                          {resolution.sheetName} · ligne {resolution.rowNumber}
                        </strong>
                        <p>Période locale retenue</p>
                      </div>
                      <strong>{resolution.periodKey}</strong>
                    </article>
                  ))}
                </div>
                {rememberedImportResolutions.length > 0 ? (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isImportLoading}
                    onClick={() => void onForgetSavedImportResolutions()}
                  >
                    Oublier les corrections mémorisées pour ce fichier
                  </button>
                ) : null}
              </div>
            ) : null}

            <button type="button" disabled={!canPartiallyImport || isImportLoading} onClick={() => void onApplyImport()}>
              {importLabel}
            </button>

            {blockingIssues.length > 0 ? (
              <div className="issue-list">
                {blockingIssues.map((issue) => (
                  <article className="issue-row" key={`${issue.sheetName}-${issue.rowNumber}-${issue.code}`}>
                    <strong>
                      {issue.sheetName} · ligne {issue.rowNumber}
                    </strong>
                    <p>{issue.message}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="empty-state">Choisissez un fichier `.ods` pour voir ce qui sera importé dans cette fenêtre avant validation.</p>
        )}
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">File locale</p>
            <h2>Lignes en attente</h2>
          </div>
        </div>
        <div className="list-stack">
          {unresolvedImports.length === 0 ? (
            <p className="empty-state">Aucune ligne en attente pour le moment.</p>
          ) : (
            unresolvedImports.map((item) => (
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
            ))
          )}
        </div>
      </section>

      <section className="section-card section-card-compact">
        <details className="details-disclosure details-disclosure-card">
          <summary>Copie de secours (optionnel) · utile avant de changer d’appareil</summary>
          <div className="preview-panel">
            <p className="section-note">Autosauvegarde déjà active ici. Ouvrez cette zone pour exporter une copie ou restaurer une sauvegarde.</p>
            <p className="section-note">
              {lastBackupAt
                ? `Dernière copie de secours exportée: ${formatDate(lastBackupAt)}.`
                : 'Aucune copie de secours exportée pour l’instant.'}
            </p>
            <div className="button-row">
              <button type="button" onClick={() => void onExportBackup()}>
                Exporter une copie de secours
              </button>
            </div>
            <label className="file-label">
              Restaurer une copie de secours
              <input
                aria-label="Restaurer une copie de secours"
                type="file"
                accept=".json"
                onChange={(event) => {
                  const input = event.currentTarget
                  const file = input.files?.[0]
                  input.value = ''
                  if (file) {
                    void onRestoreBackup(file)
                  }
                }}
              />
            </label>
            <p className="section-note">
              Les options avancées de protection locale et l’effacement total sont maintenant dans Réglages.
            </p>
            <p className="section-note">
              {storageStatus
                ? `Usage estimé: ${storageStatus.usageMb ?? '?'} MB / ${storageStatus.quotaMb ?? '?'} MB.`
                : 'Statut du stockage en cours de lecture...'}
            </p>
          </div>
        </details>
      </section>

      <section className="section-card section-card-compact">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historique</p>
            <h2>Sessions d’import</h2>
          </div>
        </div>
        <div className="list-stack">
          {importSessions.length === 0 ? (
            <p className="empty-state">Aucune session d’import pour le moment.</p>
          ) : (
            importSessions.map((session) => (
              <article className="activity-row" key={session.id}>
                <div>
                  <strong>{session.fileName}</strong>
                  <p>
                    {session.appliedEntries} ajoutée(s), {session.duplicateEntries} doublon(s), {session.queuedUnresolvedCount} en attente, {session.issueCount} issue(s)
                  </p>
                </div>
                <span>{formatDate(session.createdAt)}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
