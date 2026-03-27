# Title

Stabilize debt-history layout with a hybrid desktop rail

## Goal

Fix the debt-page history panel so labels, values, and action buttons remain readable at the real split-panel desktop width, while preserving the earlier payment-history and import fixes and tightening UI validation so this overlap cannot silently pass again.

## Decisions Locked Up Front

- Keep all ledger, import, repository, and persistence behavior unchanged.
- Use a debt-page-specific hybrid desktop layout instead of horizontal scrolling or an early full-card fallback.
- Keep the yearly summary beside the history panel on desktop.
- Scope layout changes to the debt-page history surface instead of widening shared table rules unless a directly adjacent regression requires it.
- Strengthen `validate:ui` with a real non-overlap assertion for the debt history row.

## Implementation Scope

- Add a dedicated split-layout variant for the lower debt-page section so the history panel gets more width than the yearly summary.
- Replace the six top-level history columns with a hybrid structure: `Type`, `Détail`, `Infos`, and `Actions`, where `Infos` contains labeled `Date`, `Période`, and `Montant` values.
- Keep stacked actions and the existing mobile/card fallback.
- Update UI validation selectors and checks to assert that debt-history blocks do not overlap when a long detail is present.

## Validation Plan

- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"`

## Docs Sync Impact

- No docs sync planned unless the debt-history presentation text changes materially.

## Completion Notes

- Reworked the debt-page history into a hybrid `Type` / `Détail` / `Infos` / `Actions` desktop rail while keeping the existing mobile fallback.
- Scoped the layout rules to the debt history surface and widened the lower debt-page split toward the history panel without changing ledger/import behavior.
- Strengthened `validate:ui` so the debt-history header and first row now fail when horizontal overlap is detected.
- Validation passed with `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"`, `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"`, and `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"`.
- Move this plan to `docs/assistant/exec_plans/completed/` after implementation and validation are complete.
