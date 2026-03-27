import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BackupHealth } from '../domain/types'
import { useModalDialog } from '../hooks/useModalDialog'
import type { StorageStatus } from '../lib/storagePersistence'

interface LocalDataSummary {
  borrowerCount: number
  debtCount: number
  entryCount: number
  importCount: number
  unresolvedCount: number
  hasAnyData: boolean
}

interface SettingsDrawerProps {
  isOpen: boolean
  isLocalRuntime: boolean
  themePreference: 'light' | 'dark'
  backupHealth: BackupHealth
  storageStatus: StorageStatus | null
  localDataSummary: LocalDataSummary
  onClose: () => void
  onChangeTheme: (themePreference: 'light' | 'dark') => void
  onRequestPersistence: () => Promise<void>
  onResetAllData: () => Promise<void>
}

type SettingsSectionKey = 'closeHelp' | 'protection' | 'reset'

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1.6 1.6a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9v.2A1.2 1.2 0 0 1 13.4 22h-2.8a1.2 1.2 0 0 1-1.2-1.2v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1.6-1.6a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6h-.2A1.2 1.2 0 0 1 2 13.4v-2.8a1.2 1.2 0 0 1 1.2-1.2h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1.6-1.6a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9v-.2A1.2 1.2 0 0 1 10.6 2h2.8a1.2 1.2 0 0 1 1.2 1.2v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1.6 1.6a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 22 10.6v2.8a1.2 1.2 0 0 1-1.2 1.2h-.2a1 1 0 0 0-.9.6Z" />
    </svg>
  )
}

function formatStoragePersistence(storageStatus: StorageStatus | null): string {
  if (!storageStatus || storageStatus.persisted === null) {
    return 'Inconnu'
  }

  return storageStatus.persisted ? 'Actif' : 'À confirmer'
}

export function SettingsDrawer({
  isOpen,
  isLocalRuntime,
  themePreference,
  backupHealth,
  storageStatus,
  localDataSummary,
  onClose,
  onChangeTheme,
  onRequestPersistence,
  onResetAllData,
}: SettingsDrawerProps) {
  const [openSections, setOpenSections] = useState<Record<SettingsSectionKey, boolean>>(() => ({
    closeHelp: false,
    protection: backupHealth.state === 'backup_stale',
    reset: false,
  }))
  const canRequestPersistentStorage = storageStatus?.persisted !== true && backupHealth.state !== 'local_persistent'
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  useModalDialog({
    isOpen,
    onClose,
    dialogRef,
    overlayRef,
    initialFocusRef: closeButtonRef,
  })

  if (!isOpen) {
    return null
  }

  function toggleSection(section: SettingsSectionKey) {
    setOpenSections((current) => {
      const nextValue = !current[section]
      return {
        closeHelp: false,
        protection: false,
        reset: false,
        [section]: nextValue,
      }
    })
  }

  return (
    <div className="settings-backdrop" ref={overlayRef} role="presentation" onClick={onClose}>
      <aside
        className="settings-drawer"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-drawer-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-drawer-header">
          <div className="settings-drawer-heading">
            <div className="settings-header-badge" aria-hidden="true">
              <SettingsIcon />
            </div>
            <div className="settings-header-copy">
              <p className="eyebrow">Réglages</p>
              <h2 id="settings-drawer-title">Réglages</h2>
            </div>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="ghost-button icon-button"
            aria-label="Fermer les réglages"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <section className="settings-group">
          <div className="settings-group-heading">
            <p className="eyebrow">Apparence</p>
            <h3>Thème</h3>
          </div>
          <div className="settings-row theme-settings-row">
            <div className="settings-row-copy">
              <strong>Mode</strong>
            </div>
            <div className="theme-segmented-control" role="group" aria-label="Thème">
              <button
                type="button"
                className="theme-segment-button"
                aria-pressed={themePreference === 'light'}
                onClick={() => onChangeTheme('light')}
              >
                Clair
              </button>
              <button
                type="button"
                className="theme-segment-button"
                aria-pressed={themePreference === 'dark'}
                onClick={() => onChangeTheme('dark')}
              >
                Sombre
              </button>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <div className="settings-group-heading">
            <p className="eyebrow">App locale</p>
            <h3>Ce navigateur</h3>
          </div>
          <button
            type="button"
            className="ghost-button settings-section-toggle"
            aria-expanded={openSections.closeHelp}
            data-expanded={openSections.closeHelp}
            onClick={() => toggleSection('closeHelp')}
          >
            <span className="settings-section-label">
              <strong>Comment fermer l’app</strong>
              <span>Fermer la page ne coupe pas le serveur local si l’app tourne en local.</span>
            </span>
            <span className="settings-section-state">{openSections.closeHelp ? 'Masquer' : 'Afficher'}</span>
          </button>
          {openSections.closeHelp ? (
            <div className="settings-section-body">
              {isLocalRuntime ? (
                <>
                  <div className="settings-row-list">
                    <div className="settings-row">
                      <div className="settings-row-copy">
                        <strong>Fermer localement</strong>
                        <p className="section-note">Utilisez Ctrl+C dans le terminal d’origine.</p>
                      </div>
                    </div>
                  </div>
                  <details className="details-disclosure settings-inline-disclosure">
                    <summary>Voir les commandes Windows</summary>
                    <div className="settings-row-list">
                      <div className="settings-row">
                        <div className="settings-row-copy">
                          <strong>Commande Windows</strong>
                        </div>
                        <span className="settings-row-value settings-inline-code">npm run stop:windows</span>
                      </div>
                      <div className="settings-row">
                        <div className="settings-row-copy">
                          <strong>Script direct</strong>
                        </div>
                        <span className="settings-row-value settings-inline-code">.\\scripts\\stop-windows.ps1</span>
                      </div>
                    </div>
                  </details>
                </>
              ) : (
                <div className="settings-row-list">
                    <div className="settings-row">
                      <div className="settings-row-copy">
                        <strong>Version hébergée</strong>
                        <p className="section-note">Pas de serveur local ici.</p>
                      </div>
                      <span className="settings-row-value">Fermez simplement l’onglet</span>
                    </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="settings-group">
          <div className="settings-group-heading">
            <p className="eyebrow">Protection et sauvegarde</p>
            <h3>Données locales</h3>
          </div>
          <button
            type="button"
            className="ghost-button settings-section-toggle"
            aria-expanded={openSections.protection}
            data-expanded={openSections.protection}
            onClick={() => toggleSection('protection')}
          >
            <span className="settings-section-label">
              <strong>Protection locale</strong>
              <span>Confidentialité, stockage persistant et raccourcis vers les copies de secours.</span>
            </span>
            <span className="settings-section-state">{openSections.protection ? 'Masquer' : 'Afficher'}</span>
          </button>
          {openSections.protection ? (
            <div className="settings-section-body">
              <div className="settings-row-list">
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Stockage persistant</strong>
                  </div>
                  <span className="settings-row-value">{formatStoragePersistence(storageStatus)}</span>
                </div>
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>État de la copie exportée</strong>
                  </div>
                  <span className="settings-row-value settings-row-value-compact">{backupHealth.headline}</span>
                </div>
              </div>

              <div className={`notice-panel notice-panel-${backupHealth.state} notice-panel-compact settings-note-panel`}>
                <strong>Confidentialité locale</strong>
                <p className="section-note">Les données restent sur cet appareil et ne quittent pas ce navigateur.</p>
              </div>

              <div className="settings-row-list">
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>État actuel</strong>
                    <p className="section-note">{backupHealth.detail}</p>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Copies de secours JSON</strong>
                  </div>
                  <Link className="inline-link" to="/import">
                    Ouvrir Import & sauvegarde
                  </Link>
                </div>
                <div className="settings-row">
                  <div className="settings-row-copy">
                    <strong>Usage estimé du stockage</strong>
                  </div>
                  <span className="settings-row-value settings-row-value-compact">
                    {storageStatus ? `${storageStatus.usageMb ?? '?'} MB / ${storageStatus.quotaMb ?? '?'} MB` : 'Lecture en cours...'}
                  </span>
                </div>
              </div>

              {canRequestPersistentStorage ? (
                <div className="settings-action-row">
                  <button type="button" className="secondary-button" onClick={() => void onRequestPersistence()}>
                    Renforcer la protection locale
                  </button>
                </div>
              ) : (
                <p className="section-note">Stockage persistant déjà confirmé.</p>
              )}
            </div>
          ) : null}
        </section>

        <section className="settings-group settings-group-danger">
          <div className="settings-group-heading">
            <p className="eyebrow">Zone sensible</p>
            <h3>Effacement total</h3>
          </div>
          <button
            type="button"
            className="ghost-button settings-section-toggle"
            aria-expanded={openSections.reset}
            data-expanded={openSections.reset}
            onClick={() => toggleSection('reset')}
          >
            <span className="settings-section-label">
              <strong>Tout effacer sur cet appareil</strong>
              <span>Supprime toutes les données locales du navigateur après confirmation forte.</span>
            </span>
            <span className="settings-section-state">{openSections.reset ? 'Masquer' : 'Afficher'}</span>
          </button>
          {openSections.reset ? (
            <div className="settings-section-body">
              <div className="notice-panel notice-panel-warning action-panel settings-danger-panel">
                <strong>Effacement total local</strong>
                <p className="section-note">
                  Cette action supprimera toutes les données locales de ce navigateur, y compris les emprunteurs, dettes, écritures, lignes en attente, sessions d’import et métadonnées locales.
                </p>
                <p className="section-note">
                  État actuel: {localDataSummary.borrowerCount} emprunteur(s), {localDataSummary.debtCount} dette(s), {localDataSummary.entryCount} écriture(s), {localDataSummary.unresolvedCount} ligne(s) en attente, {localDataSummary.importCount} session(s) d’import.
                </p>
                <p className="section-note">
                  Exportez une copie de secours avant si vous voulez garder une copie portable de vos données avant effacement.
                </p>
                <button
                  type="button"
                  className="ghost-button danger-button"
                  disabled={!localDataSummary.hasAnyData}
                  onClick={() => void onResetAllData()}
                >
                  {localDataSummary.hasAnyData ? 'Tout effacer sur cet appareil' : 'Aucune donnée locale à effacer'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  )
}
