# Diagnostics

Use this file when the harness or its validation commands look wrong.

## Bootstrap-specific checks

- If `HARNESS_PROFILE.json` fails validation, fix the profile before changing local harness docs.
- If `preview_harness_sync.py` reports missing sync targets, create or update those repo-local files before continuing.
- If a generic bootstrap output clashes with an established local file, add or update `HARNESS_OUTPUT_MAP.json` instead of renaming the local file.

## Repo diagnostics

- If `npm run validate:agent-docs` fails, check `agent.md`, `AGENTS.md`, `docs/assistant/manifest.json`, and the workflow docs first.
- If `npm run validate:workspace-hygiene` fails, check `.vscode/settings.json`, `dist/`, `output/`, and watcher excludes.
- If WSL-wrapped commands fail, confirm the repo path is still `/home/fa507/dev/suivi-prets-web`.

## Data and browser reminders

- App data lives in the browser, not in the repo.
- Exported backups are local files and can be restored later, but restoring replaces the current local browser dataset.
