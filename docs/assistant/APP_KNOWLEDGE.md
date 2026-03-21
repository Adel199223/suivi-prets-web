# Assistant Bridge

This bridge is shorter than `APP_KNOWLEDGE.md` and defers to it when details conflict.

## Product Shape

- French-first local debt tracker for one lender
- Borrower -> debt -> ledger-entry data model
- Dashboard, borrower page, debt page, import/backup center
- Direct workbook-family `.ods` import in the app with deterministic preview, same-session merge, dedupe, and audit trail
- Python preview generation remains available as a local operator fallback
- Fingerprint-guarded local row resolutions for truly ambiguous preview rows
- Responsive polish is in place for desktop, tablet, and mobile layouts on the main app surfaces

## Primary Risks

- Incorrect balance math
- Duplicate imports
- Silent acceptance of malformed workbook rows
- Local-only data loss when backups are neglected
- Drift between the browser parser, the local fallback generator, and the shared preview contract.

## Validation Summary

- `npm test` for domain, import, repository, and UI flows
- Direct `.ods` import is the normal end-user workflow; JSON is backup/restore only
- `npm run import:preview -- --input <workbook.ods> --output <preview.json>` for local workbook conversion
- `npm run import:preview -- --input <workbook.ods> --output <preview.json> --resolutions <resolutions.json>` for fingerprint-guarded local row fixes
- `npm run build` for bundle safety
- `npm run validate:ui` for repo-owned browser validation
- `npm run validate:agent-docs` and `npm run validate:workspace-hygiene` for repo contracts
- Current follow-up priority after a green validation pass: run the first larger private workbook migration when the next workbook is available.
