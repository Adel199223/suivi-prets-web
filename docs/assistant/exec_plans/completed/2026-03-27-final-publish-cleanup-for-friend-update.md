## Summary

Publish the latest dashboard/delete improvements cleanly so the GitHub `main` branch is the friend-ready Windows update target. This pass should sync only the touched assistant docs, re-run the final validation battery, then commit, push, merge, and leave local `main` clean.

## Decisions Locked Up Front

- Keep docs sync narrow: update only assistant knowledge and the user guide for the new dashboard/delete behavior.
- Publish from an isolated `codex/` branch first, then merge back into `main`.
- Run the final validation battery before any push.

## Implementation Scope

- Add the final release ExecPlan and move it to `completed/` when done.
- Update `APP_KNOWLEDGE.md` for the new dashboard defaults and contextual delete surfacing.
- Update `docs/assistant/features/APP_USER_GUIDE.md` for the same end-user behavior.
- Commit the current code and ExecPlans, push the branch, merge back into `main`, push `main`, and prune the temporary branch.

## Validation Plan

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:ui`
- `npm run validate:agent-docs`
- `npm run validate:workspace-hygiene`

## Docs Sync Impact

- This pass intentionally performs the Assistant Docs Sync that was still pending for the latest dashboard/delete UX changes.

## Completion Notes

- Assistant docs were synced narrowly in `APP_KNOWLEDGE.md` and `docs/assistant/features/APP_USER_GUIDE.md` for the new dashboard defaults and contextual delete affordances.
- Final validation passed: `npm test`, `npm run lint`, `npm run build`, `npm run validate:ui`, `npm run validate:agent-docs`, and `npm run validate:workspace-hygiene`.
- This plan is ready to move to `completed/` as part of the publish commit, after the branch is pushed, merged back into `main`, and pruned.
