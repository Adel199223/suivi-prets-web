import { formatDate } from '../domain/format'
import type { AppSnapshot, BackupHealth } from '../domain/types'

function lastDataChangeAt(snapshot: AppSnapshot): string | null {
  const stamps = [
    ...snapshot.borrowers.map((view) => view.borrower.updatedAt),
    ...snapshot.debts.map((view) => view.debt.updatedAt),
    ...snapshot.debts.flatMap((view) => view.entries.map((entry) => entry.updatedAt)),
    ...snapshot.importSessions.map((session) => session.createdAt)
  ].filter(Boolean)

  return stamps.length > 0 ? [...stamps].sort().at(-1) ?? null : null
}

export function deriveBackupHealth(snapshot: AppSnapshot): BackupHealth {
  const hasLocalData = snapshot.borrowers.length > 0 || snapshot.debts.length > 0 || snapshot.importSessions.length > 0
  const lastChange = lastDataChangeAt(snapshot)

  if (!hasLocalData) {
    return {
      state: 'empty',
      headline: 'Aucune sauvegarde urgente.',
      detail: 'Aucune donnee locale a proteger pour le moment. Exportez un JSON des que vous commencez une vraie session de saisie.'
    }
  }

  if (!snapshot.lastBackupAt) {
    return {
      state: 'missing',
      headline: 'Sauvegarde requise.',
      detail: 'Des donnees locales existent sans sauvegarde exportee. Exportez un JSON maintenant avant de fermer le navigateur.'
    }
  }

  if (lastChange && snapshot.lastBackupAt < lastChange) {
    return {
      state: 'stale',
      headline: 'Sauvegarde a rafraichir.',
      detail: `Derniere sauvegarde le ${formatDate(snapshot.lastBackupAt)} mais des changements plus recents existent (${formatDate(lastChange)}). Reexportez un JSON.`
    }
  }

  return {
    state: 'current',
    headline: 'Sauvegarde a jour.',
    detail: `Derniere sauvegarde le ${formatDate(snapshot.lastBackupAt)}. Reexportez apres chaque import et a la fin de chaque session de saisie.`
  }
}
