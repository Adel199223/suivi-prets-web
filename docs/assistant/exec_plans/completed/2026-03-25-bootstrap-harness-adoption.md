# Title

Adopt the bootstrap harness kit into the existing repo harness

## Goal

Seed the reusable bootstrap harness source, add a profile-driven local harness contract, preserve the repo's established assistant-doc architecture, and validate that the repo can preview and maintain its local harness through the seeded bootstrap tooling.

## Decisions Locked Up Front

- Treat this repo as an existing-repo adoption, not a blank bootstrap.
- Use `web_app` with `standard` mode.
- Keep beginner support enabled.
- Preserve `APP_KNOWLEDGE.md`, `agent.md`, `AGENTS.md`, and `docs/assistant/INDEX.md` as established repo-local entrypoints.
- Map generic `docs/assistant/START_HERE.md` to the existing `docs/assistant/INDEX.md`.
- Keep the existing Node-based docs validator instead of introducing the generic Dart validator from the bootstrap templates.
- Keep roadmap governance inactive for this pass and place `SESSION_RESUME.md` under `docs/assistant/workflows/`.

## Implementation Scope

- Seed the reusable bootstrap source from `bootstrap_harness_kit/`.
- Add `HARNESS_PROFILE.json`, `HARNESS_OUTPUT_MAP.json`, and runtime bootstrap state.
- Add repo-local bootstrap docs required by the resolved module set.
- Add a project-harness-sync workflow and beginner-safe PowerShell starter scripts.
- Update `README.md`, `agent.md`, `AGENTS.md`, `docs/assistant/manifest.json`, and repo-local workflow docs so the seeded bootstrap model is discoverable.
- Extend `tooling/validate-agent-docs.mjs` to validate the new bootstrap surfaces without weakening the current repo-specific rules.

## Validation Plan

- `python3 bootstrap_harness_kit/tooling/seed_bootstrap_harness.py --repo-root .`
- `python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json`
- `python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json`
- `npm run validate:agent-docs`
- `npm run validate:workspace-hygiene`

## Docs Sync Impact

This change updates the harness and its repo-local documentation directly. Additional Assistant Docs Sync should only run later if follow-up feature work changes user-facing or workflow-facing behavior again.

## Completion Notes

Completed on 2026-03-25 after seeding the bootstrap source, adding the profile-driven local harness files, writing runtime bootstrap state, and passing `python3 tooling/check_harness_profile.py`, `python3 tooling/preview_harness_sync.py`, `npm run validate:agent-docs`, and `npm run validate:workspace-hygiene`.
