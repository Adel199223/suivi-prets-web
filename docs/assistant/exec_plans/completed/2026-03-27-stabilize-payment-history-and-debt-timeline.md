# Title

Stabilize payment-history visibility, ODS payment dates, and debt timeline layout

## Goal

Make imported payments keep their real chronology, make the dashboard payment filters reflect the full payment history instead of a pre-truncated subset, and restore a readable debt timeline layout on desktop/tablet/mobile.

## Decisions Locked Up Front

- Keep Dexie storage and repository contracts unchanged; no migration work.
- Add `paymentHistory` to the derived snapshot as the full sorted payment stream.
- Keep `recentPayments` only as a compatibility subset while the dashboard switches to `paymentHistory`.
- The dashboard payment card remains a chronological activity feed, not a “one row per debt” summary.
- `Tous`, `Dettes encore ouvertes`, and `Dettes soldées` must filter against the full payment history, then keep the existing two-row collapsed presentation.
- ODS parsing should prefer exact `office:date-value` dates when available, even if LibreOffice also renders human text in the same cell.
- If an exact day still cannot be trusted, keep the existing conservative month-only or unresolved-queue behavior.
- Debt timeline actions should never overlap data cells; action buttons can stack vertically on narrower desktop widths and remain full-width in mobile card mode.

## Implementation Scope

- Add full `paymentHistory` derivation to the ledger snapshot and update dashboard filters/counts/rendering to use it.
- Keep debt-settled detection based on the current derived debt state (`outstandingCents <= 0`).
- Harden browser ODS parsing in `src/lib/importWorkbookOds.ts` for date-valued cells and matching ISO date prefixes.
- Mirror the same date parsing behavior in `tooling/import_workbook_preview.py`.
- Update the debt timeline markup with dedicated cell classes for detail, date, period, amount, and actions.
- Refine CSS grid behavior so the timeline keeps stable columns on desktop/tablet and clean stacked cards on mobile.
- Extend unit/integration tests for full-history dashboard filtering and ODS date-value parsing.
- Extend repo-owned UI validation to capture the debt page with a long description in the timeline.

## Validation Plan

- `npm test`
- `npm run build`
- `npm run validate:ui`

## Docs Sync Impact

- No docs edits planned unless the final dashboard wording changes materially.

## Completion Notes

- Implemented full-history dashboard payment filtering, exact-date ODS parsing preference, and debt timeline layout hardening.
- Added regression coverage for dashboard filtering and browser/Python ODS date parsing alignment.
- Validation completed with `npm test`, `npm run build`, and `npm run validate:ui`.
- Move this plan to `docs/assistant/exec_plans/completed/` after implementation and validation complete.
