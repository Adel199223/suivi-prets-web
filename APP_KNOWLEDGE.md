# Suivi Prets Canonical Brief

## Product Summary

Suivi Prets is a local-first debt tracking app for one lender. It keeps borrowers, debts, ledger entries, workbook imports, and JSON backups inside the browser with no backend, no auth, and no cloud sync.

The product is designed around fast daily money tracking:

- one borrower can have multiple debts
- one debt can receive opening balances, extra advances, payments, and manual adjustments
- balances, monthly summaries, and annual rollups are derived from ledger entries
- workbook imports can merge new data from the current `.ods` family without duplicating already imported entries

## Current Status

- Standalone React/Vite app is implemented.
- Local Dexie persistence is implemented.
- Dashboard, borrower view, debt view, and import/backup center are implemented.
- JSON export, restore confirmation, and backup freshness guidance are implemented.
- WSL-local `.ods` preview generation and app-side preview JSON merge are implemented.
- Docs harness, validators, and browser validation harness are implemented.
- The first private four-debt import has been executed locally via an ignored preview artifact and exported backup.
- `npm test`, `npm run lint`, `npm run build`, `npm run validate:agent-docs`, `npm run validate:workspace-hygiene`, and `npm run validate:ui` are passing.

## Tech Stack

- React 19
- Vite 8
- TypeScript 5
- Dexie for IndexedDB
- Python 3 standard-library ODS preview generator for local workbook parsing
- Vitest + Testing Library for tests
- Playwright for repo-owned browser validation

## Runtime Model

- App shell and routing: `src/App.tsx`
- Shared UI pages: `src/app/`
- Shared presentational components: `src/components/`
- Domain rules and importer logic: `src/domain/`
- Persistence and backup helpers: `src/lib/`
- Repo-owned validation harnesses: `tooling/`

## Core Data Model

- `Borrower`: person or household that owes money
- `Debt`: one labeled debt under a borrower
- `LedgerEntry`: `opening_balance`, `advance`, `payment`, or `adjustment`
- `ImportSession`: audit trail for a workbook import attempt
- `AppBackupV1`: portable JSON backup of the local dataset

All monetary values are stored in integer euro cents.

## Product Behavior

- `opening_balance` and `advance` increase outstanding balance
- `payment` decreases outstanding balance
- `adjustment` is signed and can move balance up or down
- a debt can be closed and reopened without deleting ledger history
- borrower and dashboard totals are always derived, never hand-entered summaries

## Workbook Import Model

- Imports stay local and never upload files anywhere.
- `tooling/import_workbook_preview.py` converts a workbook-family `.ods` file into a versioned `workbook-import-preview-v1` JSON artifact.
- The app imports that preview artifact instead of parsing raw workbooks in the browser.
- The importer targets the existing workbook family, not arbitrary spreadsheets.
- It reads real operation rows from the detail columns and uses summary-side values only when the detail side is missing.
- Annual total rows, placeholder rows, and blank rows are ignored.
- Repeated imports dedupe by normalized entry signature instead of workbook hash alone.
- Merge results are recorded in `ImportSession`.

## Persistence Model

Persistence is local-first through IndexedDB via Dexie.

Current stores:

- `borrowers`
- `debts`
- `entries`
- `imports`
- `meta`

## Validation Commands

Use WSL-safe wrappers from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu.json"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"
```

## Known Constraints

- This is a single-user local-first app for v1.
- There is no borrower portal, bank sync, or multi-device sync.
- Data safety depends on backups and the browser storage policy.
- Real workbook files, generated preview artifacts, and private imported backups must stay out of git.
- Raw workbook parsing no longer ships in the main client bundle.
- The next recommended product step is responsive polish and UI comfort improvements.
