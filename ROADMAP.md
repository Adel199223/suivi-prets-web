# Suivi Prets Roadmap

## Stage 1

- Bootstrap the React/Vite/TypeScript repo
- Add the full Codex harness and validators
- Define sanitized workbook fixture strategy

## Stage 2

- Ship the local borrower, debt, and ledger flows
- Add dashboard, borrower detail, debt detail, and close/reopen flows

## Stage 3

- Ship direct `.ods` import preview and merge in-app
- Validate first private migration only after the importer is stable

## Stage 4

- Harden backups, storage persistence guidance, and operator comfort
- Finish docs sync, responsive polish, and the calmer dashboard/import UX pass

## Immediate Priorities

1. Run the first larger private workbook migration with the current preview workflow.
   The four-debt import is now replayed cleanly with zero issues, and the app can now parse `.ods` workbooks directly in-browser, so the next real product step is to validate that broader migration flow on a larger private workbook using the same conservative parser and local-resolution escape hatch if needed.
2. Keep the product model stable while doing the above.
   The next pass should not redesign borrower, debt, ledger, import, backup, or dedupe contracts unless a concrete correctness bug requires it.

## Next Session Anchor

Continue from `ROADMAP.md` in `/home/fa507/dev/suivi-prets-web`. Direct in-app `.ods` import with deterministic preview and same-session merge is now implemented, the direct `xlsx` dependency has been removed, workbook parsing is lazy-loaded outside the main chunk, partial import plus unresolved local queue are in place, the app now treats local saves as automatic and keeps backup/export tools optional, and the dashboard / borrower / debt / import surfaces have been visually simplified around the real daily workflow. The next recommended step is to attempt the first larger private workbook migration when the next workbook is available.
