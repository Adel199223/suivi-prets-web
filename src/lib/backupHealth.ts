import { formatDate } from '../domain/format'
import type { AppSnapshot, BackupHealth } from '../domain/types'
import type { StorageStatus } from './storagePersistence'

function lastDataChangeAt(snapshot: AppSnapshot): string | null {
  const stamps = [
    ...snapshot.borrowers.map((view) => view.borrower.updatedAt),
    ...snapshot.debts.map((view) => view.debt.updatedAt),
    ...snapshot.debts.flatMap((view) => view.entries.map((entry) => entry.updatedAt)),
    ...snapshot.unresolvedImports.map((entry) => entry.updatedAt),
    ...snapshot.importSessions.map((session) => session.createdAt)
  ].filter(Boolean)

  return stamps.length > 0 ? [...stamps].sort().at(-1) ?? null : null
}

export function deriveBackupHealth(snapshot: AppSnapshot, storageStatus: StorageStatus | null): BackupHealth {
  const hasLocalData =
    snapshot.borrowers.length > 0 ||
    snapshot.debts.length > 0 ||
    snapshot.importSessions.length > 0 ||
    snapshot.unresolvedImportCount > 0
  const lastChange = lastDataChangeAt(snapshot)
  const persisted = storageStatus?.persisted === true || snapshot.autoPersistResult === 'granted'
  const storageStatusKnown = storageStatus?.persisted !== null

  if (!hasLocalData) {
    return {
      state: 'empty',
      headline: 'Aucune donnée locale pour le moment.',
      detail: 'Quand vous importez ou saisissez des données, elles sont enregistrées automatiquement dans ce navigateur sur cet appareil.'
    }
  }

  if (snapshot.lastBackupAt) {
    if (lastChange && snapshot.lastBackupAt < lastChange) {
      return {
        state: 'backup_stale',
        headline: 'Données locales enregistrées. Copie de secours à rafraîchir.',
        detail: `Les données restent déjà enregistrées dans ce navigateur. Votre dernière copie de secours date du ${formatDate(snapshot.lastBackupAt)} et des changements plus récents existent (${formatDate(lastChange)}). Créez une nouvelle copie de secours avant de changer d’appareil, vider le navigateur ou conclure une grosse session.`
      }
    }

    return {
      state: 'backup_current',
      headline: 'Données protégées sur cet appareil, avec copie de secours à jour.',
      detail: `Les données sont déjà enregistrées localement dans ce navigateur. La dernière copie de secours exportée date du ${formatDate(snapshot.lastBackupAt)}.`
    }
  }

  if (persisted) {
    return {
      state: 'local_persistent',
      headline: 'Données enregistrées sur cet appareil.',
      detail:
        'Aucune action n’est requise pour continuer. Le navigateur confirme déjà le stockage persistant. Une copie de secours reste utile seulement si vous voulez protéger les données en dehors de cet appareil.'
    }
  }

  return {
    state: 'local_volatile',
    headline: 'Données déjà enregistrées sur cet appareil.',
    detail:
      snapshot.autoPersistResult === 'unsupported'
        ? 'Aucune action n’est requise pour continuer. Les données sont déjà enregistrées dans ce navigateur. Ce navigateur ne confirme simplement pas le stockage persistant. Vous pourrez créer plus tard une copie de secours si vous voulez une protection supplémentaire.'
        : snapshot.autoPersistResult === 'denied'
          ? 'Aucune action n’est requise pour continuer. Les données sont déjà enregistrées dans ce navigateur. Le stockage persistant n’a simplement pas été confirmé. Vous pourrez plus tard renforcer la protection locale ou créer une copie de secours si vous voulez une sécurité en plus.'
          : storageStatusKnown
            ? 'Aucune action n’est requise pour continuer. Les données sont déjà enregistrées dans ce navigateur. Vous pouvez plus tard renforcer la protection locale ou créer une copie de secours si vous voulez une sécurité supplémentaire.'
            : 'Aucune action n’est requise pour continuer. Les données sont déjà enregistrées dans ce navigateur. L’app vérifie encore si le navigateur confirme une protection locale renforcée.'
  }
}
