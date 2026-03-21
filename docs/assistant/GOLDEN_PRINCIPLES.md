# Golden Principles

- Keep balances derived from ledger entries, never manually cached totals.
- Prefer append-only ledger history over silent mutation of financial facts.
- Never auto-delete imported or manual ledger entries as part of dedupe.
- Treat malformed workbook rows as review items, not as valid data.
- Keep real financial files and real exports out of git.
- Keep `APP_KNOWLEDGE.md` canonical and docs updates scoped to the touched feature.
