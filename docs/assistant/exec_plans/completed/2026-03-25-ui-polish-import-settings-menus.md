# Final UI polish pass for import help, settings clarity, dismissible menus, and dashboard filter spacing

## Goal

Finish the current UI cleanup by removing the last pieces of visible friction: hide import guidance behind a subtle info control, make borrower/debt overflow menus dismiss naturally, make the settings drawer feel like an actual settings surface, and separate the dashboard filter groups so each card reads independently.

## Decisions Locked Up Front

- Keep the current product structure and local-first behavior unchanged.
- Keep settings as a global drawer, not a new route.
- Keep delete actions inside the overflow menu; only improve menu behavior and positioning.
- Keep import guidance in the app, but hide it by default behind an info trigger.
- Treat the dashboard filter problem as a layout ownership and spacing issue inside each card.

## Implementation Scope

- Update `src/app/import-page.tsx` to replace the always-visible import explanation with a compact help popover.
- Update `src/components/PageActionsMenu.tsx` so menus close on outside click, `Escape`, action click, and route change.
- Redesign `src/components/SettingsDrawer.tsx` and related styles in `src/index.css` so the drawer reads as true settings with grouped sections and clearer hierarchy.
- Rework the dashboard card headers and filter containers in `src/app/dashboard-page.tsx` so each card owns its own controls visually.
- Update UI tests in `src/App.test.tsx` and any locator expectations in `tooling/validate-ui-surface.mjs`.

## Validation Plan

- Run `npm test`
- Run `npm run lint`
- Run `npm run build`
- Run `npm run validate:ui`

## Docs Sync Impact

- No harness/template sync expected from this pass.
- Assistant Docs Sync may need to mention the new import help trigger and the refined settings surface if the user wants docs refreshed afterward.

## Completion Notes

- Move this plan to `docs/assistant/exec_plans/completed/` after implementation and validation finish.
