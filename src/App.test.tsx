import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { exportBackup, resetAllData } from './lib/repository'
import * as backupModule from './lib/backup'
import { buildWorkbookFile } from '../test/fixtures/import/files'

describe('App', () => {
  beforeEach(async () => {
    await resetAllData()
    vi.spyOn(backupModule, 'downloadJson').mockImplementation(() => {})
    vi.stubGlobal('confirm', vi.fn(() => true))
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

    await screen.findByRole('heading', { name: 'Loyer' })
    await user.click(screen.getByRole('button', { name: /enregistrer un paiement/i }))
    await user.type(screen.getAllByLabelText('Montant (€)')[0]!, '200')
    await user.type(screen.getAllByLabelText('Date precise')[0]!, '2026-03-15')
    await user.click(screen.getByRole('button', { name: /valider le paiement/i }))
    await screen.findByText(/paiement enregistre/i)

    await user.type(screen.getAllByLabelText('Montant (€)')[1]!, '50')
    await user.type(screen.getAllByLabelText('Date precise')[1]!, '2026-03-18')
    await user.click(screen.getByRole('button', { name: /valider l’avance/i }))
    await screen.findByText(/avance enregistree/i)

    await user.click(screen.getByRole('button', { name: /clore la dette/i }))
    await screen.findByText(/dette cloturee/i)

    await user.click(screen.getByRole('link', { name: /import & sauvegarde/i }))
    await screen.findByRole('heading', { name: /centre de confiance/i })
    await user.click(screen.getByRole('button', { name: /exporter la sauvegarde/i }))
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
    await user.upload(screen.getByLabelText(/restaurer une sauvegarde json/i), backupFile)
    expect(window.confirm).toHaveBeenCalled()
    await screen.findByText(/sauvegarde restauree/i)
    await screen.findByText(/amina/i)
  })

  it('imports a workbook .ods file and shows the merged data in the same app session', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /centre de confiance/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('partial-workbook.ods'))
    await screen.findByText(/classeur analyse/i)
    await screen.findByRole('heading', { name: /emprunteurs reperes/i })
    await screen.findByText('Adel')
    await screen.findByText('Fatiha')
    await user.click(screen.getByRole('button', { name: /importer ce classeur/i }))
    await screen.findByText(/import fusionne dans ce navigateur/i)
    await screen.findByRole('link', { name: /adel/i })
    await screen.findByRole('link', { name: /fatiha/i })
  })

  it('blocks final import when the workbook still has ambiguous rows', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /centre de confiance/i })
    await user.upload(screen.getByLabelText(/choisir un classeur \.ods/i), buildWorkbookFile('broken-workbook.ods'))
    await screen.findByText(/import bloque tant que le fichier reste ambigu/i)
    expect(screen.getByRole('button', { name: /importer ce classeur/i })).toBeDisabled()
    expect(screen.getByText(/ligne 2/i)).toBeInTheDocument()
  })
})
