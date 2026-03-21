# Title

Make `.ods` import the primary in-app workflow

## Goal

Replace the user-facing JSON preview import path with a direct `.ods` workflow inside the app so the operator can choose a workbook, review a deterministic preview, confirm the merge, and immediately see the imported borrowers and debts in the same browser session.

## Decisions Locked Up Front

- Keep the borrower -> debt -> ledger model unchanged
- Keep duplicate suppression and source-key merge rules unchanged
- Support `.ods` first and do not reintroduce `xlsx`
- Keep JSON only for backup export and backup restore
- Block final import whenever the workbook still contains ambiguous rows
- Lazy-load workbook parsing so the main dashboard chunk does not absorb the parser again

## Implementation Scope

- Add a browser-side `.ods` parser that produces the existing `WorkbookImportPreviewV1` / `ImportPreview` contract
- Switch the import page from “upload preview JSON” to “upload workbook `.ods`”
- Keep a visible preview step and disable or block merge when issues are present
- Make successful import land in the same visible app session and route the user back to the dashboard
- Separate spreadsheet import copy from JSON backup/restore copy so the product intent is clear
- Add targeted parser and app tests for direct `.ods` import, duplicate-safe merge, and blocking ambiguity

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`

## Docs Sync Impact

- Update canonical and assistant docs after implementation so they describe direct `.ods` import as the primary workflow and JSON as backup/restore only

## Completion Notes

Start from `main` after the responsive polish, backup hardening, and private import replay work is already pushed. The current app still expects a preview JSON file from the operator; this pass should remove that confusion without changing storage contracts or import merge semantics.
