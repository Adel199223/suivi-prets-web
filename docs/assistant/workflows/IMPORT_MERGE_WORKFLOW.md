# Import Merge Workflow

## What This Workflow Is For

Use this workflow for workbook-family parsing, preview, dedupe, anomaly review, and merge behavior.

## Expected Outputs

- Safe parser changes
- Explicit duplicate handling
- Clear anomaly reporting
- Clear user-facing preview behavior for direct `.ods` import
- Explicit local resolution guidance for rows that still cannot be inferred safely

## When To Use

- Changing `.ods` parsing
- Changing the browser-side import preview contract
- Changing row normalization
- Changing merge matching or duplicate suppression

## What Not To Do

Don't use this workflow when the task is ordinary debt or payment CRUD. Instead use `LOAN_LEDGER_WORKFLOW.md`.

## Primary Files

- `tooling/import_workbook_preview.py`
- `src/lib/importWorkbook.ts`
- `src/lib/importWorkbookOds.ts`
- `src/lib/importIssues.ts`
- `src/lib/repository.ts`
- `src/App.tsx`
- `src/app/import-page.tsx`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu.json"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run import:preview -- --input /chemin/classeur.ods --output output/private/apercu-resolu.json --resolutions output/private/resolutions.json"
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
```

## Targeted Tests

- `test/tooling/import-preview.test.ts`
- `src/lib/repository.test.ts`
- `src/App.test.tsx`

## Failure Modes and Fallback Steps

- If the parser cannot trust a row, raise an issue instead of importing it.
- If a row is ambiguous in the browser parser, block final import and show the sheet/row plainly in the app.
- If a row is still ambiguous after conservative parsing, use a local `workbook-import-resolutions-v1` file keyed by workbook fingerprint and sheet/row coordinates instead of broadening parser inference.
- If duplicate imports appear, inspect normalized signatures before changing workbook-level matching.
- If the local fallback tool and browser parser disagree, treat the shared `ImportPreview` contract as the boundary and fix the generator or parser before importing more private data.
- If the preview is confusing, keep the import conservative and show issues rather than guessing.

## Handoff Checklist

- Confirm workbook-family assumptions
- Confirm duplicate signature behavior
- Confirm anomalies are visible to the operator
- Confirm the import lands in the same visible browser session after merge
- Confirm any local resolution file matches the target workbook fingerprint and only covers intentional rows
