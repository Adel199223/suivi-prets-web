import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { addLedgerEntry, createBorrower, createDebt, exportBackup, resetAllData } from './lib/repository'
import * as backupModule from './lib/backup'
import { buildWorkbookFile } from '../test/fixtures/import/files'

describe('App', () => {
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
      usage: 8 * 1024 * 1024
    }))
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: {
        persisted: persistedMock,
        persist: persistMock,
        estimate: estimateMock
      }
    })
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
    await user.click(screen.getByRole('button', { name: /creer l’emprunteur/i }))

    await screen.findByRole('heading', { name: 'Amina' })
    await user.type(screen.getByLabelText('Libelle'), 'Loyer')
    await user.type(screen.getByLabelText('Solde initial (€)'), '1200')
    await user.type(screen.getByLabelText('Date precise dette'), '2026-03-01')
    await user.click(screen.getByRole('button', { name: /creer la dette/i }))

    await screen.findByRole('heading', { name: 'Loyer', level: 1 })
    await user.click(screen.getByRole('button', { name: /enregistrer un paiement/i }))
    await user.type(await screen.findByLabelText('Montant (€)'), '200')
    await user.type(await screen.findByLabelText('Date precise'), '2026-03-15')
    await user.click(screen.getByRole('button', { name: /valider le paiement/i }))
    await screen.findByText(/paiement enregistre/i)

    await user.click(screen.getByRole('button', { name: /ajouter une avance/i }))
    await user.type(await screen.findByLabelText('Montant (€)'), '50')
    await user.type(await screen.findByLabelText('Date precise'), '2026-03-18')
    await user.click(screen.getByRole('button', { name: /valider l’avance/i }))
    await screen.findByText(/avance enregistree/i)

    await user.click(screen.getByRole('button', { name: /clore la dette/i }))
    await screen.findByText(/dette cloturee/i)

    await user.click(screen.getByRole('link', { name: /import & sauvegarde/i }))
    await screen.findByRole('heading', { name: /protection des donnees/i })
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
    await screen.findByText(/sauvegarde restauree/i)
    await screen.findByRole('link', { name: /amina/i })
  })

  it('imports a safe workbook .ods file and shows the merged data in the same app session', async () => {
    const user = userEvent.setup()
    const view = render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('partial-workbook.ods'))
    await screen.findByText(/classeur analyse/i)
    await screen.findByRole('heading', { name: /emprunteurs reperes/i })
    await screen.findByText('Adel')
    await screen.findByText('Fatiha')
    await user.click(screen.getByRole('button', { name: /importer ce classeur/i }))
    await screen.findByText(/import termine: les donnees sont visibles dans ce navigateur/i)
    await screen.findByRole('link', { name: /ouvrir adel/i })
    await screen.findByRole('link', { name: /ouvrir fatiha/i })
    await user.click(screen.getByRole('button', { name: /masquer ce resume/i }))
    await screen.findByText(/resume d’import masque/i)
    await user.click(screen.getByRole('button', { name: /reafficher le resume/i }))
    await screen.findByText(/import termine: les donnees sont visibles dans ce navigateur/i)
    expect(screen.queryByRole('heading', { name: /protection des donnees/i })).not.toBeInTheDocument()
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

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))

    await screen.findByText(/import partiel disponible/i)
    expect(screen.getByRole('button', { name: /importer les lignes sures maintenant/i })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /importer les lignes sures maintenant/i }))
    await screen.findByText(/import partiel termine: les donnees sures sont deja visibles/i)
    await screen.findByText(/1 ligne\(s\) d’import restent en attente/i)
    await screen.findByRole('link', { name: /ouvrir adel/i })

    await user.click(screen.getByRole('link', { name: /ouvrir adel/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cet emprunteur/i })
    await screen.findByText(/montant encore hors total/i)
    await user.click(screen.getByText(/voir le detail des lignes en attente/i))
    await screen.findByText(/dette_adel_1 · ligne 2/i)

    await user.click(screen.getByRole('link', { name: /voir le detail/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cette dette/i })
    await user.click(screen.getByText(/voir la ligne en attente/i))
    await screen.findByText(/aucune ecriture comptabilisee pour le moment/i)

    await user.click(screen.getAllByRole('link', { name: /import & sauvegarde/i })[0]!)
    await screen.findByRole('heading', { name: /lignes en attente/i })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)
    await user.type(screen.getByLabelText(/mois a appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await waitFor(() => {
      expect(screen.queryByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/ligne en attente resolue/i)

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

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByRole('button', { name: /importer les lignes sures maintenant/i })
    await user.click(screen.getByRole('button', { name: /importer les lignes sures maintenant/i }))
    await screen.findByRole('link', { name: /ouvrir adel/i })

    await user.click(screen.getByRole('link', { name: /ouvrir adel/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cet emprunteur/i })
    await user.click(screen.getByText(/voir le detail des lignes en attente/i))
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)
    await user.type(screen.getByLabelText(/mois a appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await waitFor(() => {
      expect(screen.queryByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/ligne en attente resolue/i)
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

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByRole('button', { name: /importer les lignes sures maintenant/i })
    await user.click(screen.getByRole('button', { name: /importer les lignes sures maintenant/i }))
    await screen.findByRole('link', { name: /ouvrir adel/i })

    await user.click(screen.getByRole('link', { name: /ouvrir adel/i }))
    await user.click(screen.getByRole('link', { name: /voir le detail/i }))
    await screen.findByRole('heading', { name: /lignes en attente pour cette dette/i })
    await user.click(screen.getByText(/voir la ligne en attente/i))
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)
    await user.type(screen.getByLabelText(/mois a appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await waitFor(() => {
      expect(screen.queryByText(/choisissez un mois au format aaaa-mm avant d’ajouter cette ligne/i)).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/ligne en attente resolue/i)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /lignes en attente pour cette dette/i })).not.toBeInTheDocument()
    })
  })

  it('lets the user manually reinforce local protection after an automatic persistence attempt was denied', async () => {
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

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('partial-workbook.ods'))
    await user.click(await screen.findByRole('button', { name: /importer ce classeur/i }))

    await screen.findByText(/enregistre sur cet appareil/i)
    expect(persistMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getAllByRole('link', { name: /import & sauvegarde/i })[0]!)
    await user.click(screen.getByText(/copie de secours \(optionnel\)/i))
    await screen.findByRole('button', { name: /renforcer la protection locale/i })
    await user.click(screen.getByRole('button', { name: /renforcer la protection locale/i }))

    await screen.findByText(/protection locale renforcee/i)
    expect(persistMock).toHaveBeenCalledTimes(2)
  })

  it('shows an honest local close helper in the topbar', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App runtimeHostname="127.0.0.1" />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /comment fermer/i }))
    await screen.findByText(/ctrl\+c/i)
    expect(screen.getByText(/npm run stop:windows/i)).toBeInTheDocument()
    expect(screen.getByText(/fermer seulement l’onglet du navigateur ne coupe pas le serveur local/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /masquer l’aide fermeture/i }))
    await waitFor(() => {
      expect(screen.queryByText(/npm run stop:windows/i)).not.toBeInTheDocument()
    })
  })

  it('shows hosted close guidance instead of local stop commands outside localhost', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App runtimeHostname="suivi-prets.app" />
      </MemoryRouter>
    )

    await user.click(screen.getByRole('button', { name: /comment fermer/i }))
    await screen.findByText(/fermez simplement l’onglet ou quittez le navigateur/i)
    expect(screen.getByText(/serveur local/i)).toBeInTheDocument()
    expect(screen.queryByText(/npm run stop:windows/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ctrl\+c/i)).not.toBeInTheDocument()
  })

  it('edits borrower information and reflects the new name on the dashboard', async () => {
    const borrower = await createBorrower({ name: 'Amina', notes: 'Note initiale' })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/emprunteurs/${borrower.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Amina' })
    await user.clear(screen.getByLabelText(/nom emprunteur/i))
    await user.type(screen.getByLabelText(/nom emprunteur/i), 'Amina Corrigee')
    await user.clear(screen.getByLabelText(/^Notes emprunteur$/i))
    await user.type(screen.getByLabelText(/^Notes emprunteur$/i), 'Note corrigee')
    await user.click(screen.getByRole('button', { name: /enregistrer la fiche/i }))

    await screen.findByText(/fiche emprunteur enregistree/i)
    await screen.findByRole('heading', { name: 'Amina Corrigee' })
    await user.click(screen.getByRole('link', { name: /tableau de bord/i }))
    await screen.findByText('Amina Corrigee')
  })

  it('edits debt information and offers a contextual link to add another debt', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.clear(screen.getByLabelText(/libelle de la dette/i))
    await user.type(screen.getByLabelText(/libelle de la dette/i), 'Loyer principal')
    await user.clear(screen.getByLabelText(/^Notes de la dette$/i))
    await user.type(screen.getByLabelText(/^Notes de la dette$/i), 'Dette corrigee')
    await user.click(screen.getByRole('button', { name: /enregistrer les informations/i }))

    await screen.findByText(/informations de la dette enregistrees/i)
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

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByRole('button', { name: /importer les lignes sures maintenant/i })
    await user.click(screen.getByRole('button', { name: /importer les lignes sures maintenant/i }))
    const queueLinks = await screen.findAllByRole('link', { name: /completer la file/i })
    await user.click(queueLinks[0]!)
    await screen.findByLabelText(/mois a appliquer pour dette_adel_1 ligne 2/i)
    await user.type(screen.getByLabelText(/mois a appliquer pour dette_adel_1 ligne 2/i), '2024-01')
    await user.click(screen.getByRole('button', { name: /ajouter cette ligne a la dette/i }))
    await screen.findByText(/ligne en attente resolue/i)

    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByText(/correction\(s\) locale\(s\) memorisee\(s\) sont reappliquee\(s\) pour ce fichier exact/i)
    expect(screen.getByRole('button', { name: /importer ce classeur/i })).toBeEnabled()
    expect(screen.queryByText(/import partiel disponible/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /importer ce classeur/i }))
    await screen.findByText(/0 ligne\(s\) ajoutee\(s\), 1 deja presente\(s\)/i)
  })

  it('deletes a pending import row directly from the import queue', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await user.click(await screen.findByRole('button', { name: /importer les lignes sures maintenant/i }))
    await user.click((await screen.findAllByRole('link', { name: /completer la file d’attente/i }))[0]!)
    await screen.findByRole('heading', { name: /lignes en attente/i })
    await screen.findByText(/dette_adel_1 · ligne 2/i)

    await user.click(screen.getByRole('button', { name: /supprimer la ligne dette_adel_1 ligne 2/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(String(vi.mocked(window.confirm).mock.calls.at(-1)?.[0])).toContain('Supprimer cette ligne en attente')
    await screen.findByText(/ligne en attente supprimee/i)
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
      occurredOn: '2026-03-01'
    })
    await addLedgerEntry({
      debtId: debt.id,
      kind: 'payment',
      amountCents: 20000,
      occurredOn: '2026-03-15',
      description: 'Paiement mars'
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
    await user.clear(screen.getByLabelText(/date precise de la ligne/i))
    await user.type(screen.getByLabelText(/date precise de la ligne/i), '2026-03-20')
    await user.clear(screen.getByLabelText(/detail de la ligne/i))
    await user.type(screen.getByLabelText(/detail de la ligne/i), 'Paiement corrige')
    await user.click(screen.getByRole('button', { name: /enregistrer la ligne/i }))

    await screen.findByText(/ecriture mise a jour/i)
    await screen.findByText(/paiement corrige/i)
    await screen.findAllByText(/350,00 €/i)
  })

  it('edits an opening balance line and refreshes the debt totals', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
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
    await user.clear(screen.getByLabelText(/date precise de la ligne/i))
    await user.type(screen.getByLabelText(/date precise de la ligne/i), '2026-03-05')
    await user.clear(screen.getByLabelText(/detail de la ligne/i))
    await user.type(screen.getByLabelText(/detail de la ligne/i), 'Ouverture corrigee')
    await user.click(screen.getByRole('button', { name: /enregistrer la ligne/i }))

    await screen.findByText(/ecriture mise a jour/i)
    await screen.findByText(/ouverture corrigee/i)
    await screen.findAllByText(/1 500,00 €/i)
  })

  it('deletes a debt from its detail page and redirects back to the borrower', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    const debt = await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })
    await addLedgerEntry({
      debtId: debt.id,
      kind: 'payment',
      amountCents: 20000,
      occurredOn: '2026-03-15',
      description: 'Paiement mars'
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/dettes/${debt.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.click(screen.getByRole('button', { name: /supprimer cette dette/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(String(vi.mocked(window.confirm).mock.calls.at(-1)?.[0])).toContain('Les paiements, avances, ajustements et lignes en attente')
    await screen.findByText(/dette supprimee/i)
    await screen.findByRole('heading', { name: 'Amina' })
    expect(screen.queryByRole('heading', { name: 'Loyer' })).not.toBeInTheDocument()
  })

  it('deletes a borrower from its detail page and returns to an empty dashboard', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[`/emprunteurs/${borrower.id}`]}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Amina' })
    await user.click(screen.getByRole('button', { name: /supprimer cet emprunteur/i }))
    expect(window.confirm).toHaveBeenCalled()
    expect(String(vi.mocked(window.confirm).mock.calls.at(-1)?.[0])).toContain('Toutes les dettes, ecritures et lignes en attente')
    await screen.findByText(/emprunteur supprime/i)
    await screen.findByRole('heading', { name: /suivi prets/i })
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()
  })

  it('wipes all local data after the strong typed confirmation', async () => {
    const borrower = await createBorrower({ name: 'Amina' })
    await createDebt({
      borrowerId: borrower.id,
      label: 'Loyer',
      openingBalanceCents: 120000,
      occurredOn: '2026-03-01'
    })

    vi.mocked(window.prompt).mockReturnValue('EFFACER')

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /protection des donnees/i })
    await user.click(await screen.findByRole('button', { name: /tout effacer sur cet appareil/i }))
    expect(window.prompt).toHaveBeenCalled()
    expect(String(vi.mocked(window.prompt).mock.calls.at(-1)?.[0])).toContain('Tapez EFFACER pour confirmer')
    await screen.findByText(/toutes les donnees locales ont ete effacees/i)
    await screen.findByRole('heading', { name: /suivi prets/i })
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()
  })

  it('filters settled borrowers and settled-debt payments on the dashboard', async () => {
    await act(async () => {
      const activeBorrower = await createBorrower({ name: 'Amina' })
      const activeDebt = await createDebt({
        borrowerId: activeBorrower.id,
        label: 'Loyer',
        openingBalanceCents: 120000,
        occurredOn: '2026-03-01'
      })
      await addLedgerEntry({
        debtId: activeDebt.id,
        kind: 'payment',
        amountCents: 20000,
        occurredOn: '2026-03-15',
        description: 'Paiement Amina'
      })

      const settledBorrower = await createBorrower({ name: 'Bilal' })
      const settledDebt = await createDebt({
        borrowerId: settledBorrower.id,
        label: 'Voiture',
        openingBalanceCents: 50000,
        occurredOn: '2026-02-01'
      })
      await addLedgerEntry({
        debtId: settledDebt.id,
        kind: 'payment',
        amountCents: 50000,
        occurredOn: '2026-03-20',
        description: 'Paiement Bilal'
      })
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    await screen.findByText('Amina')
    expect(screen.queryByText('Bilal')).not.toBeInTheDocument()
    expect(screen.getByText(/amina · loyer/i)).toBeInTheDocument()
    expect(screen.queryByText(/bilal · voiture/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /emprunteurs soldes \(1\)/i }))
    await screen.findByText('Bilal')
    expect(screen.queryByText('Amina')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /dettes soldes \(1\)/i }))
    await screen.findByText(/bilal · voiture/i)
    expect(screen.queryByText(/amina · loyer/i)).not.toBeInTheDocument()
    expect(screen.getByText(/paiement bilal/i)).toBeInTheDocument()
  })
})
