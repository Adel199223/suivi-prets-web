import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BorrowerPage } from './app/borrower-page'
import { DashboardPage } from './app/dashboard-page'
import { DebtPage } from './app/debt-page'
import { ImportPage } from './app/import-page'
import { createEmptySnapshot } from './domain/ledger'
import type { AppSnapshot, EntryKind, RecentImportOutcome, WorkbookImportPreviewV1 } from './domain/types'
import { downloadJson, parseBackupFile, serializeBackup, summarizeBackup } from './lib/backup'
import { deriveBackupHealth } from './lib/backupHealth'
import type { ImportIssueResolution } from './domain/types'
import { getBlockingImportIssues } from './lib/importIssues'
import {
  clearSavedImportResolutions,
  loadSavedImportResolutions,
} from './lib/importResolutionMemory'
import { parseImportWorkbookFile } from './lib/importWorkbook'
import {
  addLedgerEntry,
  applyImportPreview,
  buildSnapshot,
  createBorrower,
  createDebt,
  exportBackup,
  recordAutoPersistResult,
  replaceFromBackup,
  resolveUnresolvedImport,
  setDebtClosed,
  updateBorrowerNotes,
  updateDebtNotes
} from './lib/repository'
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
  pendingResolutionDrafts: Parameters<typeof BorrowerPage>[0]['pendingResolutionDrafts']
  pendingResolutionErrors: Parameters<typeof BorrowerPage>[0]['pendingResolutionErrors']
  onChangePendingResolution: Parameters<typeof BorrowerPage>[0]['onChangePendingResolution']
  onResolvePendingImport: Parameters<typeof BorrowerPage>[0]['onResolvePendingImport']
}) {
  const params = useParams()
  const borrowerView = params.borrowerId ? props.snapshot.borrowerMap[params.borrowerId] : undefined
  if (!borrowerView) {
    return <p className="empty-state">Emprunteur introuvable.</p>
  }

  return <BorrowerPage key={borrowerView.borrower.id} borrowerView={borrowerView} {...props} />
}

function DebtRoute(props: {
  snapshot: AppSnapshot
  onAddEntry: Parameters<typeof DebtPage>[0]['onAddEntry']
  onToggleDebtClosed: Parameters<typeof DebtPage>[0]['onToggleDebtClosed']
  onUpdateDebtNotes: Parameters<typeof DebtPage>[0]['onUpdateDebtNotes']
  pendingResolutionDrafts: Parameters<typeof DebtPage>[0]['pendingResolutionDrafts']
  pendingResolutionErrors: Parameters<typeof DebtPage>[0]['pendingResolutionErrors']
  onChangePendingResolution: Parameters<typeof DebtPage>[0]['onChangePendingResolution']
  onResolvePendingImport: Parameters<typeof DebtPage>[0]['onResolvePendingImport']
}) {
  const params = useParams()
  const debtView = params.debtId ? props.snapshot.debtMap[params.debtId] : undefined
  if (!debtView) {
    return <p className="empty-state">Dette introuvable.</p>
  }

  return <DebtPage key={debtView.debt.id} debtView={debtView} {...props} />
}

export default function App() {
  const snapshot = useLiveQuery(() => buildSnapshot(), [], createEmptySnapshot())
  const navigate = useNavigate()
  const [flash, setFlash] = useState<string | null>(null)
  const [importArtifact, setImportArtifact] = useState<WorkbookImportPreviewV1 | null>(null)
  const [importSourceFile, setImportSourceFile] = useState<File | null>(null)
  const [activeImportResolutions, setActiveImportResolutions] = useState<ImportIssueResolution[]>([])
  const [rememberedImportResolutions, setRememberedImportResolutions] = useState<ImportIssueResolution[]>([])
  const [pendingResolutionDrafts, setPendingResolutionDrafts] = useState<Record<string, string>>({})
  const [pendingResolutionErrors, setPendingResolutionErrors] = useState<Record<string, string>>({})
  const [lastImportOutcome, setLastImportOutcome] = useState<RecentImportOutcome | null>(null)
  const [isImportOutcomeCollapsed, setIsImportOutcomeCollapsed] = useState(false)
  const [isImportLoading, setIsImportLoading] = useState(false)
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const autoPersistInFlightRef = useRef(false)
  const autoPersistAttemptedRef = useRef(false)
  const backupHealth = deriveBackupHealth(snapshot, storageStatus)

  useEffect(() => {
    void getStorageStatus().then(setStorageStatus)
  }, [snapshot.lastBackupAt, snapshot.importSessions.length, snapshot.unresolvedImportCount, snapshot.autoPersistAttemptedAt])

  useEffect(() => {
    if (snapshot.autoPersistAttemptedAt) {
      autoPersistAttemptedRef.current = true
    }
  }, [snapshot.autoPersistAttemptedAt])

  function announce(message: string): void {
    setFlash(message)
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 4000)
  }

  async function refreshStorageStatus() {
    const nextStatus = await getStorageStatus()
    setStorageStatus(nextStatus)
    return nextStatus
  }

  function mapPersistResult(result: boolean | null): 'granted' | 'denied' | 'unsupported' {
    if (result === true) {
      return 'granted'
    }

    if (result === false) {
      return 'denied'
    }

    return 'unsupported'
  }

  async function maybeAutoProtectLocalSave() {
    if (
      autoPersistInFlightRef.current ||
      autoPersistAttemptedRef.current ||
      storageStatus?.persisted === true ||
      snapshot.autoPersistResult === 'granted'
    ) {
      return
    }

    autoPersistInFlightRef.current = true
    autoPersistAttemptedRef.current = true

    try {
      const result = await requestPersistentStorage()
      await recordAutoPersistResult(mapPersistResult(result))
      await refreshStorageStatus()
    } finally {
      autoPersistInFlightRef.current = false
    }
  }

  async function handleCreateBorrower(input: { name: string; notes?: string }) {
    const borrower = await createBorrower(input)
    void maybeAutoProtectLocalSave()
    announce('Emprunteur cree.')
    navigate(`/emprunteurs/${borrower.id}`)
  }

  async function handleCreateDebt(input: Parameters<typeof createDebt>[0]) {
    const debt = await createDebt(input)
    void maybeAutoProtectLocalSave()
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
    void maybeAutoProtectLocalSave()
    announce(input.kind === 'payment' ? 'Paiement enregistre.' : 'Avance enregistree.')
  }

  async function handleImportWorkbookSelect(file: File) {
    setIsImportLoading(true)
    try {
      const initialArtifact = await parseImportWorkbookFile(file)
      const savedResolutions = await loadSavedImportResolutions(initialArtifact.preview.fingerprint)
      const artifact =
        savedResolutions.length > 0
          ? await parseImportWorkbookFile(file, { resolutions: savedResolutions })
          : initialArtifact
      const blockingIssues = getBlockingImportIssues(artifact)
      setLastImportOutcome(null)
      setImportSourceFile(file)
      setImportArtifact(artifact)
      setActiveImportResolutions(savedResolutions)
      setRememberedImportResolutions(savedResolutions)
      setPendingResolutionDrafts({})
      setPendingResolutionErrors({})
      setIsImportOutcomeCollapsed(false)
      announce(
        savedResolutions.length > 0
          ? blockingIssues.length > 0
            ? `Classeur analyse. ${savedResolutions.length} correction(s) locale(s) memorisee(s) rechargee(s), mais certaines lignes restent encore bloquantes.`
            : artifact.preview.unresolvedEntries.length > 0
              ? `Classeur analyse. ${savedResolutions.length} correction(s) locale(s) reappliquee(s), et ${artifact.preview.unresolvedEntries.length} ligne(s) peuvent attendre plus tard.`
              : `Classeur analyse. ${savedResolutions.length} correction(s) locale(s) memorisee(s) reappliquee(s) dans cette fenetre.`
          : blockingIssues.length > 0
            ? 'Classeur analyse. Certaines lignes restent trop ambigues pour etre importees.'
            : artifact.preview.unresolvedEntries.length > 0
              ? `Classeur analyse. ${artifact.preview.unresolvedEntries.length} ligne(s) resteront en attente si vous importez maintenant.`
              : 'Classeur analyse. Apercu pret dans cette fenetre.',
      )
    } catch (error) {
      setLastImportOutcome(null)
      setImportSourceFile(null)
      setActiveImportResolutions([])
      setRememberedImportResolutions([])
      setPendingResolutionDrafts({})
      setPendingResolutionErrors({})
      setIsImportOutcomeCollapsed(false)
      setImportArtifact(null)
      announce(error instanceof Error ? error.message : "Impossible de charger l’apercu d’import.")
    } finally {
      setIsImportLoading(false)
    }
  }

  function handlePendingResolutionDraftChange(unresolvedImportId: string, periodKey: string) {
    setPendingResolutionDrafts((current) => ({
      ...current,
      [unresolvedImportId]: periodKey
    }))
    setPendingResolutionErrors((current) => {
      if (!current[unresolvedImportId]) {
        return current
      }

      const next = { ...current }
      delete next[unresolvedImportId]
      return next
    })
  }

  async function handleApplyImport() {
    if (!importArtifact) {
      return
    }
    if (getBlockingImportIssues(importArtifact).length > 0) {
      announce('Import bloque: certaines lignes du classeur doivent encore etre corrigees.')
      return
    }

    const result = await applyImportPreview(importArtifact.preview)
    const session = result.session
    void maybeAutoProtectLocalSave()
    setImportArtifact(null)
    setImportSourceFile(null)
    setActiveImportResolutions([])
    setRememberedImportResolutions([])
    setPendingResolutionDrafts({})
    setPendingResolutionErrors({})
    setLastImportOutcome({
      sessionId: session.id,
      fileName: session.fileName,
      mode: result.mode,
      appliedEntries: session.appliedEntries,
      duplicateEntries: session.duplicateEntries,
      affectedBorrowerIds: result.affectedBorrowerIds,
      affectedDebtIds: result.affectedDebtIds,
    })
    setIsImportOutcomeCollapsed(false)
    setFlash(null)
    navigate('/')
  }

  async function handleResolvePendingImport(unresolvedImportId: string) {
    const periodKey = pendingResolutionDrafts[unresolvedImportId]?.trim()
    if (!periodKey) {
      setPendingResolutionErrors((current) => ({
        ...current,
        [unresolvedImportId]: 'Choisissez un mois au format AAAA-MM avant d’ajouter cette ligne.'
      }))
      return
    }

    try {
      await resolveUnresolvedImport(unresolvedImportId, periodKey)
      setPendingResolutionDrafts((current) => {
        const next = { ...current }
        delete next[unresolvedImportId]
        return next
      })
      setPendingResolutionErrors((current) => {
        const next = { ...current }
        delete next[unresolvedImportId]
        return next
      })
      announce('Ligne en attente resolue et ajoutee a la dette correspondante.')
    } catch (error) {
      if (error instanceof Error && error.message.includes('periode valide')) {
        setPendingResolutionErrors((current) => ({
          ...current,
          [unresolvedImportId]: error.message
        }))
        return
      }

      announce(error instanceof Error ? error.message : 'Impossible de resoudre cette ligne en attente.')
    }
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
        `Restaurer la sauvegarde du ${summary.exportedAt.slice(0, 10)} ?\n\n${summary.borrowerCount} emprunteur(s)\n${summary.debtCount} dette(s)\n${summary.entryCount} ecriture(s)\n${summary.importCount} session(s) d’import\n${summary.unresolvedImportCount} ligne(s) en attente\n\nCette action remplace DEFINITIVEMENT toutes les donnees locales de ce navigateur (pratique pour transferer vers un autre appareil). Confirmez-vous d’utiliser cette sauvegarde comme source de vérité ?`
      )

      if (!confirmed) {
        announce('Restauration annulee.')
        return
      }

      await replaceFromBackup(backup)
      void maybeAutoProtectLocalSave()
      setImportArtifact(null)
      setImportSourceFile(null)
      setActiveImportResolutions([])
      setRememberedImportResolutions([])
      setPendingResolutionDrafts({})
      setPendingResolutionErrors({})
      setLastImportOutcome(null)
      setIsImportOutcomeCollapsed(false)
      announce('Sauvegarde restauree dans ce navigateur.')
      navigate('/')
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Impossible de restaurer cette sauvegarde.')
    }
  }

  async function handleForgetSavedImportResolutions() {
    if (!importArtifact?.preview.fingerprint || !importSourceFile) {
      return
    }

    setIsImportLoading(true)
    try {
      await clearSavedImportResolutions(importArtifact.preview.fingerprint)
      const artifact = await parseImportWorkbookFile(importSourceFile)
      const blockingIssues = getBlockingImportIssues(artifact)
      setLastImportOutcome(null)
      setImportArtifact(artifact)
      setActiveImportResolutions([])
      setRememberedImportResolutions([])
      setPendingResolutionDrafts({})
      setPendingResolutionErrors({})
      setIsImportOutcomeCollapsed(false)
      announce(
        blockingIssues.length > 0
          ? 'Corrections memorisees oubliees pour ce fichier. Certaines lignes redeviennent bloquantes.'
          : artifact.preview.unresolvedEntries.length > 0
            ? 'Corrections memorisees oubliees pour ce fichier. Les lignes auparavant corrigees repassent en attente.'
            : 'Corrections memorisees oubliees pour ce fichier.',
      )
    } catch (error) {
      announce(error instanceof Error ? error.message : "Impossible d’oublier ces corrections memorisees.")
    } finally {
      setIsImportLoading(false)
    }
  }

  async function handleRequestPersistence() {
    const result = await requestPersistentStorage()
    autoPersistAttemptedRef.current = true
    await recordAutoPersistResult(mapPersistResult(result))
    const nextStatus = await refreshStorageStatus()
    announce(
      nextStatus.persisted
        ? 'Protection locale renforcee: le navigateur confirme maintenant le stockage persistant.'
        : result === null
          ? 'Ce navigateur ne confirme pas le stockage persistant. Vos donnees restent enregistrees localement, et vous pourrez creer une copie de secours en plus si vous le souhaitez.'
          : 'Le navigateur n’a pas confirme le stockage persistant. Vos donnees restent enregistrees localement, et vous pourrez creer une copie de secours en plus si vous le souhaitez.'
    )
  }

  return (
    <Shell flash={flash}>
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              snapshot={snapshot}
              backupHealth={backupHealth}
              lastImportOutcome={lastImportOutcome}
              isImportOutcomeCollapsed={isImportOutcomeCollapsed}
              onCollapseImportOutcome={() => setIsImportOutcomeCollapsed(true)}
              onExpandImportOutcome={() => setIsImportOutcomeCollapsed(false)}
              onCreateBorrower={handleCreateBorrower}
            />
          }
        />
        <Route
          path="/emprunteurs/:borrowerId"
          element={
            <BorrowerRoute
              snapshot={snapshot}
              onCreateDebt={handleCreateDebt}
              onAddEntry={handleAddEntry}
              onToggleDebtClosed={(debtId, closed) => setDebtClosed(debtId, closed).then(() => announce(closed ? 'Dette cloturee.' : 'Dette rouverte.'))}
              onUpdateBorrowerNotes={(borrowerId, notes) => updateBorrowerNotes(borrowerId, notes).then(() => announce('Notes emprunteur enregistrees.'))}
              pendingResolutionDrafts={pendingResolutionDrafts}
              pendingResolutionErrors={pendingResolutionErrors}
              onChangePendingResolution={handlePendingResolutionDraftChange}
              onResolvePendingImport={handleResolvePendingImport}
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
              pendingResolutionDrafts={pendingResolutionDrafts}
              pendingResolutionErrors={pendingResolutionErrors}
              onChangePendingResolution={handlePendingResolutionDraftChange}
              onResolvePendingImport={handleResolvePendingImport}
            />
          }
        />
        <Route
          path="/import"
          element={
            <ImportPage
              backupHealth={backupHealth}
              importArtifact={importArtifact}
              activeImportResolutions={activeImportResolutions}
              isImportLoading={isImportLoading}
              importSessions={snapshot.importSessions}
              lastBackupAt={snapshot.lastBackupAt}
              unresolvedImports={snapshot.unresolvedImports}
              pendingResolutionDrafts={pendingResolutionDrafts}
              pendingResolutionErrors={pendingResolutionErrors}
              rememberedImportResolutions={rememberedImportResolutions}
              storageStatus={storageStatus}
              onSelectImportWorkbook={handleImportWorkbookSelect}
              onChangePendingResolution={handlePendingResolutionDraftChange}
              onResolvePendingImport={handleResolvePendingImport}
              onForgetSavedImportResolutions={handleForgetSavedImportResolutions}
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
