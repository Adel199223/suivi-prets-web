# Assistant Bridge

This bridge is shorter than `APP_KNOWLEDGE.md` and defers to it when details conflict.

## Product Shape

- French-first local debt tracker for one lender
- Borrower -> debt -> ledger-entry data model
- Dashboard, borrower page, debt page, import/backup center
- Direct workbook-family `.ods` import in the app with deterministic preview, same-session merge, dedupe, and audit trail
- Partial import with a local unresolved queue for safe-but-incomplete rows
- Python preview generation remains available as a local operator fallback
- Fingerprint-guarded local row resolutions for truly ambiguous preview rows
- Borrower and debt identities can be edited in app (name, label, notes)
- Individual ledger lines can be edited in place (amount, date, detail), including the initial opening-balance line
- User actions to delete entries, debts, or borrowers are available, with full-clear retained in Import & sauvegarde
- Local close guidance is available in-app (`Comment fermer ?`) and actual local process shutdown is done by `npm run stop:windows`
- Responsive polish is in place for desktop, tablet, and mobile layouts on the main app surfaces
- Healthy protection states are shown quietly, pending import details are compact and collapsible, and backup/export tools are now secondary to workbook import
- The recent-payments card filters the full payment history before collapsing to the newest 2 matching rows

## Primary Risks

- Incorrect balance math
- Duplicate imports
- Silent acceptance of malformed workbook rows
- Confusing local-save vs external-backup messaging
- Local-only data loss when a device/browser is reset without an exported copy
- Drift between the browser parser, the local fallback generator, and the shared preview contract.

## Recent Behavior Notes

- Imported rows missing only the month can be completed later from unresolved import cards on the debt/borrower pages, or from the dedicated import pending list.
- The explicit operation-date column prefers structured `office:date-value` dates, while period/month cells preserve rendered workbook text first.
- Resolving an entry edit updates `periodKey` only when an exact date is entered, preserving period continuity when date is intentionally left blank.
- Destructive actions show scoped impact before removal:
  - line deletion removes the line from totals
  - debt deletion removes dependent lines and pending import rows
  - borrower deletion removes the full borrower subtree
  - app-wide clear removes all local data and import sessions

## Validation Summary

- `npm test` for domain, import, repository, and UI flows
- Direct `.ods` import is the normal end-user workflow; JSON is backup/restore only
- Safe rows from a partially understood workbook can land immediately, while unresolved rows stay outside balances until resolved
- `npm run import:preview -- --input <workbook.ods> --output <preview.json>` for local workbook conversion
- `npm run import:preview -- --input <workbook.ods> --output <preview.json> --resolutions <resolutions.json>` for fingerprint-guarded local row fixes
- `npm run build` for bundle safety
- `npm run validate:ui` for repo-owned browser validation; the default path is self-contained and starts the local preview target before running Playwright
- `npm run validate:agent-docs` and `npm run validate:workspace-hygiene` for repo contracts
- Current follow-up priority after a green validation pass: run the first larger private workbook migration when the next workbook is available.
