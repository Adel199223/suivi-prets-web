# Windows-native onboarding hardening

## Title

Harden Windows-native onboarding from GitHub clone

## Goal

Make the public repo easy to clone and run on Windows 10/11 without Ubuntu or WSL by improving the Windows launcher, the README quickstart, and the end-user guide.

## Decisions Locked Up Front

- `npm run start:windows` stays the main beginner command.
- The recommended onboarding path is a Git clone into a normal Windows folder.
- Ubuntu/WSL is explicitly not required for Windows-native use.
- Python remains optional and is not required for normal app usage.
- No app-domain, storage, backup, or import contracts change in this pass.

## Implementation Scope

- Update `scripts/start-windows.ps1` to reject UNC/WSL paths, remove unnecessary Git runtime dependence, validate/install Windows-native dependencies, wait for readiness, then open the browser.
- Update `README.md` so the Windows GitHub-clone flow is the first, exact, copy-paste path.
- Update `docs/assistant/features/APP_USER_GUIDE.md` with a short beginner-safe Windows install snippet that matches the repo contract.

## Validation Plan

- Run the launcher from the current UNC/WSL path and confirm it fails with the new beginner-safe message.
- Re-run `npm test`.
- Re-run `npm run lint`.
- Re-run `npm run build`.
- Re-run `npm run validate:ui`.

## Docs Sync Impact

- README and the user guide change directly in this pass.
- After implementation, ask whether Assistant Docs Sync should run for the new Windows onboarding behavior.

## Completion Notes

- Move this plan to `completed/` after validation succeeds.
