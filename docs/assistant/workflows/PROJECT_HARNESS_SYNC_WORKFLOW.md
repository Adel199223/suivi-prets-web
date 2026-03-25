# Project Harness Sync Workflow

## What This Workflow Is For

Use this workflow for profile-driven bootstrap adoption and for syncing the repo-local harness from vendored template files.

## Expected Outputs

- Validated bootstrap profile
- Written runtime bootstrap state
- Repo-local harness docs updated without editing `docs/assistant/templates/*`
- Preserved local output mappings where generic bootstrap outputs differ from existing repo docs

## When To Use

- The user says `implement the template files`
- The user says `sync project harness`
- The user says `audit project harness`
- The user says `check project harness`
- The repo is adopting `bootstrap_harness_kit/`

## What Not To Do

Don't use this workflow when the task is ordinary product work or routine docs drift. Instead use `DOCS_MAINTENANCE_WORKFLOW.md` or the relevant feature workflow.

## Primary Files

- `docs/assistant/HARNESS_PROFILE.json`
- `docs/assistant/HARNESS_OUTPUT_MAP.json`
- `docs/assistant/manifest.json`

## Minimal Commands

```powershell
python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json
python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json
npm run validate:agent-docs
```

## Targeted Tests

- `python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json`
- `python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json`
- `npm run validate:agent-docs`

## Failure Modes and Fallback Steps

- If preview reports missing sync targets, create or update the missing repo-local harness files before continuing.
- If a generic bootstrap output conflicts with an established local file, add or update `docs/assistant/HARNESS_OUTPUT_MAP.json` instead of renaming the local file.
- If the task targets `docs/assistant/templates/*` itself, stop and treat it as bootstrap maintenance rather than local harness sync.
- If validator drift is repo-local, extend `tooling/validate-agent-docs.mjs` instead of adopting the generic Dart validator from the template docs.

## Handoff Checklist

- Confirm archetype and mode
- Confirm output mapping
- Confirm runtime bootstrap state is written
- Confirm preview has no missing sync targets
- Confirm repo validators pass
