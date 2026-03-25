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
- Mobile and tablet responsive polish has been applied across the app shell, debt surfaces, and trust center layouts.
- JSON export, restore confirmation, and backup freshness guidance are implemented.
- Direct in-app `.ods` import with deterministic preview and same-session merge is implemented.
- Partial `.ods` import is implemented: safe rows land immediately, while unresolved-but-queueable rows stay in a local pending queue until their month is completed.
- Dashboard, borrower, debt, and import surfaces now use calmer UX: healthy protection states are compact, pending-import details are collapsed by default, and backup/export tools are demoted behind an optional advanced section.
- The WSL-local `.ods` preview generator remains available as an operator fallback for fixtures, regression checks, and exceptional private review work.
- Fingerprint-guarded local resolution files can patch truly ambiguous workbook rows before preview generation.
- Docs harness, validators, and a self-contained browser validation harness are implemented.
- The first private four-debt import has been executed locally, replayed with a zero-issue resolved preview, and exported as a fresh private backup.
- `npm test`, `npm run lint`, `npm run build`, `npm run validate:agent-docs`, `npm run validate:workspace-hygiene`, and `npm run validate:ui` are passing.

## Tech Stack

- React 19
- Vite 8
- TypeScript 5
- Dexie for IndexedDB
- `fflate` plus browser XML parsing for lazy-loaded in-app `.ods` analysis
- Python 3 standard-library ODS preview generator for local fallback parsing
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
- `AppBackupV2`: portable JSON backup of the local dataset, including unresolved queued import rows

All monetary values are stored in integer euro cents.

## Product Behavior

- `opening_balance` and `advance` increase outstanding balance
- `payment` decreases outstanding balance
- `adjustment` is signed and can move balance up or down
- a debt can be closed and reopened without deleting ledger history
- borrower and dashboard totals are always derived, never hand-entered summaries

## Workbook Import Model

- Imports stay local and never upload files anywhere.
- The primary user flow is: choose a workbook-family `.ods` file in the app, review the deterministic preview, then merge into the same browser session.
- The browser parser produces the existing `workbook-import-preview-v1` shape internally so repository merge and dedupe rules stay stable.
- JSON is for backup export and backup restore only. It is not the primary end-user import format.
- `tooling/import_workbook_preview.py` still converts a workbook-family `.ods` file into a versioned `workbook-import-preview-v1` JSON artifact for operator fallback use.
- When a row is truly ambiguous, the preview generator can also consume a local `workbook-import-resolutions-v1` file keyed by workbook fingerprint and sheet/row location.
- The importer targets the existing workbook family, not arbitrary spreadsheets.
- It reads real operation rows from the detail columns and uses summary-side values only when the detail side is missing.
- Annual total rows, placeholder rows, and blank rows are ignored.
- Continuation rows can inherit the previous resolved period only when the workbook structure makes that relationship explicit.
- Non-`dette_*` sheets are ignored and treated as informational, not blocking.
- If a row is missing only its month but the borrower, debt, amount, and kind are still safe, the app imports the trustworthy rows now and stores that one row in a local unresolved queue instead of guessing.
- Queued unresolved rows stay visible on the dashboard, borrower page, debt page, and import page, but they do not affect balances, timelines, or annual summaries until resolved.
- Hard parser failures or malformed rows still block import completely.
- Repeated imports dedupe by normalized entry signature instead of workbook hash alone.
- Merge results are recorded in `ImportSession`.

## Persistence Model

Persistence is local-first through IndexedDB via Dexie.

Current stores:

- `borrowers`
- `debts`
- `entries`
- `imports`
- `unresolvedImports`
- `meta`

## Validation Commands

Use WSL-safe wrappers from this environment:

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu.json"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu-resolu.json --resolutions output/private/resolutions.json"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run lint"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"
```

`npm run validate:ui` now owns its local setup: by default it builds the app, starts the preview server on `http://127.0.0.1:4173`, waits for readiness, and writes artifacts under `output/playwright/`. Pass `--base-url` only when you intentionally want to reuse an already running target.

## Known Constraints

- This is a single-user local-first app for v1.
- There is no borrower portal, bank sync, or multi-device sync.
- Data is autosaved locally in the current browser on the current device; exported backups are optional portable copies for device changes, browser resets, and larger recovery moments.
- Real workbook files, generated preview artifacts, and private imported backups must stay out of git.
- Raw workbook parsing no longer ships in the main client bundle.
- Local resolution files are an operator escape hatch for ambiguous rows, not the normal end-user workflow and not a replacement for conservative parser rules.
- Healthy protection states are intentionally quiet in the UI; the full attention panel is reserved for clearly actionable states such as a stale exported backup.
- The next recommended product step is to run a larger private workbook migration with the current direct `.ods` import workflow when the next workbook is available.
