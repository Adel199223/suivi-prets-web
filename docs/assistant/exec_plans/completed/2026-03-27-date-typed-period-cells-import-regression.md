# Title

Fix date-typed period-cell import regression

## Goal

Restore safe month extraction for workbook-family period cells that LibreOffice stores as structured dates, while keeping precise `occurredOn` parsing for the explicit operation-date column in both the browser parser and the Python fallback preview tool.

## Decisions Locked Up Front

- Keep the fix column-aware instead of broadening the preview contract.
- Treat column index `1` as the period/month source and column index `6` as the explicit operation-date source.
- Prefer rendered text for period cells and other non-date columns so workbook-family month labels like `XX/03/2026` remain parseable.
- Prefer `office:date-value` only for the explicit operation-date column when present.
- Keep `ImportPreview`, preview JSON, repository merge behavior, and UI contracts unchanged.

## Implementation Scope

- Update `src/lib/importWorkbookOds.ts` so ODS cell extraction depends on the target column.
- Update `tooling/import_workbook_preview.py` with the same column-aware extraction rule to preserve parser parity.
- Add focused regression coverage in `src/lib/importWorkbook.test.ts` for:
  - structured operation-date cells with localized rendered text
  - date-typed period cells on detailed rows with no detail date
  - date-typed period cells on summary-only payment rows
- Mirror the same regression coverage in `test/tooling/import-preview.test.ts`.

## Validation Plan

- `npm test -- src/lib/importWorkbook.test.ts test/tooling/import-preview.test.ts`
- `npm test`

## Docs Sync Impact

- No product-doc update is expected because this change restores an internal import behavior regression without changing the user-facing workflow or contracts.

## Completion Notes

- Made ODS cell extraction column-aware in both parsers:
  - the explicit operation-date column keeps preferring `office:date-value`
  - period/month cells and other columns keep their rendered text first
- Added matching browser-parser and Python-tool regression coverage for:
  - structured operation-date cells with localized rendered text
  - detailed rows whose period cell is stored as a structured date
  - summary-only payment rows whose period cell is stored as a structured date
- Validation passed with:
  - `npm test -- src/lib/importWorkbook.test.ts test/tooling/import-preview.test.ts`
  - `npm test`
  - `npm run build`
