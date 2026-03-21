# Suivi Prets Roadmap

## Stage 1

- Bootstrap the React/Vite/TypeScript repo
- Add the full Codex harness and validators
- Define sanitized workbook fixture strategy

## Stage 2

- Ship the local borrower, debt, and ledger flows
- Add dashboard, borrower detail, debt detail, and close/reopen flows

## Stage 3

- Ship workbook import preview and merge
- Validate first private migration only after the importer is stable

## Stage 4

- Harden backups, storage persistence guidance, and operator comfort
- Finish docs sync and responsive polish

## Immediate Priorities

1. Run the first larger private workbook migration with the current preview workflow.
   The four-debt import is now replayed cleanly with zero issues, so the next real product step is to validate the import flow on a broader private workbook using the same conservative parser and local-resolution escape hatch if needed.
2. Keep the product model stable while doing the above.
   The next pass should not redesign borrower, debt, ledger, import, backup, or dedupe contracts unless a concrete correctness bug requires it.

## Next Session Anchor

Continue from `ROADMAP.md` in `/home/fa507/dev/suivi-prets-web`. The local preview-generator import flow is implemented, the direct `xlsx` dependency has been removed, the large main-bundle warning is gone, the first private four-debt import has been replayed locally with a fingerprint-guarded manual resolution and exported as a fresh private backup artifact, backup freshness plus restore confirmation are in place, and responsive polish has landed across the main surfaces. The next recommended step is to attempt the first larger private workbook migration when the next workbook is available.
