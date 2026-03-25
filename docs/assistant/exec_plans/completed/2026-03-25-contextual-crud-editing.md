# Title

Complete contextual add/edit coverage for borrower, debt, and ledger data

## Goal

Extend the current local-first CRUD so the app can correct borrower info, debt info, and existing ledger entries without changing persistence contracts or broadening import editing.

## Decisions Locked Up Front

- Keep creation flows contextual: borrower on dashboard, debt on borrower page, payments/avances on borrower and debt pages.
- Add editing for borrower name + notes and debt label + notes.
- Add editing for existing ledger entries on the debt page only.
- Ledger entry editing covers amount, optional precise date, and detail; it does not change entry kind.
- When editing a ledger entry, a provided precise date recalculates `periodKey`; removing the date keeps the existing `periodKey`.
- Keep `signature`, `sourceRef`, `importSessionId`, and `createdAt` unchanged during ledger-entry edits.
- Do not add freeform editing for unresolved import rows in this pass.

## Implementation Scope

- Repository update operations for borrower, debt, and ledger entry records.
- Borrower page update form for borrower information.
- Debt page update form for debt information and inline ledger-entry editing.
- App wiring and flash messages for the new update handlers.
- Targeted repository and App-level tests for edit flows and balance impacts.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`

## Docs Sync Impact

- User-facing behavior changes on borrower and debt screens.
- Ask the standard Assistant Docs Sync question after implementation completes.

## Completion Notes

Completed on 2026-03-25 after contextual CRUD editing, repository updates, UI wiring, and validation coverage.
