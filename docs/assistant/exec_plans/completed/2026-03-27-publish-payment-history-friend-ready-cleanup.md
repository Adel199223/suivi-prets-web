# Title

Publish payment-history fixes with assistant docs sync and friend-ready cleanup

## Goal

Publish the already-committed payment-history and import fixes safely by re-reviewing the committed delta, syncing only the relevant assistant docs, validating the branch, merging it cleanly into `main`, and leaving both local and remote Git state ready for a Windows friend update flow.

## Decisions Locked Up Front

- Keep the existing code commit `dadd96a` unchanged unless the final review finds a real bug.
- Run a narrow Assistant Docs Sync only for the recently changed dashboard/import behaviors.
- Use WSL-native git and WSL-wrapped validation commands from this environment.
- Publish to `origin/main` through a fast-forward branch push plus fast-forward merge sequence.
- Leave the repo resting on a clean local `main` branch after pruning the temporary feature branch.

## Implementation Scope

- Refresh remote state and review `origin/main..HEAD`.
- Update only the touched assistant docs: `APP_KNOWLEDGE.md`, `docs/assistant/APP_KNOWLEDGE.md`, and `docs/assistant/features/APP_USER_GUIDE.md`.
- Commit the docs sync separately from the already-landed code commit.
- Run the final validation battery after docs sync.
- Push the feature branch, fast-forward merge into `main`, push `main`, and prune the feature branch locally and remotely.

## Validation Plan

- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run lint"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"`

## Docs Sync Impact

- This pass intentionally performs the pending narrow Assistant Docs Sync for the recent dashboard and import behavior changes.

## Completion Notes

- Re-reviewed the committed delta against `origin/main..HEAD` before publish and kept `dadd96a` unchanged.
- Synced only `APP_KNOWLEDGE.md`, `docs/assistant/APP_KNOWLEDGE.md`, and `docs/assistant/features/APP_USER_GUIDE.md`.
- Final validation passed with the WSL-wrapped `npm test`, `npm run lint`, `npm run build`, `npm run validate:ui`, `npm run validate:agent-docs`, and `npm run validate:workspace-hygiene` commands.
- Move this plan to `docs/assistant/exec_plans/completed/` after the docs sync, validations, push, merge, and branch cleanup are complete.
