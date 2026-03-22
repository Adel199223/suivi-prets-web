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
      headline: 'Aucune donnee locale pour le moment.',
      detail: 'Quand vous importez ou saisissez des donnees, elles sont enregistrees automatiquement dans ce navigateur sur cet appareil.'
    }
  }

  if (snapshot.lastBackupAt) {
    if (lastChange && snapshot.lastBackupAt < lastChange) {
      return {
        state: 'backup_stale',
        headline: 'Donnees locales enregistrees. Copie de secours a rafraichir.',
        detail: `Les donnees restent deja enregistrees dans ce navigateur. Votre derniere copie de secours date du ${formatDate(snapshot.lastBackupAt)} et des changements plus recents existent (${formatDate(lastChange)}). Creez une nouvelle copie de secours avant de changer d’appareil, vider le navigateur ou conclure une grosse session.`
      }
    }

    return {
      state: 'backup_current',
      headline: 'Donnees protegees sur cet appareil, avec copie de secours a jour.',
      detail: `Les donnees sont deja enregistrees localement dans ce navigateur. La derniere copie de secours exportee date du ${formatDate(snapshot.lastBackupAt)}.`
    }
  }

  if (persisted) {
    return {
      state: 'local_persistent',
      headline: 'Donnees enregistrees sur cet appareil.',
      detail:
        'Aucune action n’est requise pour continuer. Le navigateur confirme deja le stockage persistant. Une copie de secours reste utile seulement si vous voulez proteger les donnees en dehors de cet appareil.'
    }
  }

  return {
    state: 'local_volatile',
    headline: 'Donnees deja enregistrees sur cet appareil.',
    detail:
      snapshot.autoPersistResult === 'unsupported'
        ? 'Aucune action n’est requise pour continuer. Les donnees sont deja enregistrees dans ce navigateur. Ce navigateur ne confirme simplement pas le stockage persistant. Vous pourrez creer plus tard une copie de secours si vous voulez une protection supplementaire.'
        : snapshot.autoPersistResult === 'denied'
          ? 'Aucune action n’est requise pour continuer. Les donnees sont deja enregistrees dans ce navigateur. Le stockage persistant n’a simplement pas ete confirme. Vous pourrez plus tard renforcer la protection locale ou creer une copie de secours si vous voulez une securite en plus.'
          : storageStatusKnown
            ? 'Aucune action n’est requise pour continuer. Les donnees sont deja enregistrees dans ce navigateur. Vous pouvez plus tard renforcer la protection locale ou creer une copie de secours si vous voulez une securite supplementaire.'
            : 'Aucune action n’est requise pour continuer. Les donnees sont deja enregistrees dans ce navigateur. L’app verifie encore si le navigateur confirme une protection locale renforcee.'
  }
}
