# ExecPlan: Repo-Wide Post-Bootstrap Stabilization

## Goal

Stabilize the repository after bootstrap-harness adoption so the documented validation workflow is accurate, `npm run validate:ui` is self-contained, Python cache artifacts are handled cleanly, and assistant-doc routing reflects the new harness sync path.

## Scope

- Make `tooling/validate-ui-surface.mjs` autonomous by default while preserving explicit external `--base-url` behavior.
- Add targeted tests for UI validation orchestration and bootstrap-specific assistant-doc validation.
- Tighten workspace hygiene around Python cache artifacts.
- Sync assistant docs and workflow routing with the adopted harness model.
- Re-run the requested validation battery and capture any residual issues.

## Files Expected To Change

- `.gitignore`
- `.vscode/settings.json`
- `APP_KNOWLEDGE.md`
- `docs/assistant/APP_KNOWLEDGE.md`
- `docs/assistant/INDEX.md`
- `docs/assistant/workflows/UI_SURFACE_VALIDATION_WORKFLOW.md`
- `tooling/validate-ui-surface.mjs`
- `tooling/validate-workspace-hygiene.mjs`
- `test/tooling/validate-ui-surface.test.ts`
- `test/tooling/validate-agent-docs.test.ts`
- `test/tooling/validate-workspace-hygiene.test.ts`

## Constraints

- Preserve `bootstrap_harness_kit/` and `docs/assistant/templates/` as intentional tracked assets.
- Do not modify vendored template files under `docs/assistant/templates/`.
- Keep repo-owned validation flows and Node-based validator architecture intact.
- Avoid changing app persistence or runtime behavior outside the validation/doc scope.

## Validation Plan

- `python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json`
- `python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run validate:agent-docs`
- `npm run validate:workspace-hygiene`
- `npm run validate:ui`

## Completion Criteria

- `npm run validate:ui` passes from a cold shell without manually starting Vite.
- `tooling/__pycache__/` is removed and remains ignored/covered by hygiene checks.
- Bootstrap-specific validator regressions are covered by targeted tests.
- Assistant-doc routing points bootstrap/profile/state work to the harness sync workflow.

## Outcome

- `tooling/validate-ui-surface.mjs` now builds the app, starts preview, waits for readiness, and tears preview down when no explicit `--base-url` is supplied.
- Targeted tests now cover autonomous UI validation orchestration, bootstrap-specific assistant-doc failures, and Python-cache workspace hygiene expectations.
- `.gitignore`, VS Code exclusions, and workspace-hygiene validation now cover `__pycache__/` and `*.pyc`.
- Assistant docs now route bootstrap/profile/state work through `PROJECT_HARNESS_SYNC_WORKFLOW.md` and describe `validate:ui` as a self-contained command.
- Validation battery completed successfully:
  - `python3 tooling/check_harness_profile.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json`
  - `python3 tooling/preview_harness_sync.py --profile docs/assistant/HARNESS_PROFILE.json --registry docs/assistant/templates/BOOTSTRAP_ARCHETYPE_REGISTRY.json --output-map docs/assistant/HARNESS_OUTPUT_MAP.json --write-state docs/assistant/runtime/BOOTSTRAP_STATE.json`
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run validate:agent-docs`
  - `npm run validate:workspace-hygiene`
  - `npm run validate:ui`
