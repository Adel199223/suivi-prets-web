import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import App from './App'
import { addLedgerEntry, createBorrower, createDebt, exportBackup, resetAllData } from './lib/repository'
import * as backupModule from './lib/backup'
import { buildWorkbookFile } from '../test/fixtures/import/files'

function AppRouteChangeHarness() {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" onClick={() => navigate('/import')}>
        Aller à import test
      </button>
      <App />
    </>
  )
}

describe('App', () => {
  const THEME_STORAGE_KEY = 'suivi-prets-web:theme'
  let persistentEnabled = false
  let persistedMock: ReturnType<typeof vi.fn>
  let persistMock: ReturnType<typeof vi.fn>
  let estimateMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    persistentEnabled = false
    persistedMock = vi.fn(async () => persistentEnabled)
    persistMock = vi.fn(async () => {
      persistentEnabled = true
      return true
    })
    estimateMock = vi.fn(async () => ({
      quota: 512 * 1024 * 1024,
      usage: 8 * 1024 * 1024,
    }))
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: {
        persisted: persistedMock,
        persist: persistMock,
        estimate: estimateMock,
      },
    })
    if (typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    } else if (typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    }
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    await resetAllData()
    vi.spyOn(backupModule, 'downloadJson').mockImplementation(() => {})
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('prompt', vi.fn(() => null))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('supports the main borrower and debt workflow plus backup export and restore', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText('Nom'), 'Amina')
    await user.click(screen.getByRole('button', { name: /créer l’emprunteur/i }))

    await screen.findByRole('heading', { name: 'Amina' })
    await user.type(screen.getByLabelText('Libellé'), 'Loyer')
    await user.type(screen.getByLabelText('Solde initial (€)'), '1200')
    await user.type(screen.getByLabelText('Date précise dette'), '2026-03-01')
    await user.click(screen.getByRole('button', { name: /créer la dette/i }))

    await screen.findByRole('heading', { name: 'Loyer', level: 1 })
    await user.click(screen.getByRole('button', { name: /enregistrer un paiement/i }))
    await user.type(await screen.findByLabelText('Montant (€)'), '200')
    await user.type(await screen.findByLabelText('Date précise'), '2026-03-15')
    await user.click(screen.getByRole('button', { name: /valider le paiement/i }))
    await screen.findByText(/paiement enregistré/i)

    await user.click(screen.getByRole('button', { name: /ajouter une avance/i }))
    await user.type(await screen.findByLabelText('Montant (€)'), '50')
    await user.type(await screen.findByLabelText('Date précise'), '2026-03-18')
    await user.click(screen.getByRole('button', { name: /valider l’avance/i }))
    await screen.findByText(/avance enregistrée/i)

    await user.click(screen.getByRole('button', { name: /clore la dette/i }))
    await screen.findByText(/dette clôturée/i)

    await user.click(screen.getByRole('link', { name: /import & sauvegarde/i }))
    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.click(screen.getByText(/copie de secours \(optionnel\)/i))
    await user.click(screen.getByRole('button', { name: /exporter une copie de secours/i }))
    await waitFor(() => {
      expect(backupModule.downloadJson).toHaveBeenCalled()
    })

    let backup!: Awaited<ReturnType<typeof exportBackup>>
    await act(async () => {
      backup = await exportBackup()
    })
    await act(async () => {
      await resetAllData()
    })
    const backupFile = new File([backupModule.serializeBackup(backup)], 'restore.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/restaurer une copie de secours/i), backupFile)
    expect(window.confirm).toHaveBeenCalled()
    await screen.findByText(/sauvegarde restaurée/i)
    await screen.findByRole('link', { name: /amina/i })
  })

  it('keeps manual borrower and debt creation after remount because local autosave is automatic', async () => {
    const user = userEvent.setup()
    const view = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    expect(screen.queryByText(/^enregistré sur cet appareil$/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Nom'), 'Amina')
    await user.click(screen.getByRole('button', { name: /créer l’emprunteur/i }))

    await screen.findByRole('heading', { name: 'Amina' })
    await user.type(screen.getByLabelText('Libellé'), 'Loyer')
    await user.type(screen.getByLabelText('Solde initial (€)'), '1200')
    await user.type(screen.getByLabelText('Date précise dette'), '2026-03-01')
    await user.click(screen.getByRole('button', { name: /créer la dette/i }))

    await screen.findByRole('heading', { name: 'Loyer', level: 1 })

    view.unmount()

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    expect(screen.queryByText(/^enregistré sur cet appareil$/i)).not.toBeInTheDocument()
    await screen.findByRole('link', { name: /amina/i })
    await screen.findByText(/1 dette\(s\) ouverte\(s\)/i)

    await user.click(screen.getByRole('link', { name: /amina/i }))
    await screen.findByRole('heading', { name: 'Amina' })
    expect(screen.getByRole('heading', { name: 'Loyer', level: 3 })).toBeInTheDocument()
  })

  it('imports a safe workbook .ods file and shows the merged data in the same app session', async () => {
    const user = userEvent.setup()
    const view = render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    expect(screen.queryByRole('heading', { name: /protection des données/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^confidentialité$/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /aide import/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/les données importées restent sur cet appareil/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /voir l’aide import/i }))
    await screen.findByRole('dialog', { name: /aide import/i })
    await screen.findByText(/le dépôt public contient seulement le code de l’app/i)
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('partial-workbook.ods'))
    await screen.findByText(/classeur analysé/i)
    await screen.findByRole('heading', { name: /emprunteurs repérés/i })
    await screen.findByText('Adel')
    await screen.findByText('Fatiha')
    await user.click(screen.getByRole('button', { name: /importer ce classeur/i }))
    await screen.findByText(/import terminé: les données sont visibles dans ce navigateur/i)
    await screen.findByRole('link', { name: /ouvrir adel/i })
    await screen.findByRole('link', { name: /ouvrir fatiha/i })
    await user.click(screen.getByRole('button', { name: /masquer ce résumé/i }))
    await screen.findByText(/résumé d’import masqué/i)
    await user.click(screen.getByRole('button', { name: /réafficher le résumé/i }))
    await screen.findByText(/import terminé: les données sont visibles dans ce navigateur/i)
    expect(screen.queryByRole('heading', { name: /protection des données/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/sauvegarde requise/i)).not.toBeInTheDocument()
    expect(persistMock).toHaveBeenCalledTimes(1)

    view.unmount()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    await screen.findByRole('link', { name: /adel/i })
    expect(screen.queryByText(/sauvegarde requise/i)).not.toBeInTheDocument()
  })

  it('shows a row-local error on the import queue before resolving a pending line', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))

    await screen.findByText(/import partiel disponible/i)
    expect(screen.getByRole('button', { name: /importer les lignes sûres maintenant/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /importer les lignes sûres maintenant/i }))
    await screen.findByText(/import partiel terminé: les données sûres sont déjà visibles/i)
    await screen.findByText(/1 ligne\(s\) d’import restent en attente/i)
    await screen.findByRole('link', { name: /ouvrir adel/i })

    await user.click(screen.getByRole('link', { name: /ouvrir adel/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cet emprunteur/i })
    await screen.findByText(/montant encore hors total/i)
    await user.click(screen.getByText(/voir le détail des lignes en attente/i))
    await screen.findByText(/dette_adel_1 · ligne 2/i)

    await user.click(screen.getByRole('link', { name: /voir le détail/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cette dette/i })
    await user.click(screen.getByText(/voir la ligne en attente/i))
    await screen.findByText(/aucune écriture comptabilisée pour le moment/i)

    await user.click(screen.getAllByRole('link', { name: /import & sauvegarde/i })[0]!)
    await screen.findByRole('heading', { name: /lignes en attente/i })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)
    await user.type(screen.getByLabelText(/mois à appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await waitFor(() => {
      expect(screen.queryByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/ligne en attente résolue/i)

    await waitFor(() => {
      expect(screen.queryByText(/dette_adel_1 · ligne 2/i)).not.toBeInTheDocument()
    })
  })

  it('resolves a pending line directly from the borrower page with row-local validation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByRole('button', { name: /importer les lignes sûres maintenant/i })
    await user.click(screen.getByRole('button', { name: /importer les lignes sûres maintenant/i }))
    await screen.findByRole('link', { name: /ouvrir adel/i })

    await user.click(screen.getByRole('link', { name: /ouvrir adel/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cet emprunteur/i })
    await user.click(screen.getByText(/voir le détail des lignes en attente/i))
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)
    await user.type(screen.getByLabelText(/mois à appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await waitFor(() => {
      expect(screen.queryByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/ligne en attente résolue/i)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /lignes en attente pour cet emprunteur/i })).not.toBeInTheDocument()
    })
  })

  it('resolves a pending line directly from the debt page with row-local validation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByRole('button', { name: /importer les lignes sûres maintenant/i })
    await user.click(screen.getByRole('button', { name: /importer les lignes sûres maintenant/i }))
    await screen.findByRole('link', { name: /ouvrir adel/i })

    await user.click(screen.getByRole('link', { name: /ouvrir adel/i }))
    await user.click(screen.getByRole('link', { name: /voir le détail/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cette dette/i })
    await user.click(screen.getByText(/voir la ligne en attente/i))
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)
    await user.type(screen.getByLabelText(/mois à appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await waitFor(() => {
      expect(screen.queryByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/ligne en attente résolue/i)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /lignes en attente pour cette dette/i })).not.toBeInTheDocument()
    })
  })

  it('lets the user manually reinforce local protection from settings after an automatic persistence attempt was denied', async () => {
    const user = userEvent.setup()
    persistMock
      .mockImplementationOnce(async () => false)
      .mockImplementationOnce(async () => {
        persistentEnabled = true
        return true
      })

    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('partial-workbook.ods'))
    await user.click(await screen.findByRole('button', { name: /importer ce classeur/i }))
    await screen.findByText(/import terminé: les données sont visibles dans ce navigateur/i)

    await waitFor(() => {
      expect(persistMock).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    await screen.findByRole('dialog', { name: /^réglages$/i })
    await screen.findByText(/protection et sauvegarde/i)
    await user.click(screen.getByRole('button', { name: /protection locale/i }))
    await screen.findByRole('button', { name: /renforcer la protection locale/i })
    await user.click(screen.getByRole('button', { name: /renforcer la protection locale/i }))

    await waitFor(() => {
      expect(persistMock).toHaveBeenCalledTimes(2)
      expect(screen.queryByRole('button', { name: /renforcer la protection locale/i })).not.toBeInTheDocument()
    })
  })

  it('shows a gear-based settings control and exposes local close help inside the drawer', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App runtimeHostname="127.0.0.1" />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /^comment fermer \?$/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    await screen.findByRole('dialog', { name: /^réglages$/i })
    await screen.findByText(/apparence/i)
    await screen.findByText(/app locale/i)
    expect(screen.queryByText(/npm run stop:windows/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/stop-windows\.ps1/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /comment fermer l’app/i }))
    await screen.findByText(/ctrl\+c/i)
    await screen.findByText(/fermer la page ne coupe pas le serveur local/i)
    await user.click(screen.getByText(/voir les commandes windows/i))
    expect(screen.getByText(/npm run stop:windows/i)).toBeInTheDocument()
    expect(screen.getByText(/stop-windows\.ps1/i)).toBeInTheDocument()
  })

  it('shows hosted close guidance instead of local stop commands outside localhost', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App runtimeHostname="suivi-prets.app" />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    await screen.findByRole('dialog', { name: /^réglages$/i })
    await user.click(screen.getByRole('button', { name: /comment fermer/i }))
    await screen.findByText(/pas de serveur local ici/i)
    expect(screen.getByText(/fermez simplement l’onglet/i)).toBeInTheDocument()
    expect(screen.queryByText(/npm run stop:windows/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ctrl\+c/i)).not.toBeInTheDocument()
  })

  it('switches to dark mode from settings and keeps it after remount', async () => {
    const user = userEvent.setup()
    const view = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    expect(document.documentElement.dataset.theme).toBe('light')
    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    await screen.findByText(/^thème$/i)
    await user.click(screen.getByRole('button', { name: /^sombre$/i }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: /^sombre$/i })).toHaveAttribute('aria-pressed', 'true')

    view.unmount()

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    expect(document.documentElement.dataset.theme).toBe('dark')
    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    expect(screen.getByRole('button', { name: /^sombre$/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves focus into the settings drawer when it opens', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    const dialog = await screen.findByRole('dialog', { name: /^réglages$/i })
    const closeButton = dialog.querySelector('button[aria-label="Fermer les réglages"]')

    expect(closeButton).not.toBeNull()
    expect(closeButton).toHaveFocus()
  })

  it('traps focus inside the settings drawer with Tab and Shift+Tab', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    const dialog = await screen.findByRole('dialog', { name: /^réglages$/i })
    const closeButton = dialog.querySelector('button[aria-label="Fermer les réglages"]') as HTMLButtonElement | null
    const resetToggle = screen.getByRole('button', { name: /tout effacer sur cet appareil/i })

    expect(closeButton).not.toBeNull()
    expect(closeButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(resetToggle).toHaveFocus()

    resetToggle.focus()
    expect(resetToggle).toHaveFocus()

    await user.tab()
    expect(closeButton).toHaveFocus()
  })

  it('closes the settings drawer with Escape and restores focus to the toggle', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const settingsToggle = screen.getByRole('button', { name: /ouvrir les réglages/i })
    await user.click(settingsToggle)
    await screen.findByRole('dialog', { name: /^réglages$/i })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /^réglages$/i })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /ouvrir les réglages/i })).toHaveFocus()
  })

  it('locks background interaction state while the settings drawer is open', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    const header = document.querySelector('.topbar')
    const main = document.querySelector('.page-frame')

    expect(document.body.style.overflow).toBe('')
    expect(header).not.toBeNull()
    expect(main).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    const dialog = await screen.findByRole('dialog', { name: /^réglages$/i })
    const closeButton = dialog.querySelector('button[aria-label="Fermer les réglages"]')

    expect(document.body.style.overflow).toBe('hidden')
    expect(header).toHaveAttribute('aria-hidden', 'true')
    expect(main).toHaveAttribute('aria-hidden', 'true')
    expect(header?.hasAttribute('inert')).toBe(true)
    expect(main?.hasAttribute('inert')).toBe(true)

    expect(closeButton).not.toBeNull()
    await user.click(closeButton as HTMLButtonElement)

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /^réglages$/i })).not.toBeInTheDocument()
    })

    expect(document.body.style.overflow).toBe('')
    expect(header).not.toHaveAttribute('aria-hidden')
    expect(main).not.toHaveAttribute('aria-hidden')
    expect(header?.hasAttribute('inert')).toBe(false)
    expect(main?.hasAttribute('inert')).toBe(false)
  })

  it('restores modal cleanup when the route changes while settings are open', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AppRouteChangeHarness />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    await screen.findByRole('dialog', { name: /^réglages$/i })
    expect(document.body.style.overflow).toBe('hidden')

    await user.click(screen.getByRole('button', { name: /aller à import test/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /^réglages$/i })).not.toBeInTheDocument()
    })
    await screen.findByRole('heading', { name: /importer un classeur/i })
    expect(document.body.style.overflow).toBe('')
    expect(screen.getByRole('button', { name: /ouvrir les réglages/i })).toHaveFocus()
  })

  it('closes a page actions menu when clicking elsewhere', async () => {
    const borrower = await createBorrower({ name: 'Amina' })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/emprunteurs/${borrower.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Amina' })
    await user.click(screen.getByRole('button', { name: /ouvrir les actions de l’emprunteur/i }))
    await screen.findByRole('menuitem', { name: /supprimer cet emprunteur/i })
    await user.click(screen.getByRole('heading', { name: 'Amina' }))
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /supprimer cet emprunteur/i })).not.toBeInTheDocument()
    })
  })

  it('closes a page actions menu with escape', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.click(screen.getByRole('button', { name: /ouvrir les actions de la dette/i }))
    await screen.findByRole('menuitem', { name: /supprimer cette dette/i })
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /supprimer cette dette/i })).not.toBeInTheDocument()
    })
  })

  it('keeps borrower information collapsed by default and still lets the user edit it', async () => {
    const borrower = await createBorrower({ name: 'Amina', notes: 'Note initiale' })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/emprunteurs/${borrower.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Amina' })
    expect(screen.queryByLabelText(/nom emprunteur/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /modifier la fiche/i }))
    await user.clear(screen.getByLabelText(/nom emprunteur/i))
    await user.type(screen.getByLabelText(/nom emprunteur/i), 'Amina Corrigee')
    await user.clear(screen.getByLabelText(/^Notes emprunteur$/i))
    await user.type(screen.getByLabelText(/^Notes emprunteur$/i), 'Note corrigee')
    await user.click(screen.getByRole('button', { name: /enregistrer la fiche/i }))

    await screen.findByText(/fiche emprunteur enregistrée/i)
    await screen.findByRole('heading', { name: 'Amina Corrigee' })
    await user.click(screen.getByRole('link', { name: /tableau de bord/i }))
    await screen.findByText('Amina Corrigee')
  })

  it('keeps debt information collapsed by default and still lets the user edit it', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    expect(screen.queryByLabelText(/libellé de la dette/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /modifier les informations/i }))
    await user.clear(screen.getByLabelText(/libellé de la dette/i))
    await user.type(screen.getByLabelText(/libellé de la dette/i), 'Loyer principal')
    await user.clear(screen.getByLabelText(/^Notes de la dette$/i))
    await user.type(screen.getByLabelText(/^Notes de la dette$/i), 'Dette corrigee')
    await user.click(screen.getByRole('button', { name: /enregistrer les informations/i }))

    await screen.findByText(/informations de la dette enregistrées/i)
    await screen.findByRole('heading', { name: 'Loyer principal' })

    await user.click(screen.getByRole('link', { name: /ajouter une autre dette pour cet emprunteur/i }))
    await screen.findByRole('heading', { name: 'Amina' })
    await screen.findByRole('heading', { name: /ajouter une dette/i })
  })

  it('reuses a remembered correction on reimport after a queued line was resolved once', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByRole('button', { name: /importer les lignes sûres maintenant/i })
    await user.click(screen.getByRole('button', { name: /importer les lignes sûres maintenant/i }))
    const queueLinks = await screen.findAllByRole('link', { name: /compléter la file/i })
    await user.click(queueLinks[0]!)
    await screen.findByLabelText(/mois à appliquer pour dette_adel_1 ligne 2/i)
    await user.type(screen.getByLabelText(/mois à appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne à la dette/i }))
    await screen.findByText(/ligne en attente résolue/i)

    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByText(/correction\(s\) locale\(s\) réappliquée\(s\) pour ce fichier/i)
    expect(screen.getByRole('button', { name: /importer ce classeur/i })).toBeEnabled()
    expect(screen.queryByText(/import partiel disponible/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /importer ce classeur/i }))
    await screen.findByText(/0 ligne\(s\) ajoutée\(s\), 1 déjà présente\(s\)/i)
  })

  it('deletes a pending import row directly from the import queue', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /importer un classeur/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await user.click(await screen.findByRole('button', { name: /importer les lignes sûres maintenant/i }))
    await user.click((await screen.findAllByRole('link', { name: /compléter la file d’attente/i }))[0]!)
    await screen.findByRole('heading', { name: /lignes en attente/i })
    await screen.findByText(/dette_adel_1 · ligne 2/i)

    await user.click(screen.getByRole('button', { name: /supprimer la ligne dette_adel_1 ligne 2/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(String(vi.mocked(window.confirm).mock.calls.at(-1)?.[0])).toContain('Supprimer cette ligne en attente')
    await screen.findByText(/ligne en attente supprimée/i)
    await waitFor(() => {
      expect(screen.queryByText(/dette_adel_1 · ligne 2/i)).not.toBeInTheDocument()
    })
  })

  it('edits a payment line directly from the debt timeline', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })
    await addLedgerEntry({
      debtId: debt.id,
      kind: 'payment',
      amountCents: 20000,
      occurredOn: '2026-03-15',
      description: 'Paiement mars',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.click(screen.getByRole('button', { name: /modifier la ligne paiement/i }))
    await user.clear(screen.getByLabelText('Montant (€) de la ligne'))
    await user.type(screen.getByLabelText('Montant (€) de la ligne'), '350')
    await user.clear(screen.getByLabelText(/date précise de la ligne/i))
    await user.type(screen.getByLabelText(/date précise de la ligne/i), '2026-03-20')
    await user.clear(screen.getByLabelText(/détail de la ligne/i))
    await user.type(screen.getByLabelText(/détail de la ligne/i), 'Paiement corrige')
    await user.click(screen.getByRole('button', { name: /enregistrer la ligne/i }))

    await screen.findByText(/écriture mise à jour/i)
    await screen.findByText(/paiement corrige/i)
    await screen.findAllByText(/350,00 €/i)
  })

  it('edits an opening balance line and refreshes the debt totals', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.click(screen.getByRole('button', { name: /modifier la ligne solde initial/i }))
    await user.clear(screen.getByLabelText('Montant (€) de la ligne'))
    await user.type(screen.getByLabelText('Montant (€) de la ligne'), '1500')
    await user.clear(screen.getByLabelText(/date précise de la ligne/i))
    await user.type(screen.getByLabelText(/date précise de la ligne/i), '2026-03-05')
    await user.clear(screen.getByLabelText(/détail de la ligne/i))
    await user.type(screen.getByLabelText(/détail de la ligne/i), 'Ouverture corrigee')
    await user.click(screen.getByRole('button', { name: /enregistrer la ligne/i }))

    await screen.findByText(/écriture mise à jour/i)
    await screen.findByText(/ouverture corrigee/i)
    await screen.findAllByText(/1 500,00 €/i)
  })

  it('deletes a debt from its detail page through the contextual menu and redirects back to the borrower', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })
    await addLedgerEntry({
      debtId: debt.id,
      kind: 'payment',
      amountCents: 20000,
      occurredOn: '2026-03-15',
      description: 'Paiement mars',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.click(screen.getByRole('button', { name: /ouvrir les actions de la dette/i }))
    await user.click(screen.getByRole('menuitem', { name: /supprimer cette dette/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(String(vi.mocked(window.confirm).mock.calls.at(-1)?.[0])).toContain('Les paiements, avances, ajustements et lignes en attente')
    await screen.findByText(/dette supprimée/i)
    await screen.findByRole('heading', { name: 'Amina' })
    expect(screen.queryByRole('heading', { name: 'Loyer' })).not.toBeInTheDocument()
  })

  it('deletes a borrower from its detail page through the contextual menu and returns to an empty dashboard', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/emprunteurs/${borrower.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Amina' })
    await user.click(screen.getByRole('button', { name: /ouvrir les actions de l’emprunteur/i }))
    await user.click(screen.getByRole('menuitem', { name: /supprimer cet emprunteur/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(String(vi.mocked(window.confirm).mock.calls.at(-1)?.[0])).toContain('Toutes les dettes, écritures et lignes en attente')
    await screen.findByText(/emprunteur supprimé/i)
    await screen.findByRole('heading', { name: /suivi prêts/i })
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()
  })

  it('deletes a debt directly from the borrower page debt card', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/emprunteurs/${borrower.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Amina' })
    await user.click(screen.getByRole('button', { name: /ouvrir les actions de la dette loyer/i }))
    await user.click(screen.getByRole('menuitem', { name: /supprimer cette dette/i }))
    expect(window.confirm).toHaveBeenCalled()
    await screen.findByText(/dette supprimée/i)
    expect(screen.queryByRole('heading', { name: 'Loyer', level: 3 })).not.toBeInTheDocument()
  })

  it('deletes a borrower directly from the dashboard list', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByText('Amina')
    await user.click(screen.getByRole('button', { name: /ouvrir les actions de l’emprunteur amina/i }))
    await user.click(screen.getByRole('menuitem', { name: /supprimer cet emprunteur/i }))
    expect(window.confirm).toHaveBeenCalled()
    await screen.findByText(/emprunteur supprimé/i)
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()
  })

  it('wipes all local data after the strong typed confirmation from settings', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01',
    })

    vi.mocked(window.prompt).mockReturnValue('EFFACER')

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /ouvrir les réglages/i }))
    await screen.findByText(/zone sensible/i)
    await user.click(screen.getByRole('button', { name: /tout effacer sur cet appareil/i }))
    await user.click(screen.getByRole('button', { name: /^tout effacer sur cet appareil$/i }))
    expect(window.prompt).toHaveBeenCalled()
    expect(String(vi.mocked(window.prompt).mock.calls.at(-1)?.[0])).toContain('Tapez EFFACER pour confirmer')
    await screen.findByText(/toutes les données locales ont été effacées/i)
    await screen.findByRole('heading', { name: /suivi prêts/i })
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()
  })

  it('filters settled borrowers and settled-debt payments on the dashboard', async () => {
    await act(async () => {
      const activeBorrower = await createBorrower({ name: 'Amina' })
      const activeDebt = await createDebt({
        borrowerId: activeBorrower.id,
        label: 'Loyer',
        openingBalanceCents: 120000,
        occurredOn: '2026-03-01',
      })
      await addLedgerEntry({
        debtId: activeDebt.id,
        kind: 'payment',
        amountCents: 20000,
        occurredOn: '2026-03-15',
        description: 'Paiement Amina',
      })

      const settledBorrower = await createBorrower({ name: 'Bilal' })
      const settledDebt = await createDebt({
        borrowerId: settledBorrower.id,
        label: 'Voiture',
        openingBalanceCents: 50000,
        occurredOn: '2026-02-01',
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 50000,
        occurredOn: '2026-03-20',
        description: 'Paiement Bilal',
      })
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByText('Amina')
    expect(screen.getByText('Bilal')).toBeInTheDocument()
    expect(screen.getByText(/amina · loyer/i)).toBeInTheDocument()
    expect(screen.getByText(/bilal · voiture/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /emprunteurs actifs \(1\)/i }))
    await screen.findByText('Amina')
    expect(screen.queryByText('Bilal')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /emprunteurs soldés \(1\)/i }))
    await screen.findByText('Bilal')
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dettes encore ouvertes \(1\)/i }))
    await screen.findByText(/amina · loyer/i)
    expect(screen.queryByText(/bilal · voiture/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dettes soldées \(1\)/i }))
    await screen.findByText(/bilal · voiture/i)
    expect(screen.queryByText(/amina · loyer/i)).not.toBeInTheDocument()
    expect(screen.getByText(/paiement bilal/i)).toBeInTheDocument()
  })

  it('includes an older settled payment in the settled filter even when newer open-debt payments fill the recent stream', async () => {
    await act(async () => {
      const activeBorrower = await createBorrower({ name: 'Amina' })
      const activeDebt = await createDebt({
        borrowerId: activeBorrower.id,
        label: 'Loyer',
        openingBalanceCents: 250000,
        occurredOn: '2026-03-01',
      })

      for (const [index, day] of ['20', '19', '18', '17', '16', '15', '14', '13'].entries()) {
        await addLedgerEntry({
          debtId: activeDebt.id,
          kind: 'payment',
          amountCents: 10000,
          occurredOn: `2026-03-${day}`,
          description: `Actif ${index + 1}`,
        })
      }

      const settledBorrower = await createBorrower({ name: 'Bilal' })
      const settledDebt = await createDebt({
        borrowerId: settledBorrower.id,
        label: 'Voiture',
        openingBalanceCents: 50000,
        occurredOn: '2026-02-01',
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 50000,
        occurredOn: '2026-03-01',
        description: 'Solde ancien',
      })
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('button', { name: /dettes soldées \(1\)/i })
    await user.click(screen.getByRole('button', { name: /dettes soldées \(1\)/i }))
    await screen.findByText(/bilal · voiture/i)
    expect(screen.getByText(/solde ancien/i)).toBeInTheDocument()
  })

  it('counts payment filters from the full history instead of the truncated top eight subset', async () => {
    await act(async () => {
      const activeBorrower = await createBorrower({ name: 'Amina' })
      const activeDebt = await createDebt({
        borrowerId: activeBorrower.id,
        label: 'Loyer',
        openingBalanceCents: 400000,
        occurredOn: '2026-03-01',
      })

      for (const [index, day] of ['25', '24', '23', '22', '21', '20', '19', '18', '17'].entries()) {
        await addLedgerEntry({
          debtId: activeDebt.id,
          kind: 'payment',
          amountCents: 10000,
          occurredOn: `2026-03-${day}`,
          description: `Actif ${index + 1}`,
        })
      }

      const settledBorrower = await createBorrower({ name: 'Bilal' })
      const settledDebt = await createDebt({
        borrowerId: settledBorrower.id,
        label: 'Voiture',
        openingBalanceCents: 50000,
        occurredOn: '2026-02-01',
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 50000,
        occurredOn: '2026-03-02',
        description: 'Solde Bilal',
      })

      const secondSettledBorrower = await createBorrower({ name: 'Celia' })
      const secondSettledDebt = await createDebt({
        borrowerId: secondSettledBorrower.id,
        label: 'Santé',
        openingBalanceCents: 50000,
        occurredOn: '2026-02-01',
      })
      await addLedgerEntry({
        debtId: secondSettledDebt.id,
        kind: 'payment',
        amountCents: 50000,
        occurredOn: '2026-03-01',
        description: 'Solde Celia',
      })
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('button', { name: /tous \(11\)/i })
    expect(screen.getByRole('button', { name: /dettes encore ouvertes \(9\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dettes soldées \(2\)/i })).toBeInTheDocument()
  })

  it('shows only the two newest payment rows by default and lets the user reveal the rest', async () => {
    await act(async () => {
      const borrower = await createBorrower({ name: 'Amina' })
      const debt = await createDebt({
        borrowerId: borrower.id,
        label: 'Loyer',
        openingBalanceCents: 200000,
        occurredOn: '2026-03-01',
      })
      await addLedgerEntry({
        debtId: debt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-20',
        description: 'Paiement 20',
      })
      await addLedgerEntry({
        debtId: debt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-19',
        description: 'Paiement 19',
      })
      await addLedgerEntry({
        debtId: debt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-18',
        description: 'Paiement 18',
      })
      await addLedgerEntry({
        debtId: debt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-17',
        description: 'Paiement 17',
      })
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByText(/paiement 20/i)
    expect(screen.getByText(/paiement 19/i)).toBeInTheDocument()
    expect(screen.queryByText(/paiement 18/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/paiement 17/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voir les autres paiements \(2\)/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /voir les autres paiements \(2\)/i }))
    await screen.findByText(/paiement 18/i)
    expect(screen.getByText(/paiement 17/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /masquer le reste/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /masquer le reste/i }))
    await waitFor(() => {
      expect(screen.queryByText(/paiement 18/i)).not.toBeInTheDocument()
    })
    expect(screen.queryByText(/paiement 17/i)).not.toBeInTheDocument()
  })

  it('resets the recent-payments disclosure when the payment filter changes', async () => {
    await act(async () => {
      const activeBorrower = await createBorrower({ name: 'Amina' })
      const activeDebt = await createDebt({
        borrowerId: activeBorrower.id,
        label: 'Loyer',
        openingBalanceCents: 500000,
        occurredOn: '2026-03-01',
      })
      await addLedgerEntry({
        debtId: activeDebt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-12',
        description: 'Actif 12',
      })
      await addLedgerEntry({
        debtId: activeDebt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-11',
        description: 'Actif 11',
      })
      await addLedgerEntry({
        debtId: activeDebt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-10',
        description: 'Actif 10',
      })

      const settledBorrower = await createBorrower({ name: 'Bilal' })
      const settledDebt = await createDebt({
        borrowerId: settledBorrower.id,
        label: 'Voiture',
        openingBalanceCents: 30000,
        occurredOn: '2026-02-01',
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-22',
        description: 'Solde 22',
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-21',
        description: 'Solde 21',
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-20',
        description: 'Solde 20',
      })
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByText(/solde 22/i)
    await user.click(screen.getByRole('button', { name: /voir les autres paiements \(4\)/i }))
    await screen.findByText(/solde 20/i)
    expect(screen.getByText(/actif 12/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dettes encore ouvertes \(3\)/i }))
    await screen.findByText(/actif 12/i)
    expect(screen.getByText(/actif 11/i)).toBeInTheDocument()
    expect(screen.queryByText(/actif 10/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voir les autres paiements \(1\)/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dettes soldées \(3\)/i }))
    await screen.findByText(/solde 22/i)
    expect(screen.getByText(/solde 21/i)).toBeInTheDocument()
    expect(screen.queryByText(/solde 20/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voir les autres paiements \(1\)/i })).toBeInTheDocument()
  })

  it('hides the disclosure control when a filtered payment list has two rows or fewer', async () => {
    await act(async () => {
      const borrower = await createBorrower({ name: 'Amina' })
      const debt = await createDebt({
        borrowerId: borrower.id,
        label: 'Loyer',
        openingBalanceCents: 200000,
        occurredOn: '2026-03-01',
      })
      await addLedgerEntry({
        debtId: debt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-20',
        description: 'Paiement 20',
      })
      await addLedgerEntry({
        debtId: debt.id,
        kind: 'payment',
        amountCents: 10000,
        occurredOn: '2026-03-19',
        description: 'Paiement 19',
      })
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByText(/paiement 20/i)
    expect(screen.getByText(/paiement 19/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /voir les autres paiements/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /masquer le reste/i })).not.toBeInTheDocument()
  })
})
