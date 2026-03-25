import { useState } from 'react'
import { PendingImportResolutionCard } from '../components/PendingImportResolutionCard'
import { formatDate, formatMoney } from '../domain/format'
import type {
  BackupHealth,
  ImportIssueResolution,
  ImportSessionRecord,
  UnresolvedImportRecord,
  WorkbookImportPreviewV1
} from '../domain/types'
import { getBlockingImportIssues, getInformationalImportIssues } from '../lib/importIssues'
import type { StorageStatus } from '../lib/storagePersistence'

const FIRST_SESSION_SETUP_KEY = 'suivi-prets-web:first-session-setup-seen'

interface ImportPageProps {
  backupHealth: BackupHealth
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
  onForgetSavedImportResolutions: () => Promise<void>
  onApplyImport: () => Promise<void>
  onExportBackup: () => Promise<void>
  onRestoreBackup: (file: File) => Promise<void>
  onRequestPersistence: () => Promise<void>
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
      unresolvedCount: 0
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
      unresolvedCount: 1
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
      )
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
      outstandingImportedCents: 0
    })
  }

  return [...rows.values()]
}

export function ImportPage({
  backupHealth,
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
  onForgetSavedImportResolutions,
  onApplyImport,
  onExportBackup,
  onRestoreBackup,
  onRequestPersistence
}: ImportPageProps) {
  const [showProtectionDetails, setShowProtectionDetails] = useState(false)
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
      ? 'Importer les lignes sures maintenant'
      : 'Importer ce classeur'
  const showFullProtectionPanel = backupHealth.state === 'backup_stale'
  const quietProtectionLabel =
    backupHealth.state === 'backup_current'
      ? 'Enregistre ici + copie de secours a jour'
      : backupHealth.state === 'empty'
        ? 'Pret a enregistrer ici'
        : 'Enregistre sur cet appareil'
  const [showFirstSessionSetup, setShowFirstSessionSetup] = useState(() => {
    try {
      return window.localStorage.getItem(FIRST_SESSION_SETUP_KEY) !== '1'
    } catch {
      return true
    }
  })

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
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Import et protection</p>
          <h1>Protection des donnees</h1>
          <p className="lede">
            Importez directement un classeur `.ods` dans cette fenetre. Les donnees validees sont enregistrees localement dans ce navigateur, sur cet appareil; l’app reste locale et ce depot public contient uniquement le code.
          </p>
          <div className={`notice-panel notice-panel-${backupHealth.state}`}>
            <strong>Confidentialite</strong>
            <p className="section-note">
              Les donnees importees depuis vos fichiers restent dans ce navigateur. Elles ne sont ni envoyees vers un serveur, ni visibles dans le repo public.
            </p>
          </div>
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
          <div className="metric-card">
            <p className="metric-label">Derniere copie de secours</p>
            <strong className="metric-value">{lastBackupAt ? formatDate(lastBackupAt) : 'Aucune'}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">Stockage persistant</p>
            <strong className="metric-value">
              {storageStatus?.persisted === null ? 'Inconnu' : storageStatus?.persisted ? 'Actif' : 'A confirmer'}
            </strong>
          </div>
        </div>
      </section>

      {showFirstSessionSetup ? (
        <section className="section-card section-card-compact">
          <div className={`notice-panel notice-panel-${backupHealth.state}`}>
            <strong>Nouvelle session sur ce navigateur</strong>
            <p className="section-note">
              Avant un changement d’appareil, exportez une copie de secours puis utilisez la restauration sur le nouvel appareil pour repasser vos donnees.
            </p>
            <p className="section-note">
              La restauration est un import de fichier local et remplace la base de donnees locale actuelle.
            </p>
            <button type="button" className="ghost-button" onClick={dismissFirstSessionSetup}>
              J’ai compris
            </button>
          </div>
        </section>
      ) : null}

      {!showFullProtectionPanel && showProtectionDetails ? (
        <section className="section-card section-card-compact">
          <div className={`notice-panel notice-panel-${backupHealth.state}`}>
            <strong>{backupHealth.headline}</strong>
            <p className="section-note">{backupHealth.detail}</p>
            <p className="section-note">
              La copie de secours est optionnelle pour un usage normal sur cet appareil. Elle devient surtout utile avant un changement d’appareil, une reinitialisation du navigateur ou apres une grosse session de travail.
            </p>
          </div>
        </section>
      ) : null}

      {showFullProtectionPanel ? (
        <section className="section-card section-card-compact">
          <div className={`notice-panel notice-panel-${backupHealth.state}`}>
            <strong>{backupHealth.headline}</strong>
            <p className="section-note">{backupHealth.detail}</p>
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Classeur .ods</p>
            <h2>Importer un classeur</h2>
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
        <p className="section-note">
          Les donnees importees restent sur cet appareil et dans ce navigateur tant que vous n’effectuez pas une restauration via un backup. Le repo public ne contient pas ces donnees.
        </p>
        {isImportLoading ? <p className="section-note">Analyse du classeur en cours...</p> : null}
        {importPreview ? (
          <div className="preview-panel">
              <h3>Resultat de l’analyse pour {importPreview.fileName}</h3>
              <p className="section-note">
                Analyse terminee le {formatDate(importArtifact?.generatedAt ?? null)}. Verifiez les personnes et les dettes ci-dessous avant d’importer dans ce navigateur.
              </p>

              <div className="mini-metrics">
                <div className="metric-card">
                  <p className="metric-label">Emprunteurs detectes</p>
                  <strong className="metric-value">{importPreview.summary.borrowerCount}</strong>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Dettes detectees</p>
                  <strong className="metric-value">{importPreview.summary.debtCount}</strong>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Lignes sures maintenant</p>
                  <strong className="metric-value">{importPreview.summary.entryCount}</strong>
                </div>
                <div className="metric-card">
                  <p className="metric-label">Lignes en attente</p>
                  <strong className="metric-value">{importPreview.summary.unresolvedCount}</strong>
                </div>
              </div>

              <p className="section-note">
                {importPreview.summary.entryCount} ecriture(s) sure(s), {importPreview.summary.unresolvedCount} ligne(s) en attente
                {blockingIssues.length > 0 ? `, ${blockingIssues.length} ligne(s) encore bloquantes` : ''}
                {informationalIssues.length > 0 ? `, ${informationalIssues.length} feuille(s) ignoree(s).` : '.'}
              </p>

              {importPreview.unresolvedEntries.length > 0 && blockingIssues.length === 0 ? (
                <div className="notice-panel notice-panel-warning action-panel">
                  <strong>Import partiel disponible</strong>
                  <p className="section-note">
                    Les lignes sures peuvent etre importees maintenant. Les lignes en attente resteront dans une file locale que vous pourrez completer plus tard sans rouvrir le classeur.
                  </p>
                  <p className="section-note">
                    Valeur encore en attente: <strong>{formatMoney(unresolvedImportedCents)}</strong>.
                  </p>
                </div>
              ) : null}

              {blockingIssues.length > 0 ? (
                <div className="notice-panel notice-panel-warning action-panel">
                  <strong>Des lignes doivent encore etre corrigees dans le classeur source</strong>
                  <p className="section-note">
                    L’app ne peut pas encore les mettre en attente de maniere assez fiable. Tant que ces lignes existent, ce classeur ne peut pas etre fusionne.
                  </p>
                </div>
              ) : null}

              <div className="preview-grid">
                <section className="preview-block">
                  <h4>Emprunteurs reperes</h4>
                  <div className="list-stack">
                    {borrowerPreviewRows.map((borrower) => (
                      <article className="preview-row" key={borrower.borrowerSourceKey}>
                        <div>
                          <strong>{borrower.borrowerName}</strong>
                          <p>
                            {borrower.debtCount} dette(s) · {borrower.safeEntryCount} ligne(s) sure(s)
                            {borrower.unresolvedCount > 0 ? ` · ${borrower.unresolvedCount} en attente` : ''}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="preview-block">
                  <h4>Dettes reperees</h4>
                  <div className="list-stack">
                    {debtPreviewRows.map((debt) => (
                      <article className="preview-row" key={debt.sourceKey}>
                        <div>
                          <strong>
                            {debt.borrowerName} · {debt.label}
                          </strong>
                          <p>
                            {debt.safeEntryCount} ligne(s) sure(s)
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
                  <h4>Lignes qui resteront en attente apres l’import</h4>
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
                            Cette ligne pourra etre ajoutee plus tard des qu’un mois/periode sera choisi.
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {informationalIssues.length > 0 ? (
                <div className="notice-panel notice-panel-empty">
                  <strong>{informationalIssues.length} feuille(s) hors famille dette ignoree(s).</strong>
                  <p className="section-note">Le systeme ne garde que les feuilles `dette_*` pertinentes pour la fusion.</p>
                </div>
              ) : null}

              {activeImportResolutions.length > 0 ? (
                <div className="notice-panel notice-panel-current">
                  <strong>
                    {rememberedImportResolutions.length > 0
                      ? `${rememberedImportResolutions.length} correction(s) locale(s) memorisee(s) sont reappliquee(s) pour ce fichier exact.`
                      : `${activeImportResolutions.length} correction(s) locale(s) sont deja pretes pour cet import.`}
                  </strong>
                  <p className="section-note">
                    Ces corrections restent limitees a ce navigateur et a ce fingerprint precis. Elles seront rejouees automatiquement quand le meme fichier reviendra plus tard.
                  </p>
                  <div className="list-stack">
                    {activeImportResolutions.map((resolution) => (
                      <article className="preview-row" key={`${resolution.sheetName}-${resolution.rowNumber}-active`}>
                        <div>
                          <strong>
                            {resolution.sheetName} · ligne {resolution.rowNumber}
                          </strong>
                          <p>Periode locale retenue</p>
                        </div>
                        <strong>{resolution.periodKey}</strong>
                      </article>
                    ))}
                  </div>
                  {rememberedImportResolutions.length > 0 ? (
                    <button type="button" className="ghost-button" disabled={isImportLoading} onClick={() => void onForgetSavedImportResolutions()}>
                      Oublier les corrections memorisees pour ce fichier
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
          <p className="empty-state">Choisissez un fichier `.ods` pour voir ce qui sera importe dans cette fenetre avant validation.</p>
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
            <p className="section-note">
              A ouvrir seulement si vous voulez une copie portable avant de changer d’appareil, reinitialiser ce navigateur, ou restaurer des donnees plus tard.
            </p>
            <div className="button-row">
              <button type="button" onClick={() => void onExportBackup()}>
                Exporter une copie de secours
              </button>
              <button type="button" className="secondary-button" onClick={() => void onRequestPersistence()}>
                Renforcer la protection locale
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
              La copie de secours est un fichier JSON portable des donnees deja enregistrees dans ce navigateur. Elle sert surtout si vous voulez restaurer ces donnees plus tard ou les deplacer ailleurs.
            </p>
            <p className="section-note">
              {storageStatus
                ? `Usage estime: ${storageStatus.usageMb ?? '?'} MB / ${storageStatus.quotaMb ?? '?'} MB.`
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
                    {session.appliedEntries} ajoutee(s), {session.duplicateEntries} doublon(s), {session.queuedUnresolvedCount} en attente, {session.issueCount} issue(s)
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
