# Final UX trim pass before sharing the app

## Summary

Remove the last pieces of obvious instructional filler before sharing the app with a non-technical Windows user. Keep text only when it changes a decision, prevents a mistake, or explains a non-obvious local/runtime behavior.

## Implementation

- Trim the settings drawer so `Apparence` keeps only the theme control and the header loses descriptive filler.
- Keep settings sections concise by shortening or removing helper copy that only restates the obvious.
- Remove or shorten redundant helper text on dashboard, borrower, debt, and import surfaces.
- Preserve destructive warnings, pending-import guidance, and local-vs-hosted shutdown behavior.

## Validation

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`
- `npm run validate:agent-docs`
- Fresh native Windows local-worktree smoke:
  - `npm run start:windows`
  - `npm run validate:ui -- --base-url http://127.0.0.1:4173`
  - `npm run stop:windows`
