# Title

Clean up dashboard, pending import, and backup UX

## Goal

Make the app feel calmer and more task-focused by hiding healthy protection states, reducing duplicated import feedback, compacting unresolved-import messaging, and pushing optional backup/export tools behind a lighter advanced surface.

## Decisions Locked Up Front

- Keep the borrower -> debt -> ledger model unchanged
- Keep `.ods` import, unresolved queue behavior, and autosave behavior unchanged
- Treat healthy protection states as quiet UI, not full attention panels
- Use compact summary + expandable details for pending imported lines
- Keep export/restore in the product, but collapse it behind an optional “copie de secours” surface
- Limit this pass to UI hierarchy, copy, interaction density, and visual cleanup

## Implementation Scope

- Hide the large dashboard protection panel for healthy states and replace it with a compact reassurance row or chip near the hero/import outcome area
- Consolidate dashboard import feedback so the top flash is not duplicating the main import summary card
- Turn dashboard, borrower, and debt pending-import surfaces into compact summaries with expandable details and clear resolve actions
- Demote Import-page backup/export controls into a collapsed optional advanced section, while keeping workbook import and pending resolution primary
- Lighten borrower empty notes, tighten debt creation, and replace always-open debt action forms with on-demand composers
- Reduce empty-state visual bulk for debt timeline and annual summary panels

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:workspace-hygiene`
- `npm run validate:ui`
- Real-browser seeded partial-import replay capturing dashboard, borrower, debt, and import surfaces after the cleanup

## Docs Sync Impact

- Update canonical and assistant docs to reflect the quieter protection UI, the optional advanced backup section, and the compact pending-import presentation

## Completion Notes

- Implemented. Healthy protection states are now compact and quiet, dashboard import feedback is consolidated, pending imported lines use summary + disclosure patterns across dashboard/borrower/debt views, import-page backup/export tools are collapsed behind an optional advanced section, and borrower/debt forms are lighter with on-demand composers.
