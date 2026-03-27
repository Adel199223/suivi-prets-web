# Clean settings further and add a persistent dark mode

## Goal

Make the settings drawer quieter and more purposeful, while adding a proper dark mode that feels native to Suivi Prets and stays local to the current browser.

## Decisions Locked Up Front

- Theme preference stays in browser-local UI storage, not in Dexie `meta`.
- The dark mode is manual only in this pass: `Clair` or `Sombre`.
- The current product structure and local-first data model remain unchanged.
- The close-help command snippets move behind a nested disclosure so they stop dominating the settings panel.

## Implementation Scope

- Extend the app shell and settings drawer to manage a persistent light/dark theme preference.
- Rework the settings hierarchy so `Apparence` becomes a first-class group and the Windows stop commands are collapsed under `Comment fermer l'app`.
- Convert the main CSS surfaces to theme variables so dashboard, borrower, debt, import, drawers, popovers, menus, buttons, forms, and notices all render coherently in both themes.
- Update the UI tests and the repo-owned browser validation harness so theme toggling and the cleaner settings behavior are covered.

## Validation Plan

- Run `npm test`
- Run `npm run lint`
- Run `npm run build`
- Run `npm run validate:ui`

## Docs Sync Impact

- No template or harness sync is expected from this pass.
- Assistant Docs Sync may need to mention dark mode and the cleaner settings structure if the user wants docs refreshed afterward.

## Completion Notes

- Move this plan to `docs/assistant/exec_plans/completed/` after implementation and validation finish.
