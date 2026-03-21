import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BorrowerPage } from './app/borrower-page'
import { DashboardPage } from './app/dashboard-page'
import { DebtPage } from './app/debt-page'
import { ImportPage } from './app/import-page'
import { createEmptySnapshot } from './domain/ledger'
import type { AppSnapshot, EntryKind, WorkbookImportPreviewV1 } from './domain/types'
import { downloadJson, parseBackupFile, serializeBackup, summarizeBackup } from './lib/backup'
import { deriveBackupHealth } from './lib/backupHealth'
import { getBlockingImportIssues } from './lib/importIssues'
import { parseImportWorkbookFile } from './lib/importWorkbook'
import { addLedgerEntry, applyImportPreview, buildSnapshot, createBorrower, createDebt, exportBackup, replaceFromBackup, setDebtClosed, updateBorrowerNotes, updateDebtNotes } from './lib/repository'
import { getStorageStatus, requestPersistentStorage, type StorageStatus } from './lib/storagePersistence'

function Shell({ flash, children }: { flash: string | null; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local-first debt tracking</p>
          <strong className="brand-mark">Suivi Prets</strong>
        </div>
        <nav className="nav-tabs" aria-label="Navigation principale">
          <NavLink to="/">Tableau de bord</NavLink>
          <NavLink to="/import">Import & sauvegarde</NavLink>
        </nav>
      </header>
      {flash ? <div role="status" className="flash-banner">{flash}</div> : null}
      <main className="page-frame">{children}</main>
    </div>
  )
}

function BorrowerRoute(props: {
  snapshot: AppSnapshot
  onCreateDebt: Parameters<typeof BorrowerPage>[0]['onCreateDebt']
  onAddEntry: Parameters<typeof BorrowerPage>[0]['onAddEntry']
  onToggleDebtClosed: Parameters<typeof BorrowerPage>[0]['onToggleDebtClosed']
  onUpdateBorrowerNotes: Parameters<typeof BorrowerPage>[0]['onUpdateBorrowerNotes']
}) {
  const params = useParams()
  const borrowerView = params.borrowerId ? props.snapshot.borrowerMap[params.borrowerId] : undefined
  if (!borrowerView) {
    return <p className="empty-state">Emprunteur introuvable.</p>
  }

  return <BorrowerPage borrowerView={borrowerView} {...props} />
}

function DebtRoute(props: {
  snapshot: AppSnapshot
  onAddEntry: Parameters<typeof DebtPage>[0]['onAddEntry']
  onToggleDebtClosed: Parameters<typeof DebtPage>[0]['onToggleDebtClosed']
  onUpdateDebtNotes: Parameters<typeof DebtPage>[0]['onUpdateDebtNotes']
}) {
  const params = useParams()
  const debtView = params.debtId ? props.snapshot.debtMap[params.debtId] : undefined
  if (!debtView) {
    return <p className="empty-state">Dette introuvable.</p>
  }

  return <DebtPage debtView={debtView} {...props} />
}

export default function App() {
  const snapshot = useLiveQuery(() => buildSnapshot(), [], createEmptySnapshot())
  const navigate = useNavigate()
  const [flash, setFlash] = useState<string | null>(null)
  const [importArtifact, setImportArtifact] = useState<WorkbookImportPreviewV1 | null>(null)
  const [isImportLoading, setIsImportLoading] = useState(false)
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const backupHealth = deriveBackupHealth(snapshot)

  useEffect(() => {
    void getStorageStatus().then(setStorageStatus)
  }, [snapshot.lastBackupAt, snapshot.importSessions.length])

  function announce(message: string): void {
    setFlash(message)
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 4000)
  }

  async function handleCreateBorrower(input: { name: string; notes?: string }) {
    const borrower = await createBorrower(input)
    announce('Emprunteur cree.')
    navigate(`/emprunteurs/${borrower.id}`)
  }

  async function handleCreateDebt(input: Parameters<typeof createDebt>[0]) {
    const debt = await createDebt(input)
    announce('Dette creee.')
    navigate(`/dettes/${debt.id}`)
  }

  async function handleAddEntry(
    debtId: string,
    input: { kind: EntryKind; amountCents: number; occurredOn: string | null; description: string }
  ) {
    await addLedgerEntry({
      debtId,
      kind: input.kind,
      amountCents: input.amountCents,
      occurredOn: input.occurredOn,
      description: input.description
    })
    announce(input.kind === 'payment' ? 'Paiement enregistre.' : 'Avance enregistree.')
  }

  async function handleImportWorkbookSelect(file: File) {
    setIsImportLoading(true)
    try {
      const artifact = await parseImportWorkbookFile(file)
      const blockingIssues = getBlockingImportIssues(artifact)
      setImportArtifact(artifact)
      announce(
        blockingIssues.length > 0
          ? 'Classeur analyse. Import bloque tant que les lignes douteuses ne sont pas corrigees.'
          : 'Classeur analyse. Apercu pret dans cette fenetre.',
      )
    } catch (error) {
      setImportArtifact(null)
      announce(error instanceof Error ? error.message : "Impossible de charger l’apercu d’import.")
    } finally {
      setIsImportLoading(false)
    }
  }

  async function handleApplyImport() {
    if (!importArtifact) {
      return
    }
    if (getBlockingImportIssues(importArtifact).length > 0) {
      announce('Import bloque: corrigez le classeur .ods avant de fusionner.')
      return
    }

    const session = await applyImportPreview(importArtifact.preview)
    setImportArtifact(null)
    announce(`Import fusionne dans ce navigateur: ${session.appliedEntries} ecriture(s) ajoutee(s).`)
    navigate('/')
  }

  async function handleExportBackup() {
    const backup = await exportBackup()
    downloadJson(`suivi-prets-backup-${backup.exportedAt.slice(0, 10)}.json`, serializeBackup(backup))
    announce('Sauvegarde exportee.')
  }

  async function handleRestoreBackup(file: File) {
    try {
      const backup = await parseBackupFile(file)
      const summary = summarizeBackup(backup)
      const confirmed = window.confirm(
        `Restaurer la sauvegarde du ${summary.exportedAt.slice(0, 10)} ?\n\n${summary.borrowerCount} emprunteur(s)\n${summary.debtCount} dette(s)\n${summary.entryCount} ecriture(s)\n${summary.importCount} session(s) d’import\n\nCette action remplace toutes les donnees locales actuelles.`
      )

      if (!confirmed) {
        announce('Restauration annulee.')
        return
      }

      await replaceFromBackup(backup)
      setImportArtifact(null)
      announce('Sauvegarde restauree dans ce navigateur.')
      navigate('/')
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Impossible de restaurer cette sauvegarde.')
    }
  }

  async function handleRequestPersistence() {
    const result = await requestPersistentStorage()
    const nextStatus = await getStorageStatus()
    setStorageStatus(nextStatus)
    announce(result ? 'Stockage persistant active.' : 'Le navigateur n’a pas confirme le stockage persistant.')
  }

  return (
    <Shell flash={flash}>
      <Routes>
        <Route path="/" element={<DashboardPage snapshot={snapshot} backupHealth={backupHealth} onCreateBorrower={handleCreateBorrower} />} />
        <Route
          path="/emprunteurs/:borrowerId"
          element={
            <BorrowerRoute
              snapshot={snapshot}
              onCreateDebt={handleCreateDebt}
              onAddEntry={handleAddEntry}
              onToggleDebtClosed={(debtId, closed) => setDebtClosed(debtId, closed).then(() => announce(closed ? 'Dette cloturee.' : 'Dette rouverte.'))}
              onUpdateBorrowerNotes={(borrowerId, notes) => updateBorrowerNotes(borrowerId, notes).then(() => announce('Notes emprunteur enregistrees.'))}
            />
          }
        />
        <Route
          path="/dettes/:debtId"
          element={
            <DebtRoute
              snapshot={snapshot}
              onAddEntry={handleAddEntry}
              onToggleDebtClosed={(debtId, closed) => setDebtClosed(debtId, closed).then(() => announce(closed ? 'Dette cloturee.' : 'Dette rouverte.'))}
              onUpdateDebtNotes={(debtId, notes) => updateDebtNotes(debtId, notes).then(() => announce('Notes de la dette enregistrees.'))}
            />
          }
        />
        <Route
          path="/import"
          element={
            <ImportPage
              backupHealth={backupHealth}
              importArtifact={importArtifact}
              isImportLoading={isImportLoading}
              importSessions={snapshot.importSessions}
              lastBackupAt={snapshot.lastBackupAt}
              storageStatus={storageStatus}
              onSelectImportWorkbook={handleImportWorkbookSelect}
              onApplyImport={handleApplyImport}
              onExportBackup={handleExportBackup}
              onRestoreBackup={handleRestoreBackup}
              onRequestPersistence={handleRequestPersistence}
            />
          }
        />
      </Routes>
    </Shell>
  )
}
