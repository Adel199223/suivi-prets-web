# Windows share message and native proof

## Title

Package a friend-ready Windows message and prove native startup for public and local repo states

## Goal

Provide a short bilingual message the user can forward to a friend, then verify native Windows startup outside WSL for both the current public GitHub repo and the local working tree with uncommitted changes.

## Decisions Locked Up Front

- Keep the message bilingual and very short.
- Verify the public GitHub repo and the local working tree separately.
- Leave temporary Windows proof folders in place by default.
- Reuse the repo-owned Windows launcher and UI validator where possible.

## Implementation Scope

- Add a canonical bilingual shareable snippet to `docs/assistant/features/APP_USER_GUIDE.md`.
- Create one temporary native Windows clone from GitHub and one temporary native Windows copy of the current working tree.
- Run `npm run start:windows`, `npm run validate:ui -- --base-url http://127.0.0.1:4173`, and `npm run stop:windows` in each proof folder.
- If a smoke fails, fix only the minimal onboarding/runtime issue in the main repo and rerun the affected proof.

## Validation Plan

- Validate the updated guide with `npm run validate:agent-docs`.
- Re-run `npm test`, `npm run lint`, `npm run build`, and `npm run validate:ui` in the main repo if onboarding fixes are needed.
- Record separate pass/fail conclusions for the public repo and the local working tree.

## Docs Sync Impact

- `APP_USER_GUIDE.md` changes directly in this pass.
- Ask about Assistant Docs Sync after implementation if repo-tracked docs or behavior changed.

## Completion Notes

- Move this plan to `completed/` when the message and both proof runs are done.
