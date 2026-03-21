import { formatDate, formatMoney } from '../domain/format'
import type { BackupHealth, ImportSessionRecord, WorkbookImportPreviewV1 } from '../domain/types'
import { getBlockingImportIssues, getInformationalImportIssues } from '../lib/importIssues'
import type { StorageStatus } from '../lib/storagePersistence'

interface ImportPageProps {
  backupHealth: BackupHealth
  importArtifact: WorkbookImportPreviewV1 | null
  isImportLoading: boolean
  importSessions: ImportSessionRecord[]
  lastBackupAt: string | null
  storageStatus: StorageStatus | null
  onSelectImportWorkbook: (file: File) => Promise<void>
  onApplyImport: () => Promise<void>
  onExportBackup: () => Promise<void>
  onRestoreBackup: (file: File) => Promise<void>
  onRequestPersistence: () => Promise<void>
}

export function ImportPage({
  backupHealth,
  importArtifact,
  isImportLoading,
  importSessions,
  lastBackupAt,
  storageStatus,
  onSelectImportWorkbook,
  onApplyImport,
  onExportBackup,
  onRestoreBackup,
  onRequestPersistence
}: ImportPageProps) {
  const importPreview = importArtifact?.preview ?? null
  const blockingIssues = importPreview ? getBlockingImportIssues(importPreview) : []
  const informationalIssues = importPreview ? getInformationalImportIssues(importPreview) : []
  const borrowerPreviewRows = importPreview
    ? Array.from(
        importPreview.debts
          .reduce((rows, debt) => {
            const current = rows.get(debt.borrowerSourceKey)
            if (current) {
              current.debtCount += 1
              current.entryCount += debt.entries.length
              return rows
            }

            rows.set(debt.borrowerSourceKey, {
              borrowerSourceKey: debt.borrowerSourceKey,
              borrowerName: debt.borrowerName,
              debtCount: 1,
              entryCount: debt.entries.length
            })
            return rows
          }, new Map<string, { borrowerSourceKey: string; borrowerName: string; debtCount: number; entryCount: number }>())
          .values()
      )
    : []
  const debtPreviewRows = importPreview
    ? importPreview.debts.map((debt) => ({
        sourceKey: debt.sourceKey,
        borrowerName: debt.borrowerName,
        label: debt.label,
        entryCount: debt.entries.length,
        outstandingImportedCents: debt.entries.reduce(
          (sum, entry) => sum + (entry.kind === 'payment' ? -entry.amountCents : entry.amountCents),
          0
        )
      }))
    : []

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Import et sauvegarde</p>
          <h1>Centre de confiance</h1>
          <p className="lede">
            Importez directement un classeur `.ods` dans cette fenetre, verifiez l’apercu local avant validation et gardez le JSON pour la sauvegarde ou la restauration de ce navigateur.
          </p>
        </div>
        <div className="metric-grid">
          <div className="metric-card">
            <p className="metric-label">Derniere sauvegarde</p>
            <strong className="metric-value">{lastBackupAt ? formatDate(lastBackupAt) : 'Aucune'}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">Stockage persistant</p>
            <strong className="metric-value">
              {storageStatus?.persisted === null ? 'Inconnu' : storageStatus?.persisted ? 'Actif' : 'A confirmer'}
            </strong>
          </div>
        </div>
        <div className={`notice-panel notice-panel-${backupHealth.state}`}>
          <strong>{backupHealth.headline}</strong>
          <p className="section-note">{backupHealth.detail}</p>
          <p className="section-note">Cadence conseillee: apres chaque import et a la fin de chaque session de saisie.</p>
        </div>
      </section>

      <div className="split-grid">
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
            Les donnees importees seront visibles dans ce navigateur, sur cet appareil, des que vous validez la fusion.
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
                  <p className="metric-label">Reste importe</p>
                  <strong className="metric-value">{formatMoney(importPreview.summary.outstandingImportedCents)}</strong>
                </div>
              </div>
              <p className="section-note">
                {importPreview.summary.entryCount} ecriture(s), {blockingIssues.length} ligne(s) bloquante(s)
                {informationalIssues.length > 0 ? `, ${informationalIssues.length} feuille(s) ignoree(s).` : '.'}
              </p>
              <div className="preview-grid">
                <section className="preview-block">
                  <h4>Emprunteurs reperes</h4>
                  <div className="list-stack">
                    {borrowerPreviewRows.map((borrower) => (
                      <article className="preview-row" key={borrower.borrowerSourceKey}>
                        <div>
                          <strong>{borrower.borrowerName}</strong>
                          <p>{borrower.debtCount} dette(s) detectee(s)</p>
                        </div>
                        <strong>{borrower.entryCount} ecriture(s)</strong>
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
                          <p>{debt.entryCount} ecriture(s) detectee(s)</p>
                        </div>
                        <strong>{formatMoney(debt.outstandingImportedCents)}</strong>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
              {informationalIssues.length > 0 ? (
                <div className="notice-panel notice-panel-empty">
                  <strong>{informationalIssues.length} feuille(s) hors famille dette ignoree(s).</strong>
                  <p className="section-note">Le systeme ne garde que les feuilles `dette_*` pertinentes pour la fusion.</p>
                </div>
              ) : null}
              {blockingIssues.length > 0 ? (
                <div className="notice-panel notice-panel-warning">
                  <strong>Import bloque tant que le fichier reste ambigu.</strong>
                  <p className="section-note">Corrigez les lignes ci-dessous dans le classeur, puis rechargez le fichier `.ods`.</p>
                </div>
              ) : null}
              <button type="button" disabled={blockingIssues.length > 0} onClick={() => void onApplyImport()}>
                Importer ce classeur
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
              <p className="eyebrow">Sauvegarde JSON</p>
              <h2>Sauvegarder ou restaurer</h2>
            </div>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => void onExportBackup()}>
              Exporter la sauvegarde
            </button>
            <button type="button" className="secondary-button" onClick={() => void onRequestPersistence()}>
              Demander le stockage persistant
            </button>
          </div>
          <label className="file-label">
            Restaurer une sauvegarde JSON
            <input
              aria-label="Restaurer une sauvegarde JSON"
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
          <p className="section-note">Le JSON sert uniquement a sauvegarder ou restaurer les donnees deja presentes dans ce navigateur.</p>
          <p className="section-note">
            {storageStatus
              ? `Usage estime: ${storageStatus.usageMb ?? '?'} MB / ${storageStatus.quotaMb ?? '?'} MB.`
              : 'Statut du stockage en cours de lecture...'}
          </p>
          <p className="section-note">Le stockage persistant aide a limiter les risques locaux, mais il ne remplace jamais une sauvegarde JSON exportee.</p>
        </section>
      </div>

      <section className="section-card">
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
                    {session.appliedEntries} ajoutee(s), {session.duplicateEntries} doublon(s), {session.issueCount} issue(s)
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
