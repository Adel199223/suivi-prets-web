# Title

Private import anomaly review

## Goal

Review the remaining anomalies from the first private four-debt import and implement only safe parser improvements that reduce false-positive review items without changing the borrower -> debt -> ledger model. If one anomaly still cannot be inferred safely, add a strictly local manual-resolution path so the operator can resolve that row intentionally before any larger migration.

## Decisions Locked Up Front

- Keep the import model, dedupe signatures, and backup contracts unchanged
- Prefer conservative parser fixes over broader inference
- Ignore workbook summary header rows when they do not represent real operations
- Allow period inheritance only for continuation detail rows that clearly belong to the previous dated period block
- If a row still lacks a trustworthy period after parsing, resolve it only through an explicit local resolution file guarded by the workbook fingerprint

## Implementation Scope

- Inspect anomaly rows in the private workbook and classify them by pattern
- Update the local preview generator for safe summary-row suppression and continuation-period inference
- Add optional local resolution support for specific sheet/row pairs with explicit period assignment
- Add targeted sanitized fixture coverage for the new patterns
- Regenerate the private preview, replay the first private import, and compare issue counts before recommending a larger migration

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run import:preview -- --input /mnt/c/Users/FA507/Downloads/suivi_tmp.ods --output output/private/first-private-preview.json`
- `npm run import:preview -- --input /mnt/c/Users/FA507/Downloads/suivi_tmp.ods --output output/private/first-private-preview-resolved.json --resolutions output/private/first-private-resolutions.json`

## Docs Sync Impact

- Update docs only if the anomaly review changes the importer guidance or the next recommended step

## Completion Notes

Completed from the current responsive-polished state in `/home/fa507/dev/suivi-prets-web`.

- The conservative parser cleanup removed the false positives and left one intentionally unresolved row.
- A fingerprint-guarded `workbook-import-resolutions-v1` path was added for explicitly approved sheet/row fixes.
- The first private four-debt workbook was replayed with `output/private/first-private-resolutions.json`.
- The resolved replay produced `64` entries, `0` duplicate entries, and `0` issues.
- The resulting private artifacts are `output/private/first-private-preview-resolved.json`, `output/private/first-private-import-summary-resolved.json`, and `output/private/first-private-backup-resolved.json`.
