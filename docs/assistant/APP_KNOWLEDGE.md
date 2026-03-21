# Assistant Bridge

This bridge is shorter than `APP_KNOWLEDGE.md` and defers to it when details conflict.

## Product Shape

- French-first local debt tracker for one lender
- Borrower -> debt -> ledger-entry data model
- Dashboard, borrower page, debt page, import/backup center
- Workbook-family `.ods` import with dedupe and audit trail

## Primary Risks

- Incorrect balance math
- Duplicate imports
- Silent acceptance of malformed workbook rows
- Local-only data loss when backups are neglected
- Import safety is currently gated by a high-severity `xlsx` audit finding.
- Import parsing is also contributing to a large main client bundle.

## Validation Summary

- `npm test` for domain, import, repository, and UI flows
- `npm run build` for bundle safety
- `npm run validate:ui` for repo-owned browser validation
- `npm run validate:agent-docs` and `npm run validate:workspace-hygiene` for repo contracts
- Current follow-up priority after a green validation pass: replace or isolate `xlsx`, then lazy-load the import surface to reduce the main bundle.
