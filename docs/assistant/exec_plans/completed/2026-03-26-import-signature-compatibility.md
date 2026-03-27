# Title

Fix import-signature compatibility for resolved rows

## Goal

Preserve the new accented resolved-row copy while restoring stable import deduplication for both freshly resolved rows and previously stored legacy signatures, without a Dexie migration or any public contract change.

## Decisions Locked Up Front

- Keep the accented visible copy for resolved rows.
- Fix compatibility in helpers/signature generation, not via schema migration.
- Add one shared internal helper for resolved-import description building and signature canonicalization.
- Canonicalize only the app-generated resolved-note text during signature generation; do not broadly fold accents for arbitrary user descriptions.
- Prevent new duplicates only; do not attempt cleanup of any duplicates already stored in user browsers.

## Implementation Scope

- Add `src/lib/resolvedImportDescription.ts` for shared visible formatting and signature canonicalization.
- Replace inline resolved-description formatting in `src/lib/importWorkbookOds.ts` and `src/lib/repository.ts` with the shared helper.
- Update `src/lib/importSignature.ts` so `createImportEntrySignature()` uses the targeted canonicalization path before hashing.
- Add focused unit coverage for the helper/signature behavior.
- Extend repository integration tests for:
  - blank-description resolve + reimport dedupe in the current code path
  - legacy stored signature compatibility on reimport after resolution replay

## Validation Plan

- `npm test`
- `npm run build`

## Docs Sync Impact

- No product-doc update is expected from this change alone because behavior is preserved for users; only internal compatibility and dedupe safety change.

## Completion Notes

- Added `src/lib/resolvedImportDescription.ts` to centralize resolved-row visible copy and targeted signature canonicalization.
- Switched both parser and repository resolve paths to the shared visible description builder.
- Updated `createImportEntrySignature()` to canonicalize only the app-generated resolved-note text to the legacy ASCII signature form.
- Added focused helper/signature tests and repository integration tests for blank-description reimport dedupe and legacy stored signature compatibility.
- Validation passed with `npm test` and `npm run build`.
