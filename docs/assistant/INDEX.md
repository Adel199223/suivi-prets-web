# Assistant Index

## Use When

- `APP_KNOWLEDGE.md`
  Use when you need canonical architecture or current-state truth.
- `docs/assistant/LOCAL_PERSISTENCE_KNOWLEDGE.md`
  Use when changing IndexedDB stores, backups, import sessions, or portability.
- `docs/assistant/workflows/LOAN_LEDGER_WORKFLOW.md`
  Use when changing borrower, debt, payment, advance, adjustment, close, or reopen behavior.
- `docs/assistant/workflows/IMPORT_MERGE_WORKFLOW.md`
  Use when changing the local preview generator, preview artifact contract, dedupe, or merge logic.
- `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`
  Use when changing top-level UI, responsive layout, or browser validation behavior.
- `docs/assistant/workflows/PROJECT_HARNESS_SYNC_WORKFLOW.md`
  Use when changing bootstrap profile, output mappings, runtime bootstrap state, or repo-local harness sync behavior.
- `docs/assistant/features/APP_USER_GUIDE.md`
  Use for support or plain-language explanation tasks.

## Notes

- `APP_KNOWLEDGE.md` remains canonical.
- Source code wins when docs drift.
- For named-product inspiration or parity, run `REFERENCE_DISCOVERY_WORKFLOW.md` before implementation decisions.
- Bootstrap profile/state work routes through `PROJECT_HARNESS_SYNC_WORKFLOW.md`.
