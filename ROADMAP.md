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

1. Replace or isolate the direct `xlsx` dependency before importing real private workbooks.
   `npm audit` currently reports one high-severity advisory path against `xlsx`, and `fixAvailable` is currently `false`, so the next session should evaluate safer parser options or a stronger containment strategy before the first private migration.
2. Reduce the main client bundle size.
   `npm run build` passes, but Vite warns that the main bundle is large because workbook parsing ships in the main client chunk. The next pass should code-split the import surface or move the parser behind a lazy boundary.
3. After the parser dependency decision is settled, run the first private import of the four-debt sample locally and review the merged data before using the larger full workbook.
4. Keep the product model stable while doing the above.
   The next pass should not redesign borrower, debt, ledger, backup, or dedupe contracts unless one of the priority issues proves that change is necessary.

## Next Session Anchor

Continue from `ROADMAP.md` and `docs/assistant/exec_plans/active/2026-03-20-v1-foundation.md` in `/home/fa507/dev/suivi-prets-web`. The app shell, local ledger flows, backup flows, workbook-family preview importer, and validation harness are implemented and passing. Before importing real private workbook data, first address the high-severity `xlsx` audit issue or choose a safer import strategy, then reduce the large client bundle warning caused by shipping workbook parsing in the main chunk, and only then run the first private four-debt import without redesigning the core borrower -> debt -> ledger model.
