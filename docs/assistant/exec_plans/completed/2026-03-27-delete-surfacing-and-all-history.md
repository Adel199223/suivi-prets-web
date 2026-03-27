# Delete Surfacing And All-History Dashboard

## Title

Fix borrower/debt deletion surfacing and add all-history dashboard filters

## Goal

Make debt deletion available directly from the borrower page debt cards, make borrower deletion available directly from the dashboard borrower list, and let the dashboard show active and settled history together by default.

## Decisions Locked Up Front

- Keep repository delete behavior unchanged.
- Keep contextual menus as the delete affordance.
- Change dashboard filter state from binary to tri-state: `all`, `active`, `settled`.
- Default both dashboard history cards to `all`.

## Implementation Scope

- Wire `onDeleteDebt` from `App.tsx` into `BorrowerPage`.
- Add a debt-card `PageActionsMenu` with `Supprimer cette dette`.
- Refactor dashboard borrower rows into a non-link container with a primary `Link` plus a borrower actions menu.
- Add borrower dashboard delete wiring through the existing App-level delete handler.
- Update borrower and payment dashboard filters, counts, and empty states for `all/active/settled`.
- Adjust styles for the new borrower row structure and debt-card actions menu placement.
- Extend `src/App.test.tsx` for the new delete surfaces and the new default/filter behavior.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`
- `npm run validate:agent-docs`

## Docs Sync Impact

- No user-guide wording change expected unless validation reveals UI copy drift.

## Completion Notes

- Move this plan to `completed/` after implementation and validation.
