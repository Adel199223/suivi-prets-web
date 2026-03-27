# Title

Publish debt-history hybrid rail fix with assistant docs sync and friend-ready cleanup

## Goal

Publish the already-implemented debt-history layout fix cleanly by committing the UI/validation changes, syncing only the relevant assistant docs, validating the branch, merging it into `main`, and leaving both local and remote Git state ready for a Windows friend update flow.

## Decisions Locked Up Front

- Keep the current UI implementation unchanged unless a final validation fails.
- Commit code/UI changes separately from the assistant docs sync.
- Keep the docs sync narrow and limited to the debt-history presentation and validation changes.
- Use WSL-wrapped validation commands from this environment.
- Publish through a pushed `codex/` branch, then fast-forward merge into `main`, then prune the branch locally and remotely.

## Implementation Scope

- Commit the current debt-history UI and validation files plus the completed feature ExecPlan.
- Update only the touched assistant docs for the hybrid debt-history rail and the strengthened `validate:ui` guardrail.
- Commit the docs sync separately along with this publish ExecPlan.
- Run the final validation battery.
- Push the feature branch, fast-forward merge into `main`, push `main`, and prune the feature branch.

## Validation Plan

- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm test"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run build"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:ui"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:agent-docs"`
- `wsl.exe bash -lc "cd /home/fa507/dev/suivi-prets-web && npm run validate:workspace-hygiene"`

## Docs Sync Impact

- This pass intentionally performs the pending narrow Assistant Docs Sync for the new debt-history layout and validation behavior.

## Completion Notes

- Committed the debt-history UI and validation pass separately before docs sync.
- Synced only the touched assistant docs for the debt-history `Infos` rail and the strengthened `validate:ui` non-overlap guardrail.
- Final validation passed with the WSL-wrapped `npm test`, `npm run build`, `npm run validate:ui`, `npm run validate:agent-docs`, and `npm run validate:workspace-hygiene` commands.
- Move this plan to `docs/assistant/exec_plans/completed/` after commit, docs sync, validation, push, merge, and branch cleanup are complete.
