Title

Clean Up UI Hierarchy With A Global Settings Drawer

Goal

Refocus the daily workflow pages around borrower, debt, payment, import, and backup tasks while moving rare help, protection, persistence, and destructive controls into one global settings drawer that is available from every screen.

Decisions Locked Up Front

- Use a global settings drawer opened from a gear icon in the shell instead of a separate route.
- Keep backup export and backup restore on the import page because they are still part of portability work.
- Move local close help, confidentiality/protection copy, persistent-storage controls, and full local reset into the global drawer.
- Collapse borrower and debt information editors by default when their current records are already populated.
- Replace large visible delete panels with small contextual page menus near the borrower and debt hero headers.
- Rework borrower-page debt card actions so navigation and commands are visually separated from metric tiles.
- Keep repository, persistence, backup, and delete behavior unchanged.

Implementation Scope

- Update `src/App.tsx` to host the gear control, settings drawer, section toggles, and global protection/reset surfaces.
- Update `src/index.css` for drawer, disclosure, overflow menu, and calmer card action layout styling.
- Simplify `src/app/dashboard-page.tsx` so the hero stays task-focused and only surfaces compact actionable backup warnings.
- Simplify `src/app/import-page.tsx` so the main flow focuses on workbook import, queue, backup/export/restore, and import history.
- Update `src/app/borrower-page.tsx` to collapse the info editor by default, add a compact actions menu, and separate debt-card metrics from actions.
- Update `src/app/debt-page.tsx` to mirror the calmer borrower-page patterns for info editing and deletion.
- Update `src/App.test.tsx` to cover the new settings drawer, moved reset/help flows, collapsed editors, and contextual delete menus.

Validation Plan

- Run `npm test`
- Run `npm run lint`
- Run `npm run build`
- Run `npm run validate:ui`

Docs Sync Impact

- Likely yes. The app shell, import page framing, and destructive/help control locations are changing materially, so assistant docs will probably need a sync pass after implementation if the user wants it.

Completion Notes

- Move this plan to `docs/assistant/exec_plans/completed/` after implementation and validation finish.
