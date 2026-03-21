# Import Merge Workflow

## What This Workflow Is For

Use this workflow for workbook-family parsing, preview, dedupe, anomaly review, and merge behavior.

## Expected Outputs

- Safe parser changes
- Explicit duplicate handling
- Clear anomaly reporting

## When To Use

- Changing `.ods` parsing
- Changing row normalization
- Changing merge matching or duplicate suppression

## What Not To Do

Don't use this workflow when the task is ordinary debt or payment CRUD. Instead use `LOAN_LEDGER_WORKFLOW.md`.

## Primary Files

- `src/domain/importWorkbook.ts`
- `src/lib/repository.ts`
- `src/App.tsx`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
```

## Targeted Tests

- `src/domain/importWorkbook.test.ts`
- `src/App.test.tsx`

## Failure Modes and Fallback Steps

- If the parser cannot trust a row, raise an issue instead of importing it.
- If duplicate imports appear, inspect normalized signatures before changing workbook-level matching.
- If the preview is confusing, keep the import conservative and show issues rather than guessing.

## Handoff Checklist

- Confirm workbook-family assumptions
- Confirm duplicate signature behavior
- Confirm anomalies are visible to the operator
