# Title

Suivi Prets v1 foundation

## Goal

Stand up a local-first debt tracker with a stable data model, assistant harness, safer workbook-family import, and backup flows.

## Decisions Locked Up Front

- New repo at `/home/fa507/dev/suivi-prets-web`
- French-first UI
- Local-only IndexedDB persistence via Dexie
- Workbook-family `.ods` import, not generic spreadsheet mapping
- Replace browser-side `xlsx` parsing with a WSL-local preview generator that emits a versioned JSON preview artifact
- Keep borrower -> debt -> ledger, dedupe signatures, import sessions, and backup contracts stable during the import hardening pass
- Real workbook files stay out of git

## Implementation Scope

- Repo bootstrap, docs harness, validators, and browser validation harness
- Borrower, debt, ledger, dashboard, and close or reopen flows
- Replace the direct browser workbook parser with a repo-owned preview generation tool
- Import preview, dedupe, merge, anomaly review, and import audit sessions
- JSON export and replace-from-backup flows
- Initial public repository creation, first push, and clean local/remote verification

## Validation Plan

- `npm run import:preview -- --input <fixture.ods> --output <preview.json>`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm audit --json`
- `npm run validate:agent-docs`
- `npm run validate:workspace-hygiene`
- `npm run validate:ui`

## Docs Sync Impact

- Update canonical docs, bridge docs, workflows, and user guides only for touched scope
- Move this ExecPlan to `docs/assistant/exec_plans/completed/` after implementation and docs sync land

## Completion Notes

Completed on 2026-03-21 with the vulnerable browser-side `xlsx` path removed, a WSL-local preview generator in place, the main bundle warning cleared, and the first private four-debt import reviewed locally via ignored preview and backup artifacts. The next recommended follow-up after repo publication is backup hardening and clearer operator guidance.
