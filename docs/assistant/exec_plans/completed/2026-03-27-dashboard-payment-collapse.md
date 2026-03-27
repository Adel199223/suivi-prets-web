# Dashboard Payment Collapse

## Title

Collapse recent payments to two rows by default

## Goal

Show only the two newest payment rows by default in the dashboard recent-payments card, while keeping a simple control to reveal or hide the rest of the filtered history.

## Decisions Locked Up Front

- Keep the current payment ordering and filter logic unchanged.
- Apply the collapse only to the `Derniers paiements` card.
- Default visible count is exactly two.
- Reset the disclosure to collapsed whenever the payment filter changes.

## Implementation Scope

- Add local expansion state in the dashboard payments card.
- Render the first two filtered rows by default, or all rows when expanded.
- Show `Voir les autres paiements (N)` only when more than two filtered rows exist.
- Show `Masquer le reste` when expanded.
- Add dashboard tests for default collapse, expand/collapse behavior, filter reset, and the no-disclosure case.
- Add only minimal CSS for disclosure spacing.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`
- `npm run validate:agent-docs`

## Docs Sync Impact

- No docs changes expected.

## Completion Notes

- Move this plan to `completed/` after validation passes.
