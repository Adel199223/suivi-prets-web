import { formatMoney } from '../domain/format'
import type { UnresolvedImportRecord } from '../domain/types'

interface PendingImportResolutionCardProps {
  item: UnresolvedImportRecord
  periodKey: string
  error: string | null
  onChangePeriodKey: (unresolvedImportId: string, periodKey: string) => void
  onResolve: (unresolvedImportId: string) => Promise<void> | void
  showFileName?: boolean
}

export function PendingImportResolutionCard({
  item,
  periodKey,
  error,
  onChangePeriodKey,
  onResolve,
  showFileName = false
}: PendingImportResolutionCardProps) {
  return (
    <article className="resolution-row">
      <div>
        <strong>
          {item.borrowerName} · {item.debtLabel}
        </strong>
        <p>
          {formatMoney(item.amountCents)} · {item.sheetName} · ligne {item.rowNumber}
        </p>
        <p>{item.reasonMessage}</p>
        <p className="section-note">Cette ligne attend seulement son mois/periode avant d’entrer dans les totaux.</p>
        {showFileName ? <p className="section-note">Fichier source: {item.fileName}</p> : null}
      </div>
      <label className="resolution-input">
        Mois a appliquer
        <input
          aria-label={`Mois a appliquer pour ${item.sheetName} ligne ${item.rowNumber}`}
          type="month"
          value={periodKey}
          onChange={(event) => onChangePeriodKey(item.id, event.currentTarget.value)}
        />
      </label>
      {error ? <p className="inline-error">{error}</p> : null}
      <button type="button" className="secondary-button" onClick={() => void onResolve(item.id)}>
        Ajouter cette ligne a la dette
      </button>
    </article>
  )
}
