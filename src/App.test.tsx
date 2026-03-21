import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { exportBackup, resetAllData } from './lib/repository'
import { serializeBackup } from './lib/backup'
import { buildImportPreviewFile } from '../test/fixtures/import/files'

describe('App', () => {
  beforeEach(async () => {
    await resetAllData()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn()
    })
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
      expect(URL.createObjectURL).toHaveBeenCalled()
    })

    const backup = await exportBackup()
    await resetAllData()
    const backupFile = new File([serializeBackup(backup)], 'restore.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText(/restaurer une sauvegarde json/i), backupFile)
    await screen.findByText(/sauvegarde restauree/i)
    await screen.findByText(/amina/i)
  })

  it('imports a workbook preview and merges it into the app', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: /centre de confiance/i })
    await user.upload(screen.getByLabelText(/charger un apercu json/i), buildImportPreviewFile('partial-preview.json'))
    await screen.findByText(/apercu d’import charge/i)
    await screen.findByText(/emprunteurs detectes/i)
    await user.click(screen.getByRole('button', { name: /fusionner l’import/i }))
    await screen.findByText(/import fusionne/i)
  })
})
