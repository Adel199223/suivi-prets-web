# Add a beginner-safe Windows update path for existing installs

## Summary

Ship a repo-owned Windows update helper so existing Git-based Windows installs can pull the latest code, refresh dependencies if needed, restart on 127.0.0.1:4173, and reopen safely without reinstalling or losing browser-local data.

## Implementation

- Add a shared Windows helper module for path checks, dependency health, port handling, readiness wait, and app startup.
- Add update-windows.ps1 with safe Git checks, fast-forward-only pull, clean-worktree refusal, and automatic restart.
- Expose update:windows in package.json and document the existing-install update path in README and APP_USER_GUIDE.

## Validation

- npm test
- npm run lint
- npm run build
- npm run validate:agent-docs
- npm run validate:ui
- Native Windows smoke on a clean Git clone using npm run update:windows
