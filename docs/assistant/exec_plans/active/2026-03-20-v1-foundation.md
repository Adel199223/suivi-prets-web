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

Continue from `ROADMAP.md` and `docs/assistant/exec_plans/active/2026-03-20-v1-foundation.md` in `/home/fa507/dev/suivi-prets-web`. The app shell, local ledger flows, backup flows, workbook-family preview importer, and validation harness are implemented and passing. The current pass replaces the vulnerable browser-side `xlsx` path with a WSL-local preview generator, removes workbook parsing from the main client bundle, runs the first private four-debt import via an ignored preview artifact, makes an implementation commit, performs Assistant docs sync and a docs commit, creates the public GitHub repository, pushes `main`, verifies both local and remote cleanliness, and then continues with backup hardening.
