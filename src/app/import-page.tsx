import { formatDate, formatMoney } from '../domain/format'
import type { ImportSessionRecord, WorkbookImportPreviewV1 } from '../domain/types'
import type { StorageStatus } from '../lib/storagePersistence'

interface ImportPageProps {
  importArtifact: WorkbookImportPreviewV1 | null
  importSessions: ImportSessionRecord[]
  lastBackupAt: string | null
  storageStatus: StorageStatus | null
  onSelectImportPreview: (file: File) => Promise<void>
  onApplyImport: () => Promise<void>
  onExportBackup: () => Promise<void>
  onRestoreBackup: (file: File) => Promise<void>
  onRequestPersistence: () => Promise<void>
}

export function ImportPage({
  importArtifact,
  importSessions,
  lastBackupAt,
  storageStatus,
  onSelectImportPreview,
  onApplyImport,
  onExportBackup,
  onRestoreBackup,
  onRequestPersistence
}: ImportPageProps) {
  const importPreview = importArtifact?.preview ?? null

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Import et sauvegarde</p>
          <h1>Centre de confiance</h1>
          <p className="lede">
            Generez un apercu JSON local depuis le classeur `.ods`, verifiez les lignes douteuses avant validation et exportez un JSON propre pour vos sauvegardes.
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
      </section>

      <div className="split-grid">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Apercu JSON</p>
              <h2>Charger un apercu d’import</h2>
            </div>
          </div>
          <label className="file-label">
            Charger un apercu JSON
            <input
              aria-label="Charger un apercu JSON"
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void onSelectImportPreview(file)
                }
              }}
            />
          </label>
          <p className="section-note">
            Generez d’abord l’apercu avec <code>npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu.json</code>.
          </p>
          {importPreview ? (
            <div className="preview-panel">
              <h3>Apercu de {importPreview.fileName}</h3>
              <p className="section-note">Artefact genere le {formatDate(importArtifact?.generatedAt ?? null)}.</p>
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
                {importPreview.summary.entryCount} ecriture(s), {importPreview.issues.length} ligne(s) a revoir.
              </p>
              <button type="button" onClick={() => void onApplyImport()}>
                Fusionner l’import
              </button>
              {importPreview.issues.length > 0 ? (
                <div className="issue-list">
                  {importPreview.issues.map((issue) => (
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
            <p className="empty-state">Choisissez un apercu `.json` genere localement pour voir la fusion avant validation.</p>
          )}
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sauvegarde JSON</p>
              <h2>Exporter ou restaurer</h2>
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
                const file = event.target.files?.[0]
                if (file) {
                  void onRestoreBackup(file)
                }
              }}
            />
          </label>
          <p className="section-note">
            {storageStatus
              ? `Usage estime: ${storageStatus.usageMb ?? '?'} MB / ${storageStatus.quotaMb ?? '?'} MB.`
              : 'Statut du stockage en cours de lecture...'}
          </p>
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
