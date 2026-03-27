# Windows UI fallback and share message

## Title

Make native Windows UI validation reliable and shorten the friend-ready message

## Goal

Harden `npm run validate:ui` for native Windows when bundled Playwright Chromium fails to launch, and shorten the bilingual friend message in the user guide.

## Decisions Locked Up Front

- Keep the friend message bilingual and compact.
- Prefer automatic Windows browser fallback over new required CLI flags.
- Prefer Edge before Chrome for Windows fallback.
- Prove the fix on a native Windows copy of the current worktree.

## Implementation Scope

- Update `tooling/validate-ui-surface.mjs` with Windows browser fallback and browser reporting in the summary.
- Extend `test/tooling/validate-ui-surface.test.ts` for the new fallback behavior.
- Shorten the shareable message and fix the stale close-help wording in `docs/assistant/features/APP_USER_GUIDE.md`.
- Update `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md` for the Windows fallback note.

## Validation Plan

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run validate:ui`.
- Run `npm run validate:agent-docs`.
- Create a fresh native Windows copy of the current worktree, run `npm run start:windows`, confirm HTTP 200 on `127.0.0.1:4173`, run `npm run validate:ui -- --base-url http://127.0.0.1:4173`, then run `npm run stop:windows`.

## Docs Sync Impact

- The user guide and UI validation workflow change in this pass.
- Ask about Assistant Docs Sync after implementation.

## Completion Notes

- Move this plan to `completed/` after repo validation and Windows-native proof succeed.
