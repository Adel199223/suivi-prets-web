# Assistant Bridge

This bridge is shorter than `APP_KNOWLEDGE.md` and defers to it when details conflict.

## Product Shape

- French-first local debt tracker for one lender
- Borrower -> debt -> ledger-entry data model
- Dashboard, borrower page, debt page, import/backup center
- Workbook-family `.ods` preview generation plus preview JSON merge with dedupe and audit trail

## Primary Risks

- Incorrect balance math
- Duplicate imports
- Silent acceptance of malformed workbook rows
- Local-only data loss when backups are neglected
- Drift between the local preview generator and the app-side preview contract.

## Validation Summary

- `npm test` for domain, import, repository, and UI flows
- `npm run import:preview -- --input <workbook.ods> --output <preview.json>` for local workbook conversion
- `npm run build` for bundle safety
- `npm run validate:ui` for repo-owned browser validation
- `npm run validate:agent-docs` and `npm run validate:workspace-hygiene` for repo contracts
- Current follow-up priority after a green validation pass: harden backups and restore guidance.
