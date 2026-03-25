# Delete Data At All Levels

## Goal

Add safe user-facing deletion flows for borrower, debt, ledger-entry, pending-import, and full local reset actions.

## Decisions Locked Up Front

- Borrower deletion cascades to debts, entries, and pending imports.
- Debt deletion cascades to entries and pending imports, but not to the borrower.
- Line deletion covers both ledger entries and pending import rows.
- Full reset uses a strong typed confirmation.
- Import-session history stays intact for targeted deletions and is removed only by full reset.

## Implementation Scope

- Extend repository helpers with cascade-aware delete operations.
- Expose delete actions in borrower, debt, pending-import, and import/backup UI.
- Keep in-memory app state coherent after deletions and avoid broken links after route-level deletions.
- Add repository and App-level tests for targeted delete flows and full reset.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`

## Docs Sync Impact

- User-visible destructive actions are being added, so assistant docs and the user guide may need a sync pass after implementation.

## Completion Notes

- Completed on 2026-03-25 after repository, UI, and validation updates.
