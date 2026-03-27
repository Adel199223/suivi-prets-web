# ExecPlan — polish settings, dark mode contrast, and French accents

## Objective

Tighten the user-facing UI quality without changing storage or business behavior:

1. Make the settings drawer feel like a cleaner, more realistic settings surface.
2. Improve dark-mode contrast between parent sections and nested cards/tiles.
3. Correct visible French copy with proper accents, including the visible brand name `Suivi Prêts`.

## Scope

- `src/components/SettingsDrawer.tsx`
- `src/index.css`
- `src/App.tsx`
- `src/app/dashboard-page.tsx`
- `src/app/borrower-page.tsx`
- `src/app/debt-page.tsx`
- `src/app/import-page.tsx`
- `src/App.test.tsx`
- `tooling/validate-ui-surface.mjs`

## Implementation plan

1. Rework settings drawer copy and structure:
   - accordion behavior for secondary sections
   - cleaner section summaries and labels
   - nested Windows command disclosure remains hidden by default
2. Refine light/dark theme tokens and surface layering in CSS:
   - stronger separation for parent panels vs nested panels vs metric tiles
   - cleaner theme toggle styling
3. Apply accented French copy to touched UI surfaces and validation messages.
4. Update tests and UI validation locators for the new visible labels.
5. Run validation:
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - `npm run validate:ui`
6. Move this plan to `completed/` when done.

## Guardrails

- No Dexie schema change
- No import/backup contract change
- No route-path changes
- No change to theme storage key
