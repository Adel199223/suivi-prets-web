# Title

Clarify local autosave and remove misleading save-status controls

## Goal

Make the app honest for beginners by removing the fake-looking `Enregistre sur cet appareil` status controls, replacing them with plain autosave guidance, and proving through UI coverage that manual borrower and debt creation persist automatically after remount.

## Decisions Locked Up Front

- Keep Dexie/IndexedDB autosave behavior unchanged.
- Treat the issue as a UX/copy problem, not a repository persistence bug.
- Keep `Renforcer la protection locale` as an advanced browser-protection action, not a manual save action.
- Hide the persistence-reinforcement button once persistent storage is already confirmed.

## Implementation Scope

- Update dashboard and import protection surfaces to remove the chip-style save-status control in healthy states.
- Add explicit autosave copy that covers manual additions, edits, and imports.
- Keep stale-backup warning behavior intact.
- Update UI tests to cover the new copy, conditional persistence action visibility, and remount persistence for manual borrower/debt creation.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`

## Docs Sync Impact

- If implementation lands cleanly, assistant docs should be offered a sync because beginner-facing local-save behavior and protection guidance changed.

## Completion Notes

- Removed the misleading healthy-state save chips from dashboard and import surfaces.
- Added explicit autosave guidance that covers manual adds, edits, and imports.
- Kept persistent-storage reinforcement as an advanced optional action and hid it once already confirmed.
- Validation passed with `npm test`, `npm run lint`, `npm run build`, and `npm run validate:ui`.
