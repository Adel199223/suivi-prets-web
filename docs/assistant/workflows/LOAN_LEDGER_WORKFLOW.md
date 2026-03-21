# Loan Ledger Workflow

## What This Workflow Is For

Use this workflow for borrower, debt, payment, advance, adjustment, balance, status, and summary behavior.

## Expected Outputs

- Clear balance-impact rules
- Targeted code changes in domain or repository layers
- Updated UI only where the financial behavior changed

## When To Use

- Adding or editing debt flows
- Changing balance math
- Changing close or reopen behavior

## What Not To Do

Don't use this workflow when the main task is workbook parsing or merge logic. Instead use `IMPORT_MERGE_WORKFLOW.md`.

## Primary Files

- `src/domain/ledger.ts`
- `src/lib/repository.ts`
- `src/App.tsx`

## Minimal Commands

```powershell
wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"
```

## Targeted Tests

- `src/domain/ledger.test.ts`
- `src/App.test.tsx`

## Failure Modes and Fallback Steps

- If balances look wrong, verify signed entry impact first.
- If closed debts still mutate incorrectly, verify repository update flows.
- If UI looks wrong while tests pass, run `npm run validate:ui`.

## Handoff Checklist

- Confirm balance rules
- Confirm affected tests
- Confirm no manual totals were introduced
