# Title

Pending import completion and settled-history dashboard improvements

## Goal

Let users resolve month-missing pending import lines directly from borrower and debt pages, show row-local validation when a month is missing, and make settled borrower/payment history discoverable from the dashboard without changing persistence or balance rules.

## Decisions Locked Up Front

- Keep the import queue model, repository contracts, and balance math unchanged.
- Reuse one shared pending-resolution UI across import, borrower, and debt surfaces.
- Treat missing-month submission as row-local validation, not a top-level flash error.
- Keep dashboard history calm by default with explicit local filters for settled borrowers and settled-debt payments.
- Make the last import summary collapsible and reopenable within the current app session instead of permanently dismissing it.

## Implementation Scope

- Add a shared pending-import resolution card component with a month input, inline error state, and resolve action.
- Extend `App.tsx` to own shared pending-resolution drafts/errors plus import-summary collapsed state.
- Update borrower and debt pending-import sections to resolve lines inline while keeping the import-page fallback link.
- Update the import page queue to use row-local validation and clearer missing-month copy.
- Update the dashboard to add settled-history filters for borrowers and payments, enrich payment rows with borrower/debt context, and allow reopening a collapsed import summary.
- Keep persistence, import preview, backup, dedupe, and schema contracts unchanged.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`

## Docs Sync Impact

- Assistant docs may need a follow-up sync because dashboard behavior and pending-import UX become more capable, but no docs are changed in this implementation pass.

## Completion Notes

- Completed on 2026-03-25.
- Added a shared pending-resolution card so month-missing import lines can now be completed from borrower, debt, and import pages with identical controls.
- Missing-month submission now shows row-local validation instead of failing silently behind the global flash banner.
- The dashboard now offers explicit active/settled filters for borrowers and recent payments, and payment rows include borrower and debt context.
- The latest import summary can now be collapsed and reopened during the same app session instead of being dismissed permanently.
- Validation passed with `npm test`, `npm run lint`, `npm run build`, and `npm run validate:ui`.
