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

1. Finish responsive polish.
   The current app shell and trust center are working, but the next UI pass should tighten mobile and tablet ergonomics without changing the data model.
2. Keep the product model stable while doing the above.
   The next pass should not redesign borrower, debt, ledger, import, backup, or dedupe contracts unless a concrete correctness bug requires it.

## Next Session Anchor

Continue from `ROADMAP.md` in `/home/fa507/dev/suivi-prets-web`. The local preview-generator import flow is implemented, the direct `xlsx` dependency has been removed, the large main-bundle warning is gone, the first private four-debt import has been reviewed locally and exported as a private backup artifact, and backup freshness plus restore confirmation are now in place. The next recommended step is responsive polish.
